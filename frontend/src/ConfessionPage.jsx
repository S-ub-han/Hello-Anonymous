// src/ConfessionPage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ConfessionPage.css';
import axios from 'axios';
import socket from './socket';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';

function ConfessionPage() {
    const [confession, setConfession] = useState('');
    const [confessions, setConfessions] = useState([]);
    const [disableSend, setDisableSend] = useState(false);
    const confessionsEndRef = useRef(null);
    const repeatCountRef = useRef(0);
    const lastMessageRef = useRef('');

    const fetchConfessions = useCallback(async () => {
        try {
            const res = await axios.get('https://hello-anonymous.onrender.com/api/confession/messages');
            setConfessions(res.data);
        } catch (err) {
            console.error('Error fetching confessions:', err);
        }
    }, []);

    useEffect(() => {
        fetchConfessions();

        socket.on('confessionMessage', (msg) => {
            setConfessions(prev => [...prev, msg]);
            scrollToBottom();
        });

        return () => {
            socket.off('confessionMessage');
        };
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

        try {
            const res = await axios.post('https://hello-anonymous.onrender.com/api/confession/messages', { text: confession });
            socket.emit('confessionMessage', res.data);
            setConfession('');
            scrollToBottom();
        } catch (err) {
            console.error('Error sending confession:', err);
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
            if (!groups[key]) groups[key] = [];
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
            <div className="confession-messages">
                {Object.entries(groupedConfessions).map(([date, msgs], i) => (
                    <div key={i}>
                        <div className="date-label">{renderDateLabel(date)}</div>
                        {msgs.map((msg, index) => (
                            <div key={index} className="confession-message">
                                <div>{msg.text}</div>
                                <div className="message-time">{format(new Date(msg.timestamp), 'h:mm a')}</div>
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
