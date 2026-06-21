package com.searchiq.service;

import com.searchiq.model.Query;
import com.searchiq.repository.QueryRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

/**
 * TrendingService — computes the top 10 trending searches.
 *
 * FORMULA:
 *   score = allTimeCount + recentCount × 10
 *
 * WHY this formula (viva answer):
 * - allTimeCount gives a stable baseline (prevents cold new queries dominating)
 * - recentCount * 10 gives a strong recency boost:
 *     500 searches in last hour = +5000 score points
 *     That can beat a query with 100,000 all-time count during a viral spike
 * - The boost decays NATURALLY as the 1-hour sliding window moves forward
 *   (no cron job needed — old timestamps fall out of the filter automatically)
 *
 * SLIDING WINDOW:
 * - Query.recentSearches stores timestamps of all recent searches
 * - We filter to only those after (now - 1 hour)
 * - freshRecentCount = count of surviving timestamps
 * - score = count + freshRecentCount * 10
 *
 * EXAMPLE during IPL Final night:
 *   "iphone"    count=100000, recentCount=5  → score = 100050
 *   "IPL Final" count=300,    recentCount=800 → score = 8300
 *   Next morning: IPL Final recentCount=0 → score = 300 (drops naturally)
 */
@Service
public class TrendingService {

    private static final int    TOP_N         = 10;
    private static final int    CANDIDATES    = 200;
    private static final long   ONE_HOUR_MS   = 60 * 60 * 1000L;

    private final QueryRepository queryRepo;

    public TrendingService(QueryRepository queryRepo) {
        this.queryRepo = queryRepo;
    }

    /**
     * Fetch top trending queries.
     * @return list of up to 10 maps with query, count, recentCount, score
     */
    public List<Map<String, Object>> getTrending() {
        // Fetch top 200 by all-time count as candidates
        List<Query> candidates = queryRepo.findTop200ByOrderByCountDesc();

        Instant oneHourAgo = Instant.now().minusMillis(ONE_HOUR_MS);

        return candidates.stream()
                .map(q -> {
                    // Prune timestamps in memory (sliding window — no DB update needed here)
                    long freshRecentCount = q.getRecentSearches().stream()
                            .filter(ts -> ts.isAfter(oneHourAgo))
                            .count();

                    long score = q.getCount() + freshRecentCount * 10;

                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("query",       q.getQuery());
                    m.put("count",       q.getCount());
                    m.put("recentCount", freshRecentCount);
                    m.put("score",       score);
                    return m;
                })
                .sorted(Comparator.<Map<String, Object>, Long>
                        comparing(m -> (Long) m.get("score")).reversed())
                .limit(TOP_N)
                .toList();
    }
}
