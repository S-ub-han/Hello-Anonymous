// src/ChatPage.jsx
import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import './ChatPage.css';

const socket = io("http://localhost:5000");

function ChatPage() {
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [reply, setReply] = useState(null);

    useEffect(() => {
        socket.on("receive_message", (data) => {
            setMessages((prevMessages) => [...prevMessages, data]);

            // Auto-scroll to the latest message
            setTimeout(() => {
                const chatContainer = document.querySelector(".chat-container");
                if (chatContainer) {
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            }, 100);
        });

        return () => {
            socket.off("receive_message");
        };
    }, []);

    const sendMessage = () => {
        if (message.trim() !== "") {
            const data = {
                text: message,
                timestamp: new Date().toLocaleTimeString(),
                reply: reply,
            };
            socket.emit("send_message", data);
            setMessage("");
            setReply(null);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            sendMessage();
        }
    };

    const handleReply = (message) => {
        setReply(message);
    };

    return (
        <div className="chat-container">
            <div className="chat-box">
                {messages.map((msg, index) => (
                    <div key={index} className="message" onClick={() => handleReply(msg)}>
                        {msg.reply && (
                            <div className="reply">
                                <strong>Reply:</strong> {msg.reply.text}
                            </div>
                        )}
                        <span className="message-text">{msg.text}</span>
                        <span className="timestamp">{msg.timestamp}</span>
                    </div>
                ))}
            </div>
            {reply && (
                <div className="reply-preview">
                    Replying to: {reply.text} <button onClick={() => setReply(null)}>Cancel</button>
                </div>
            )}
            <div className="input-container">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                />
                <button onClick={sendMessage}>Send</button>
            </div>
        </div>
    );
}

export default ChatPage;
