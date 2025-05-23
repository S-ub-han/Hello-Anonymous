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
  writeConcern: { w: 1, wtimeout: 3000 } // Faster writes
});

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Message Models
const Message = mongoose.model('Message', new mongoose.Schema({
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  clientId: { type: String, index: true, sparse: true }
}, {
  toJSON: { virtuals: false, transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }}
}));

const Confession = mongoose.model('Confession', new mongoose.Schema({
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  clientId: { type: String, index: true, sparse: true }
}, {
  toJSON: { virtuals: false, transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }}
}));

// Storage Limits
const MAX_CHAT_SIZE_MB = 300;
const MAX_CONFESSION_SIZE_MB = 100;

// Delete oldest 50%
async function deleteOldest50Percent(Model) {
  const totalCount = await Model.countDocuments().exec();
  const deleteCount = Math.floor(totalCount / 2);
  const oldestDocs = await Model.find({}, '_id').sort({ timestamp: 1 }).limit(deleteCount).lean();
  const idsToDelete = oldestDocs.map(doc => doc._id);
  await Model.deleteMany({ _id: { $in: idsToDelete } }).exec();
}

// Manage storage (background task)
async function manageStorage() {
  try {
    const chatStats = await Message.collection.stats();
    const chatSizeMB = chatStats.storageSize / (1024 * 1024);
    if (chatSizeMB > MAX_CHAT_SIZE_MB) {
      await deleteOldest50Percent(Message);
    }

    const confessionStats = await Confession.collection.stats();
    const confessionSizeMB = confessionStats.storageSize / (1024 * 1024);
    if (confessionSizeMB > MAX_CONFESSION_SIZE_MB) {
      await deleteOldest50Percent(Confession);
    }
  } catch (error) {
    console.error('Error managing storage:', error);
  }
}

// Scheduled cleanup every 15 days at midnight
cron.schedule('0 0 */15 * *', async () => {
  console.log('Running 15-day auto-delete cleanup');
  try {
    await deleteOldest50Percent(Message);
    await deleteOldest50Percent(Confession);
  } catch (error) {
    console.error('Scheduled cleanup error:', error);
  }
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// GET Chat Messages - Latest 100
app.get('/api/chat/messages', async (req, res) => {
  try {
    const messages = await Message.find({}, 'text timestamp clientId').sort({ timestamp: -1 }).limit(100).lean();
    res.json(messages.reverse());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST Chat Message
app.post('/api/chat/messages', async (req, res) => {
  try {
    const { text, clientId } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    if (clientId) {
      const existingMessage = await Message.findOne({ clientId }, 'text timestamp clientId').lean();
      if (existingMessage) {
        return res.json(existingMessage);
      }
    }

    const message = { text, clientId, timestamp: new Date() };
    const result = await Message.collection.insertOne(message, { writeConcern: { w: 1 } });
    message._id = result.insertedId;

    // Run storage management in background
    manageStorage().catch(err => console.error('Background storage management error:', err));

    res.json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// GET Confession Messages - Latest 100
app.get('/api/confession/messages', async (req, res) => {
  try {
    const confessions = await Confession.find({}, 'text timestamp clientId').sort({ timestamp: -1 }).limit(100).lean();
    res.json(confessions.reverse());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch confessions' });
  }
});

// POST Confession Message
app.post('/api/confession/messages', async (req, res) => {
  try {
    const { text, clientId } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    if (clientId) {
      const existingConfession = await Confession.findOne({ clientId }, 'text timestamp clientId').lean();
      if (existingConfession) {
        return res.json(existingConfession);
      }
    }

    const confession = { text, clientId, timestamp: new Date() };
    const result = await Confession.collection.insertOne(confession, { writeConcern: { w: 1 } });
    confession._id = result.insertedId;

    // Run storage management in background
    manageStorage().catch(err => console.error('Background storage management error:', err));

    res.json(confession);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save confession' });
  }
});

// Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));