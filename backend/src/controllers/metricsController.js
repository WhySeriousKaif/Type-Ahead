/**
 * metricsController.js
 * Handles GET /metrics
 *
 * Returns a real-time snapshot of system performance metrics.
 */

import { getSnapshot } from '../metrics.js';
import { getBufferStatus } from '../workers/batchWriter.js';
import { getAllNodeStats } from '../cache/CacheManager.js';

export function getMetrics(req, res) {
  const snapshot    = getSnapshot();
  const bufferStatus = getBufferStatus();
  const nodeStats   = getAllNodeStats();

  res.json({
    ...snapshot,
    batchBuffer: bufferStatus,
    cacheNodes:  nodeStats,
    timestamp:   new Date().toISOString(),
  });
}
