import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import './ConfessionPage.css';

const socket = io('http://localhost:5000');

const ConfessionPage = () => {
  const [confession, setConfession] = useState('');
  const [confessions, setConfessions] = useState([]);

  useEffect(() => {
    fetchConfessions();
    socket.on('newConfession', (msg) => {
      setConfessions((prev) => [...prev, msg]);
    });
    return () => socket.off('newConfession');
  }, []);

  const fetchConfessions = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/confession/messages');
      setConfessions(res.data);
    } catch (err) {
      console.error('Failed to fetch confessions:', err);
    }
  };

  const sendConfession = async () => {
    if (!confession.trim()) return;
    try {
      const res = await axios.post('http://localhost:5000/api/confession/messages', { content: confession });
      setConfession('');
    } catch (err) {
      console.error('Failed to send confession:', err);
    }
  };

  return (
    <div className="confession-container">
      <div className="confessions">
        {confessions.map((msg, i) => (
          <div key={i} className="confession">
            {msg.content}
          </div>
        ))}
      </div>
      <div className="input-container">
        <input
          value={confession}
          onChange={(e) => setConfession(e.target.value)}
          placeholder="Write your confession..."
          onKeyPress={(e) => e.key === 'Enter' && sendConfession()}
        />
        <button onClick={sendConfession}>Confess</button>
      </div>
    </div>
  );
};

export default ConfessionPage;

