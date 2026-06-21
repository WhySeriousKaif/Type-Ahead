/**
 * trendingService.js
 *
 * Computes trending searches using a recency-boosted score:
 *
 *   score = allTimeCount + recentCount * 10
 *
 * WHY this formula:
 * - allTimeCount: baseline popularity
 * - recentCount * 10: recency multiplier — a query searched 100 times in
 *   the last hour gets +1000 to its score (enough to surface trends)
 * - Over time, recentCount decays as the 1-hour sliding window slides forward
 *
 * SLIDING WINDOW:
 * - recentSearches[] stores timestamps of recent activity
 * - Before scoring, we prune timestamps older than 1 hour
 * - recentCount = pruned array length
 */

import Query from '../models/Query.js';

const TOP_N        = 10;
const ONE_HOUR_MS  = 60 * 60 * 1000;

/**
 * Get top trending queries.
 * Fetches top candidates from DB, prunes stale timestamps, applies score formula.
 *
 * @returns {Promise<Array<{ query, count, recentCount, score }>>}
 */
export async function getTrending() {
  try {
    const candidates = await Query.find(
      {},
      { query: 1, count: 1, recentCount: 1, recentSearches: 1 }
    )
      .sort({ count: -1 })
      .limit(200)
      .lean();

    const oneHourAgo = new Date(Date.now() - ONE_HOUR_MS);

    const scored = candidates.map(doc => {
      const recentTimestamps  = (doc.recentSearches || []).filter(ts => ts > oneHourAgo);
      const freshRecentCount  = recentTimestamps.length;

      return {
        query:       doc.query,
        count:       doc.count,
        recentCount: freshRecentCount,
        score:       doc.count + freshRecentCount * 10,
      };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_N);
  } catch (err) {
    console.error('[TRENDING SERVICE] Error:', err.message);
    return [];
  }
}
