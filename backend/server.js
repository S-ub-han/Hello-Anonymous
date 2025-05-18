// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
const mongoURI = process.env.MONGO_URI || 'mongodb+srv://subhankhann95:MsRLzJIVLouXlfdP@cluster0.s5f4zdn.mongodb.net/hello_anonymous?retryWrites=true&w=majority';
mongoose.connect(mongoURI);

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Message Models
const Message = mongoose.model('Message', new mongoose.Schema({
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}));

const Confession = mongoose.model('Confession', new mongoose.Schema({
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}));

// Chat Messages API
app.get('/api/chat/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/chat/messages', async (req, res) => {
  try {
    const message = new Message({ text: req.body.text });
    await message.save();
    res.json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// Confession Messages API
app.get('/api/confession/messages', async (req, res) => {
  try {
    const confessions = await Confession.find().sort({ timestamp: 1 });
    res.json(confessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch confessions' });
  }
});

app.post('/api/confession/messages', async (req, res) => {
  try {
    const confession = new Confession({ text: req.body.text });
    await confession.save();
    res.json(confession);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save confession' });
  }
});

// Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));