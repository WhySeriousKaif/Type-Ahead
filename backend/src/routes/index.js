/**
 * routes/index.js
 * Central router — wires all endpoints to controllers
 */

import express from 'express';
import { suggest }    from '../controllers/suggestController.js';
import { search }     from '../controllers/searchController.js';
import { cacheDebug } from '../controllers/cacheController.js';
import { trending }   from '../controllers/trendingController.js';
import { getMetrics } from '../controllers/metricsController.js';

const router = express.Router();

// GET /suggest?q=<prefix>
router.get('/suggest', suggest);

// POST /search  body: { query: string }
router.post('/search', search);

// GET /cache/debug?prefix=<prefix>
router.get('/cache/debug', cacheDebug);

// GET /trending
router.get('/trending', trending);

// GET /metrics
router.get('/metrics', getMetrics);

// GET /health
router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

export default router;
