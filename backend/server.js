// server.js (Backend)
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
    },
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => console.log('Connected to MongoDB'));

// Message Schema
const messageSchema = new mongoose.Schema({
    userId: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', messageSchema);

// Socket.io
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Send all previous messages to the new user
    Message.find().sort({ timestamp: 1 }).then((messages) => {
        socket.emit('previousMessages', messages);
    });

    // Handle incoming messages
    socket.on('chatMessage', (data) => {
        const newMessage = new Message({ userId: data.userId, message: data.message });
        newMessage.save().then((savedMessage) => {
            io.emit('chatMessage', savedMessage);
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));