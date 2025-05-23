import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ChatPage.css';
import axios from 'axios';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';

function ChatPage() {
    const [message, setMessage] = useState('');
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
            const localMessages = JSON.parse(localStorage.getItem('chatMessages')) || [];
            setMessages(localMessages);
            scrollToBottom();

            // Fetch from backend
            const response = await axios.get(`${API_URL}/api/chat/messages`);
            const serverMessages = response.data;

            // Merge local and server messages
            const mergedMessages = [
                ...localMessages.filter(m => !m.synced),
                ...serverMessages.filter(sm => !localMessages.some(lm => lm.clientId === sm.clientId))
            ];
            localStorage.setItem('chatMessages', JSON.stringify(mergedMessages));
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

    const handleSendMessage = async () => {
        if (message.trim() === '' || message.length > 250 || disableSend) return;

        if (message === lastMessageRef.current) {
            repeatCountRef.current += 1;
        } else {
            repeatCountRef.current = 1;
            lastMessageRef.current = message;
        }

        if (repeatCountRef.current >= 6) {
            setDisableSend(true);
            setTimeout(() => setDisableSend(false), 20000);
            return;
        }

        const newMessage = {
            text: message,
            timestamp: new Date(),
            clientId: generateClientId(),
            synced: false
        };

        // Save to local storage and update UI
        const updatedMessages = [...messages, newMessage];
        localStorage.setItem('chatMessages', JSON.stringify(updatedMessages));
        setMessages(updatedMessages);
        setMessage('');
        scrollToBottom();

        // Sync with backend with retry
        let attempts = 0;
        while (attempts < 3) {
            try {
                const response = await axios.post(`${API_URL}/api/chat/messages`, {
                    text: message,
                    clientId: newMessage.clientId
                });
                const serverMessage = response.data;
                const syncedMessages = updatedMessages.map(m =>
                    m.clientId === newMessage.clientId ? { ...serverMessage, synced: true } : m
                );
                localStorage.setItem('chatMessages', JSON.stringify(syncedMessages));
                setMessages(syncedMessages);
                setError(null);
                // Fetch latest messages for other users
                fetchMessages();
                break;
            } catch (error) {
                attempts++;
                if (attempts === 3) {
                    console.error('Max retries reached:', error);
                    setError('Failed to send message. It’s saved locally and will sync when online.');
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSendMessage();
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
        <div className="chat-container">
            <div className="chat-header">Chat Room</div>
            {error && <div className="error-message">{error}</div>}
            <div className="chat-messages">
                {Object.entries(groupedMessages).map(([date, msgs], i) => (
                    <div key={i}>
                        <div className="date-label">{renderDateLabel(date)}</div>
                        {msgs.map((msg) => (
                            <div key={msg.clientId || msg._id} className="chat-message">
                                <div>{msg.text}</div>
                                <div className="message-time">
                                    {format(new Date(msg.timestamp), 'h:mm a')}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
                <div ref={messagesEndRef}></div>
            </div>
            <div className="chat-input-container">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    maxLength={250}
                />
                <button onClick={handleSendMessage} disabled={disableSend}>
                    {disableSend ? 'Wait...' : 'Send'}
                </button>
            </div>
            <div className="footer">100% Anonymous - Even the developer can't trace you</div>
        </div>
    );
}

export default ChatPage;