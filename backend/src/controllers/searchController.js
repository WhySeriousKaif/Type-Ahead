/**
 * searchController.js
 * Handles POST /search
 *
 * DESIGN DECISION — Why not write directly to DB here?
 * Because under high load (thousands of concurrent searches),
 * synchronous DB writes create a write bottleneck.
 * Instead, we push to the in-memory batch buffer (addToBuffer),
 * which aggregates and flushes in bulk.
 */

import { addToBuffer } from '../workers/batchWriter.js';

export async function search(req, res) {
  const { query } = req.body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'query field is required' });
  }

  const normalizedQuery = query.trim().toLowerCase();

  // Add to in-memory buffer — non-blocking, returns immediately
  addToBuffer(normalizedQuery);

  res.json({ message: 'Searched', query: normalizedQuery });
}
