/**
 * batchWriter.js
 *
 * IN-MEMORY WRITE BUFFER — The core of our write optimization.
 *
 * PROBLEM without batching:
 *   10,000 searches → 10,000 individual DB writes → DB overloaded
 *
 * SOLUTION with batching:
 *   Buffer tracks per-query counts in a JS Map.
 *   "iphone" searched 500 times? buffer.get('iphone') = 500
 *   On flush → 1 DB upsert with count += 500
 *
 * TRADEOFF:
 *   If the server crashes before flush → buffered counts are LOST.
 *   Production fix: use Kafka/WAL/Redis before buffering.
 *
 * FLUSH TRIGGERS (either can trigger):
 *   1. Timer: every BATCH_FLUSH_INTERVAL_MS (default 30s)
 *   2. Size:  when buffer reaches BATCH_FLUSH_SIZE (default 100 unique queries)
 */

import Query from '../models/Query.js';
import { incrementDbWrite, incrementBatchSaved } from '../metrics.js';
import { invalidate } from '../cache/CacheManager.js';

const FLUSH_INTERVAL_MS = parseInt(process.env.BATCH_FLUSH_INTERVAL_MS) || 30000;
const FLUSH_SIZE        = parseInt(process.env.BATCH_FLUSH_SIZE) || 100;

// buffer: Map<queryString, { count, timestamps[] }>
const buffer = new Map();
let totalBufferedRequests = 0;

/**
 * Add a search query to the buffer.
 * Does NOT touch the database — purely in-memory.
 */
export function addToBuffer(query) {
  const key = query.toLowerCase().trim();
  if (!key) return;

  const now = new Date();
  if (buffer.has(key)) {
    const entry = buffer.get(key);
    entry.count++;
    entry.timestamps.push(now);
  } else {
    buffer.set(key, { count: 1, timestamps: [now] });
  }

  totalBufferedRequests++;
  incrementBatchSaved(1);

  console.log(`[BUFFER ADD] query="${key}" buffered count=${buffer.get(key).count} | buffer size=${buffer.size}`);

  if (buffer.size >= FLUSH_SIZE) {
    console.log(`[BUFFER] Size limit ${FLUSH_SIZE} reached — triggering flush`);
    flush();
  }
}

/**
 * Flush the buffer to MongoDB using bulkWrite with upsert.
 */
export async function flush() {
  if (buffer.size === 0) {
    console.log('[BATCH FLUSH] Buffer empty — nothing to flush');
    return;
  }

  const snapshot = new Map(buffer);
  buffer.clear();

  const bufferEntries = [...snapshot.entries()];
  const uniqueQueriesCount = bufferEntries.length;
  let totalRequests = 0;

  const bulkOps = bufferEntries.map(([query, data]) => {
    totalRequests += data.count;
    return {
      updateOne: {
        filter: { query },
        update: {
          $inc:  { count: data.count },
          $push: { recentSearches: { $each: data.timestamps } },
          $set:  { lastSearched: data.timestamps[data.timestamps.length - 1] },
        },
        upsert: true,
      },
    };
  });

  try {
    await Query.bulkWrite(bulkOps, { ordered: false });

    // Invalidate cache prefixes for all flushed queries
    for (const [query] of bufferEntries) {
      for (let len = 1; len <= Math.min(5, query.length); len++) {
        invalidate(query.slice(0, len));
      }
    }

    incrementDbWrite(uniqueQueriesCount);
    incrementBatchSaved(totalRequests - uniqueQueriesCount - totalRequests);

    console.log(`[BATCH FLUSH] ✅ Flushed ${uniqueQueriesCount} unique queries`);
    console.log(`              Total buffered requests: ${totalRequests}`);
    console.log(`              Actual DB writes (ops): ${uniqueQueriesCount}`);
    console.log(`              Writes SAVED by batching: ${totalRequests - uniqueQueriesCount}`);
    console.log(`              Write reduction: ${((1 - uniqueQueriesCount / totalRequests) * 100).toFixed(1)}%`);
  } catch (err) {
    console.error('[BATCH FLUSH] ❌ Error during flush:', err.message);
    // Restore buffer on failure
    for (const [query, data] of snapshot.entries()) {
      if (buffer.has(query)) {
        const existing = buffer.get(query);
        existing.count += data.count;
        existing.timestamps.push(...data.timestamps);
      } else {
        buffer.set(query, data);
      }
    }
    console.log('[BATCH FLUSH] Buffer restored after failure');
  }
}

/**
 * Get current buffer status — for /metrics endpoint
 */
export function getBufferStatus() {
  return {
    bufferedQueries:       buffer.size,
    totalBufferedRequests,
    flushIntervalMs:       FLUSH_INTERVAL_MS,
    flushSizeLimit:        FLUSH_SIZE,
  };
}

/**
 * Start the periodic flush timer. Called once at app startup.
 */
export function startFlushTimer() {
  console.log(`[BATCH WRITER] Started — flush every ${FLUSH_INTERVAL_MS / 1000}s OR at ${FLUSH_SIZE} entries`);
  setInterval(flush, FLUSH_INTERVAL_MS);
}
