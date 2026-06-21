/**
 * app.js — Express Application Entry Point
 *
 * Startup sequence:
 * 1. Load environment variables
 * 2. Connect to MongoDB
 * 3. Start Batch Writer flush timer
 * 4. Mount routes
 * 5. Listen on PORT
 */

import 'dotenv/config';

import express   from 'express';
import cors      from 'cors';
import mongoose  from 'mongoose';

import routes      from './routes/index.js';
import { startFlushTimer } from './workers/batchWriter.js';

const app      = express();
const PORT     = process.env.PORT     || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/typeahead';

// --- Middleware ---
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[${req.method}] ${req.path} → ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// --- Routes ---
app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({ message: 'Search Typeahead API is running 🚀', version: '1.0.0' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// --- MongoDB Connection + Server Start ---
async function startServer() {
  try {
    console.log('[STARTUP] Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log(`[STARTUP] ✅ MongoDB connected → ${MONGO_URI}`);

    startFlushTimer();

    app.listen(PORT, () => {
      console.log(`[STARTUP] ✅ Server running on http://localhost:${PORT}`);
      console.log('[STARTUP] Available endpoints:');
      console.log('  GET  /api/suggest?q=<prefix>');
      console.log('  POST /api/search');
      console.log('  GET  /api/trending');
      console.log('  GET  /api/cache/debug?prefix=<prefix>');
      console.log('  GET  /api/metrics');
      console.log('  GET  /api/health');
    });
  } catch (err) {
    console.error('[STARTUP] ❌ Failed to start:', err.message);
    process.exit(1);
  }
}

startServer();

export default app;
