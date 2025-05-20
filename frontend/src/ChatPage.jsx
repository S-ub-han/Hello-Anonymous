import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ChatPage.css';
import axios from 'axios';

function ChatPage() {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const messagesEndRef = useRef(null);

    const fetchMessages = useCallback(async () => {
        try {
            const response = await axios.get('https://hello-anonymous.onrender.com/api/chat/messages');
            setMessages(response.data);
            scrollToBottom();
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    }, []);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    const handleSendMessage = async () => {
        if (message.trim() === '') return;
        try {
            const response = await axios.post('https://hello-anonymous.onrender.com/api/chat/messages', { text: message });
            setMessages([...messages, response.data]);
            setMessage('');
            scrollToBottom();
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSendMessage();
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="chat-container">
            <div className="chat-header">Chat Room</div>

            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <div key={index} className="chat-message">
                        {msg.text}
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
                />
                <button onClick={handleSendMessage}>Send</button>
            </div>

            <div className="footer">Developed by Subhan Khan</div>
        </div>
    );
}

export default ChatPage;
