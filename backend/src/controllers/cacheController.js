/**
 * cacheController.js
 * Handles GET /cache/debug?prefix=<prefix>
 *
 * Returns:
 * - Which cache node owns this prefix
 * - The hash value of the prefix on the ring
 * - Whether the prefix is currently cached (hit/miss)
 * - Node-level stats
 *
 * This endpoint is for viva demonstration — shows consistent hashing in action.
 */

import * as CacheManager from '../cache/CacheManager.js';

export function cacheDebug(req, res) {
  const prefix = req.query.prefix || '';

  if (!prefix.trim()) {
    return res.status(400).json({ error: 'prefix query param is required' });
  }

  const debugInfo    = CacheManager.debug(prefix.trim());
  const allNodeStats = CacheManager.getAllNodeStats();
  const ringStats    = CacheManager.getRingStats();

  res.json({
    ...debugInfo,
    allNodes: allNodeStats,
    ring:     ringStats,
  });
}
