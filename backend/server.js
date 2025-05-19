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

// Storage Limits (70% for messages, 30% for confessions)
const MAX_CHAT_SIZE_MB = 358;  // 70% of 512MB
const MAX_CONFESSION_SIZE_MB = 154;  // 30% of 512MB

// Function to check and delete oldest messages if limit is reached
async function manageStorage() {
  try {
    // Check chat messages size
    const chatStats = await Message.collection.stats();
    const chatSizeMB = chatStats.storageSize / (1024 * 1024);
    while (chatSizeMB > MAX_CHAT_SIZE_MB) {
      const oldestMessage = await Message.findOne().sort({ timestamp: 1 });
      if (oldestMessage) await Message.deleteOne({ _id: oldestMessage._id });
    }

    // Check confession messages size
    const confessionStats = await Confession.collection.stats();
    const confessionSizeMB = confessionStats.storageSize / (1024 * 1024);
    while (confessionSizeMB > MAX_CONFESSION_SIZE_MB) {
      const oldestConfession = await Confession.findOne().sort({ timestamp: 1 });
      if (oldestConfession) await Confession.deleteOne({ _id: oldestConfession._id });
    }
  } catch (error) {
    console.error('Error managing storage:', error);
  }
}

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
    manageStorage();
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
    manageStorage();
    res.json(confession);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save confession' });
  }
});

// Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
