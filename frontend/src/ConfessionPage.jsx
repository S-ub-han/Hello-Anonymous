import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ConfessionPage.css';
import axios from 'axios';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';

function ConfessionPage() {
    const [confession, setConfession] = useState('');
    const [confessions, setConfessions] = useState([]);
    const [disableSend, setDisableSend] = useState(false);
    const [error, setError] = useState(null);
    const confessionsEndRef = useRef(null);
    const repeatCountRef = useRef(0);
    const lastMessageRef = useRef('');

    const API_URL = process.env.REACT_APP_API_URL || 'https://hello-anonymous.onrender.com';

    const generateClientId = () => 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const fetchConfessions = useCallback(async () => {
        try {
            // Load from local storage first
            const localConfessions = JSON.parse(localStorage.getItem('confessions')) || [];
            setConfessions(localConfessions);
            scrollToBottom();

            // Fetch from backend
            const response = await axios.get(`${API_URL}/api/confession/messages`);
            const serverConfessions = response.data;

            // Merge local and server confessions
            const mergedConfessions = [
                ...localConfessions.filter(c => !c.synced),
                ...serverConfessions.filter(sc => !localConfessions.some(lc => lc.clientId === sc.clientId))
            ];
            localStorage.setItem('confessions', JSON.stringify(mergedConfessions));
            setConfessions(mergedConfessions);
            scrollToBottom();
            setError(null);
        } catch (error) {
            console.error('Error fetching confessions:', error);
            setError('Failed to fetch confessions. Please try again.');
        }
    }, [API_URL]);

    useEffect(() => {
        fetchConfessions();
    }, [fetchConfessions]);

    const handleSendConfession = async () => {
        if (confession.trim() === '' || disableSend) return;

        if (confession === lastMessageRef.current) {
            repeatCountRef.current += 1;
        } else {
            repeatCountRef.current = 1;
            lastMessageRef.current = confession;
        }

        if (repeatCountRef.current >= 5) {
            setDisableSend(true);
            setTimeout(() => setDisableSend(false), 20000);
            return;
        }

        const newConfession = {
            text: confession,
            timestamp: new Date(),
            clientId: generateClientId(),
            synced: false
        };

        // Save to local storage and update UI
        const updatedConfessions = [...confessions, newConfession];
        localStorage.setItem('confessions', JSON.stringify(updatedConfessions));
        setConfessions(updatedConfessions);
        setConfession('');
        scrollToBottom();

        // Sync with backend with retry
        let attempts = 0;
        while (attempts < 3) {
            try {
                const response = await axios.post(`${API_URL}/api/confession/messages`, {
                    text: confession,
                    clientId: newConfession.clientId
                });
                const serverConfession = response.data;
                const syncedConfessions = updatedConfessions.map(c =>
                    c.clientId === newConfession.clientId ? { ...serverConfession, synced: true } : c
                );
                localStorage.setItem('confessions', JSON.stringify(syncedConfessions));
                setConfessions(syncedConfessions);
                setError(null);
                // Fetch latest confessions for other users
                fetchConfessions();
                break;
            } catch (error) {
                attempts++;
                if (attempts === 3) {
                    console.error('Max retries reached:', error);
                    setError('Failed to send confession. It’s saved locally and will sync when online.');
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSendConfession();
    };

    const scrollToBottom = () => {
        confessionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const groupMessagesByDate = (messages) => {
        const groups = {};
        messages.forEach((msg) => {
            const date = new Date(msg.timestamp);
            const key = date.toDateString();
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(msg);
        });
        return groups;
    };

    const renderDateLabel = (dateStr) => {
        const date = new Date(dateStr);
        if (isToday(date)) return 'Today';
        if (isYesterday(date)) return 'Yesterday';
        if (isThisWeek(date)) return format(date, 'EEEE');
        return format(date, 'MMMM d, yyyy');
    };

    const groupedConfessions = groupMessagesByDate(confessions);

    return (
        <div className="confession-container">
            <div className="confession-header">Confession Room</div>
            {error && <div className="error-message">{error}</div>}
            <div className="confession-messages">
                {Object.entries(groupedConfessions).map(([date, msgs], i) => (
                    <div key={i}>
                        <div className="date-label">{renderDateLabel(date)}</div>
                        {msgs.map((msg) => (
                            <div key={msg.clientId || msg._id} className="confession-message">
                                <div>{msg.text}</div>
                                <div className="message-time">
                                    {format(new Date(msg.timestamp), 'h:mm a')}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
                <div ref={confessionsEndRef}></div>
            </div>
            <div className="confession-input-container">
                <input
                    type="text"
                    value={confession}
                    onChange={(e) => setConfession(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your confession..."
                    maxLength={250}
                />
                <button onClick={handleSendConfession} disabled={disableSend}>
                    {disableSend ? 'Wait...' : 'Send'}
                </button>
            </div>
            <div className="footer">100% Anonymous - Even the developer can't trace you</div>
        </div>
    );
}

export default ConfessionPage;