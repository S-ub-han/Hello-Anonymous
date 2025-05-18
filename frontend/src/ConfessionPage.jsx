import React, { useState, useEffect, useRef } from 'react';
import './ConfessionPage.css';
import axios from 'axios';

function ConfessionPage() {
    const [confession, setConfession] = useState('');
    const [confessions, setConfessions] = useState([]);
    const confessionsEndRef = useRef(null);

    useEffect(() => {
        fetchConfessions();
    }, []);

    const fetchConfessions = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/confession/messages');
            setConfessions(response.data);
            scrollToBottom();
        } catch (error) {
            console.error('Error fetching confessions:', error);
        }
    };

    const handleSendConfession = async () => {
        if (confession.trim() === '') return;
        try {
            const response = await axios.post('http://localhost:5000/api/confession/messages', { text: confession });
            setConfessions([...confessions, response.data]);
            setConfession('');
            scrollToBottom();
        } catch (error) {
            console.error('Error sending confession:', error);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSendConfession();
    };

    const scrollToBottom = () => {
        confessionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="confession-container">
            <div className="confession-header">
                <h1>Confession Room</h1>
            </div>
            <div className="confession-messages">
                {confessions.map((msg, index) => (
                    <div key={index} className="confession-message">
                        {msg.text}
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
                    placeholder="Type a confession..."
                />
                <button onClick={handleSendConfession}>Send</button>
            </div>
            <div className="footer">Developed by Subhan Khan</div>
        </div>
    );
}

export default ConfessionPage;
