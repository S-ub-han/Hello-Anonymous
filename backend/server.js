const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const compression = require('compression');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: ['https://<username>.github.io', 'http://localhost:3000'], // Replace with your GitHub Pages URL
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(compression());

// MongoDB Connection
const mongoURI = process.env.MONGO_URI || 'mongodb+srv://subhankhann95:MsRLzJIVLouXlfdP@cluster0.s5f4zdn.mongodb.net/hello_anonymous?retryWrites=true&w=1';
mongoose.connect(mongoURI, {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  writeConcern: { w: 1, wtimeout: 3000 }
});

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Unified Message Model
const Message = mongoose.model('Message', new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['chat', 'confession'], required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  clientId: { type: String, index: true, sparse: true }
}, {
  toJSON: { virtuals: false, transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }}
}));

// Storage Limits
const MAX_SIZE_MB = 300;

// Delete oldest 50%
async function deleteOldest50Percent() {
  const totalCount = await Message.countDocuments().exec();
  const deleteCount = Math.floor(totalCount / 2);
  const oldestDocs = await Message.find({}, '_id').sort({ timestamp: 1 }).limit(deleteCount).lean();
  const idsToDelete = oldestDocs.map(doc => doc._id);
  await Message.deleteMany({ _id: { $in: idsToDelete } }).exec();
}

// Manage storage (background task)
async function manageStorage() {
  try {
    const stats = await Message.collection.stats();
    const sizeMB = stats.storageSize / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) {
      await deleteOldest50Percent();
    }
  } catch (error) {
    console.error('Error managing storage:', error);
  }
}

// Scheduled cleanup every 15 days at midnight
cron.schedule('0 0 */15 * *', async () => {
  console.log('Running 15-day auto-delete cleanup');
  try {
    await deleteOldest50Percent();
  } catch (error) {
    console.error('Scheduled cleanup error:', error);
  }
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// GET Messages - Latest 100, filtered by type
app.get('/api/messages', async (req, res) => {
  try {
    const { type } = req.query;
    const query = type ? { type } : {};
    const messages = await Message.find(query, 'text type timestamp clientId').sort({ timestamp: -1 }).limit(100).lean();
    res.json(messages.reverse());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST Message
app.post('/api/messages', async (req, res) => {
  try {
    const { text, type, clientId } = req.body;
    if (!text || !type || !['chat', 'confession'].includes(type)) {
      return res.status(400).json({ error: 'Text and valid type (chat/confession) are required' });
    }

    if (clientId) {
      const existingMessage = await Message.findOne({ clientId }, 'text type timestamp clientId').lean();
      if (existingMessage) {
        return res.json(existingMessage);
      }
    }

    const message = { text, type, clientId, timestamp: new Date() };
    const result = await Message.collection.insertOne(message, { writeConcern: { w: 1 } });
    message._id = result.insertedId;

    manageStorage().catch(err => console.error('Background storage management error:', err));

    res.json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));