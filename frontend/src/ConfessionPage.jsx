import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ConfessionPage.css';
import axios from 'axios';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';

function ConfessionPage() {
    const [confession, setConfession] = useState('');
    const [messages, setMessages] = useState([]);
    const [disableSend, setDisableSend] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const repeatCountRef = useRef(0);
    const lastMessageRef = useRef('');

    const API_URL = process.env.REACT_APP_API_URL || 'https://hello-anonymous.onrender.com';

    const generateClientId = () => 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const fetchMessages = useCallback(async () => {
        try {
            // Load from local storage first
            const localMessages = JSON.parse(localStorage.getItem('messages')) || [];
            setMessages(localMessages);
            scrollToBottom();

            // Fetch from backend
            const response = await axios.get(`${API_URL}/api/messages`);
            const serverMessages = response.data;

            // Merge local and server messages
            const mergedMessages = [
                ...localMessages.filter(m => !m.synced),
                ...serverMessages.filter(sm => !localMessages.some(lm => lm.clientId === sm.clientId))
            ];
            localStorage.setItem('messages', JSON.stringify(mergedMessages));
            setMessages(mergedMessages);
            scrollToBottom();
            setError(null);
        } catch (error) {
            console.error('Error fetching messages:', error);
            setError('Failed to fetch messages. Please try again.');
        }
    }, [API_URL]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    const syncMessageWithRetry = useCallback(async (text, type, clientId, updatedMessages) => {
        for (let attempts = 0; attempts < 3; attempts++) {
            try {
                const response = await axios.post(`${API_URL}/api/messages`, { text, type, clientId });
                const serverMessage = response.data;
                const syncedMessages = updatedMessages.map(m =>
                    m.clientId === clientId ? { ...serverMessage, synced: true } : m
                );
                localStorage.setItem('messages', JSON.stringify(syncedMessages));
                setMessages(syncedMessages);
                setError(null);
                await fetchMessages(); // Fetch latest messages
                return true;
            } catch (error) {
                if (attempts === 2) {
                    console.error('Max retries reached:', error);
                    setError('Failed to send confession. It’s saved locally and will sync when online.');
                    return false;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempts + 1)));
            }
        }
        return false;
    }, [API_URL, fetchMessages]);

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

        const newMessage = {
            text: confession,
            type: 'confession',
            timestamp: new Date(),
            clientId: generateClientId(),
            synced: false
        };

        // Save to local storage and update UI
        const updatedMessages = [...messages, newMessage];
        localStorage.setItem('messages', JSON.stringify(updatedMessages));
        setMessages(updatedMessages);
        setConfession('');
        scrollToBottom();

        // Sync with backend
        syncMessageWithRetry(confession, 'confession', newMessage.clientId, updatedMessages);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSendConfession();
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

    const groupedMessages = groupMessagesByDate(messages);

    return (
        <div className="confession-container">
            <div className="confession-header">Confession Room</div>
            {error && <div className="error-message">{error}</div>}
            <div className="confession-messages">
                {Object.entries(groupedMessages).map(([date, msgs], i) => (
                    <div key={i}>
                        <div className="date-label">{renderDateLabel(date)}</div>
                        {msgs.map((msg) => (
                            <div key={msg.clientId || msg._id} className="confession-message">
                                <div>
                                    {msg.type === 'chat' && <span className="chat-tag">[Chat] </span>}
                                    {msg.text}
                                </div>
                                <div className="message-time">
                                    {format(new Date(msg.timestamp), 'h:mm a')}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
                <div ref={messagesEndRef}></div>
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