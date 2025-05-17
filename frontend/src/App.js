// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import ChatPage from "./ChatPage";
import ConfessionPage from "./ConfessionPage";
import './App.css';

function Navbar() {
    const location = useLocation();

    return (
        <div className="nav">
            <Link to="/chat" className={location.pathname === "/chat" || location.pathname === "/" ? "active" : ""}>
                🗨️ Chat Room
            </Link>
            <Link to="/confession" className={location.pathname === "/confession" ? "active" : ""}>
                💬 Confession Room
            </Link>
        </div>
    );
}

function App() {
    return (
        <Router>
            <Navbar />
            <Routes>
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/confession" element={<ConfessionPage />} />
                <Route path="/" element={<ChatPage />} /> {/* Default route */}
            </Routes>
        </Router>
    );
}

export default App;