import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ChatPage.css';
import axios from 'axios';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';

function ChatPage() {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [disableSend, setDisableSend] = useState(false);
    const messagesEndRef = useRef(null);
    const repeatCountRef = useRef(0);
    const lastMessageRef = useRef('');

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
        if (message.trim() === '' || message.length > 250 || disableSend) return;

        if (message === lastMessageRef.current) {
            repeatCountRef.current += 1;
        } else {
            repeatCountRef.current = 1;
            lastMessageRef.current = message;
        }

        if (repeatCountRef.current >= 6) {
            setDisableSend(true);
            setTimeout(() => setDisableSend(false), 20000); // 20 seconds
            return;
        }

        try {
            const response = await axios.post('https://hello-anonymous.onrender.com/api/chat/messages', { text: message });
            setMessages((prev) => [...prev, response.data]);
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

            <div className="chat-messages">
                {Object.entries(groupedMessages).map(([date, msgs], i) => (
                    <div key={i}>
                        <div className="date-label">{renderDateLabel(date)}</div>
                        {msgs.map((msg, index) => (
                            <div key={index} className="chat-message">
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