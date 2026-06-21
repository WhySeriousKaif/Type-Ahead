package com.searchiq.service;

import com.searchiq.cache.CacheManager;
import com.searchiq.metrics.MetricsService;
import com.searchiq.model.Query;
import com.searchiq.repository.QueryRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;

/**
 * SuggestionService — the core "cache-first, DB fallback" flow.
 *
 * STEP-BY-STEP for prefix "iph":
 *
 * 1. Normalize: "Iph" → "iph"
 * 2. CacheManager.get("iph"):
 *    - HIT  → return immediately (1-5ms). Done.
 *    - MISS → continue
 * 3. MongoDB: db.queries.find({ query: /^iph/i }).sort({ count: -1 }).limit(50)
 *    → returns up to 50 candidate documents (30-80ms)
 * 4. Re-rank: for each candidate, compute score = count + recentCount * 10
 * 5. Sort by score desc, take top 10
 * 6. CacheManager.set("iph", top10) → stored in CacheNodeB (TTL 5 min)
 * 7. Return top10
 *
 * NEXT request for "iph" → step 2 hits cache → no DB call.
 *
 * WHY cache prefixes (not full queries)?
 * - "iph" is a shared prefix for iphone, iphone 15, iphone charger…
 * - Caching it once serves ALL those type-ahead requests from memory
 */
@Service
public class SuggestionService {

    private static final int MAX_SUGGESTIONS  = 10;
    private static final int DB_FETCH_LIMIT   = 50;

    private final QueryRepository queryRepo;
    private final CacheManager    cacheManager;
    private final MetricsService  metrics;

    public SuggestionService(QueryRepository queryRepo,
                             CacheManager cacheManager,
                             MetricsService metrics) {
        this.queryRepo    = queryRepo;
        this.cacheManager = cacheManager;
        this.metrics      = metrics;
    }

    /**
     * Get top suggestions for a prefix.
     * @param prefix user's typed text (e.g. "iph")
     * @return list of up to 10 suggestion maps with query, count, score
     */
    public List<Map<String, Object>> getSuggestions(String prefix) {
        long startTime = System.currentTimeMillis();

        if (prefix == null || prefix.isBlank()) return List.of();

        String normalizedPrefix = prefix.trim().toLowerCase();

        // --- Step 1: Check Cache ---
        List<Map<String, Object>> cached = cacheManager.get(normalizedPrefix);
        if (cached != null) {
            metrics.recordLatency(System.currentTimeMillis() - startTime);
            return cached;
        }

        // --- Step 2: Query MongoDB ---
        // Escape regex special chars to prevent ReDoS vulnerability
        String escaped = Pattern.quote(normalizedPrefix);
        Pattern regex  = Pattern.compile("^" + escaped, Pattern.CASE_INSENSITIVE);

        List<Query> candidates = queryRepo.findByQueryRegexOrderByCountDesc(regex);

        // Trim to DB_FETCH_LIMIT manually (derived query method fetches all matches)
        if (candidates.size() > DB_FETCH_LIMIT) {
            candidates = candidates.subList(0, DB_FETCH_LIMIT);
        }

        metrics.incrementDbRead();

        // --- Step 3: Score and re-rank ---
        List<Map<String, Object>> results = candidates.stream()
                .map(q -> {
                    long score = q.getCount() + q.getRecentCount() * 10;
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("query",       q.getQuery());
                    m.put("count",       q.getCount());
                    m.put("recentCount", q.getRecentCount());
                    m.put("score",       score);
                    return m;
                })
                .sorted(Comparator.<Map<String, Object>, Long>
                        comparing(m -> (Long) m.get("score")).reversed())
                .limit(MAX_SUGGESTIONS)
                .toList();

        // --- Step 4: Cache the result (only cache if suggestions are found to prevent fake hits on non-existent prefixes)
        if (!results.isEmpty()) {
            cacheManager.set(normalizedPrefix, results);
        }

        metrics.recordLatency(System.currentTimeMillis() - startTime);
        return results;
    }
}
