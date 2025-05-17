// ConfessionPage.jsx (Frontend)
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './ConfessionPage.css';

const ConfessionPage = () => {
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [userId, setUserId] = useState(localStorage.getItem('userId') || '');
    const socket = io('http://localhost:5000');

    useEffect(() => {
        // Generate unique user ID if not already set
        if (!userId) {
            const newUserId = 'user_' + Date.now();
            setUserId(newUserId);
            localStorage.setItem('userId', newUserId);
        }

        // Load previous messages
        socket.on('previousMessages', (loadedMessages) => {
            setMessages(loadedMessages);
        });

        // Receive new messages
        socket.on('chatMessage', (newMessage) => {
            setMessages((prevMessages) => [...prevMessages, newMessage]);
        });

        return () => socket.disconnect();
    }, [userId]);

    const sendMessage = () => {
        if (message.trim()) {
            socket.emit('chatMessage', { userId, message });
            setMessage('');
        }
    };

    return (
        <div className="confession-container">
            <div className="messages">
                {messages.map((msg, index) => (
                    <div key={index} className={msg.userId === userId ? 'my-confession' : 'other-confession'}>
                        {msg.message}
                    </div>
                ))}
            </div>
            <div className="message-input">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Confess your thoughts..."
                />
                <button onClick={sendMessage}>Confess</button>
            </div>
        </div>
    );
};

export default ConfessionPage;
