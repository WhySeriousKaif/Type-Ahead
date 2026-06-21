/**
 * suggestionService.js
 *
 * Handles the core suggest flow:
 * Cache-first → DB fallback → Re-cache
 *
 * FLOW:
 * 1. Normalize prefix (lowercase, trim)
 * 2. Check CacheManager → HIT: return immediately (1-5ms)
 * 3. MISS: query MongoDB with prefix regex
 * 4. Compute score for each result (allTime + recent*10)
 * 5. Sort by score descending, take top 10
 * 6. Store in cache for future requests
 * 7. Return results
 */

import Query from '../models/Query.js';
import * as CacheManager from '../cache/CacheManager.js';
import { incrementDbRead, recordLatency } from '../metrics.js';

const MAX_SUGGESTIONS = 10;

/**
 * Get suggestions for a prefix.
 * @param {string} prefix
 * @returns {Promise<Array<{ query: string, count: number, score: number }>>}
 */
export async function getSuggestions(prefix) {
  const startTime = Date.now();

  if (!prefix || prefix.trim() === '') return [];

  const normalizedPrefix = prefix.toLowerCase().trim();

  // --- Step 1: Check Cache ---
  const cached = CacheManager.get(normalizedPrefix);
  if (cached !== null) {
    recordLatency(Date.now() - startTime);
    return cached;
  }

  // --- Step 2: Query MongoDB ---
  // Escape special regex chars to prevent ReDoS
  const escapedPrefix = normalizedPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${escapedPrefix}`, 'i');

  try {
    const candidates = await Query.find(
      { query: regex },
      { query: 1, count: 1, recentCount: 1 }
    )
      .sort({ count: -1 })
      .limit(50)
      .lean();

    incrementDbRead();

    // --- Step 3: Compute trending score and re-rank ---
    const results = candidates
      .map(doc => ({
        query:       doc.query,
        count:       doc.count,
        recentCount: doc.recentCount || 0,
        score:       doc.count + (doc.recentCount || 0) * 10,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SUGGESTIONS);

    // --- Step 4: Cache the result ---
    CacheManager.set(normalizedPrefix, results);

    recordLatency(Date.now() - startTime);
    return results;
  } catch (err) {
    console.error('[SUGGESTION SERVICE] DB error:', err.message);
    recordLatency(Date.now() - startTime);
    return [];
  }
}
