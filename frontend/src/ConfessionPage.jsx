// src/ConfessionPage.jsx
import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import './ConfessionPage.css';

const socket = io("https://hello-anonymous.onrender.com");

function ConfessionPage() {
    const [confession, setConfession] = useState("");
    const [confessions, setConfessions] = useState([]);


    useEffect(() => {
    socket.on("receive_confession", (data) => {
        setConfessions((prevConfessions) => [...prevConfessions, data]);
        
        // Auto-scroll to the latest confession
        setTimeout(() => {
            const confessionContainer = document.querySelector(".confession-container");
            if (confessionContainer) {
                confessionContainer.scrollTop = confessionContainer.scrollHeight;
            }
        }, 100);
    });

    return () => {
        socket.off("receive_confession");
    };
    }, []);


    const sendConfession = () => {
        if (confession.trim() !== "") {
            const data = {
                text: confession,
                timestamp: new Date().toLocaleTimeString(),
            };
            socket.emit("send_confession", data);
            setConfession("");
        }
    };

    // Handle Enter key press
    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            sendConfession();
        }
    };

    return (
        <div className="confession-container">
            <div className="confession-box">
                {confessions.map((conf, index) => (
                    <div key={index} className="confession">
                        <span className="confession-text">{conf.text}</span>
                        <span className="timestamp">{conf.timestamp}</span>
                    </div>
                ))}
            </div>
            <div className="input-container">
                <input
                    type="text"
                    value={confession}
                    onChange={(e) => setConfession(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your confession..."
                />
                <button onClick={sendConfession}>Send</button>
            </div>
        </div>
    );
}

export default ConfessionPage;
