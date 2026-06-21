/**
 * metrics.js
 *
 * Global metrics singleton — tracks system-wide performance indicators.
 *
 * WHY a singleton:
 * - All modules (CacheManager, batchWriter, suggestionService) import this
 * - One source of truth for all counters
 * - No database overhead for monitoring data
 */

const metrics = {
  cacheHits: 0,
  cacheMisses: 0,
  dbReads: 0,
  dbWrites: 0,
  batchWritesSaved: 0,
  p95LatencySamples: [],
};

export function incrementHit()              { metrics.cacheHits++; }
export function incrementMiss()             { metrics.cacheMisses++; }
export function incrementDbRead()           { metrics.dbReads++; }
export function incrementDbWrite(n = 1)     { metrics.dbWrites += n; }
export function incrementBatchSaved(n = 1)  { metrics.batchWritesSaved += n; }

export function recordLatency(ms) {
  metrics.p95LatencySamples.push(ms);
  if (metrics.p95LatencySamples.length > 1000) {
    metrics.p95LatencySamples.shift();
  }
}

export function getP95Latency() {
  const samples = [...metrics.p95LatencySamples].sort((a, b) => a - b);
  if (samples.length === 0) return 0;
  const idx = Math.floor(samples.length * 0.95);
  return samples[Math.min(idx, samples.length - 1)];
}

export function getSnapshot() {
  const total = metrics.cacheHits + metrics.cacheMisses;
  return {
    cacheHits:        metrics.cacheHits,
    cacheMisses:      metrics.cacheMisses,
    cacheHitRate:     total > 0 ? ((metrics.cacheHits / total) * 100).toFixed(2) + '%' : '0%',
    cacheMissRate:    total > 0 ? ((metrics.cacheMisses / total) * 100).toFixed(2) + '%' : '0%',
    dbReads:          metrics.dbReads,
    dbWrites:         metrics.dbWrites,
    batchWritesSaved: metrics.batchWritesSaved,
    p95LatencyMs:     getP95Latency(),
  };
}
