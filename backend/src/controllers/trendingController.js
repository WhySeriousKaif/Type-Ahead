/**
 * trendingController.js
 * Handles GET /trending
 */

import { getTrending } from '../services/trendingService.js';

export async function trending(req, res) {
  try {
    const results = await getTrending();
    res.json({ trending: results });
  } catch (err) {
    console.error('[TRENDING CONTROLLER]', err.message);
    res.status(500).json({ error: 'Failed to fetch trending', trending: [] });
  }
}
