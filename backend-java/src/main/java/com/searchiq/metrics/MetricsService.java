package com.searchiq.metrics;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

/**
 * MetricsService — global counters for system monitoring.
 *
 * WHY a singleton service (not a static class):
 * - Spring manages the lifecycle → testable, injectable
 * - Uses AtomicLong for thread-safe increments without synchronized blocks
 * - All modules (CacheManager, BatchWriterService, SuggestionService) inject this
 *
 * Tracks:
 * - Cache hits / misses
 * - DB reads / writes
 * - Batch writes saved (writes absorbed by buffer)
 * - p95 latency (95th percentile response time)
 */
@Service
public class MetricsService {

    private final AtomicLong cacheHits        = new AtomicLong(0);
    private final AtomicLong cacheMisses      = new AtomicLong(0);
    private final AtomicLong dbReads          = new AtomicLong(0);
    private final AtomicLong dbWrites         = new AtomicLong(0);
    private final AtomicLong batchWritesSaved = new AtomicLong(0);

    // Last 1000 latency samples for p95 computation
    private final LinkedList<Long> latencySamples = new LinkedList<>();
    private static final int MAX_SAMPLES = 1000;

    public void incrementHit()              { cacheHits.incrementAndGet(); }
    public void incrementMiss()             { cacheMisses.incrementAndGet(); }
    public void incrementDbRead()           { dbReads.incrementAndGet(); }
    public void incrementDbWrite(long n)    { dbWrites.addAndGet(n); }
    public void incrementBatchSaved(long n) { batchWritesSaved.addAndGet(n); }

    /**
     * Record a latency sample for p95 calculation.
     * Keeps only the last MAX_SAMPLES values to bound memory usage.
     */
    public synchronized void recordLatency(long ms) {
        latencySamples.add(ms);
        if (latencySamples.size() > MAX_SAMPLES) {
            latencySamples.removeFirst();
        }
    }

    /**
     * Compute p95 latency from recorded samples.
     * p95 = value below which 95% of all observations fall.
     */
    public synchronized long getP95Latency() {
        if (latencySamples.isEmpty()) return 0;
        List<Long> sorted = new ArrayList<>(latencySamples);
        Collections.sort(sorted);
        int idx = (int) Math.floor(sorted.size() * 0.95);
        return sorted.get(Math.min(idx, sorted.size() - 1));
    }

    /**
     * Return a full snapshot of all metrics.
     * Called by MetricsController every 5 seconds.
     */
    public Map<String, Object> getSnapshot() {
        long hits   = cacheHits.get();
        long misses = cacheMisses.get();
        long total  = hits + misses;

        String hitRate  = total > 0
                ? String.format("%.2f%%", (hits   * 100.0 / total))
                : "0%";
        String missRate = total > 0
                ? String.format("%.2f%%", (misses * 100.0 / total))
                : "0%";

        Map<String, Object> snap = new LinkedHashMap<>();
        snap.put("cacheHits",        hits);
        snap.put("cacheMisses",      misses);
        snap.put("cacheHitRate",     hitRate);
        snap.put("cacheMissRate",    missRate);
        snap.put("dbReads",          dbReads.get());
        snap.put("dbWrites",         dbWrites.get());
        snap.put("batchWritesSaved", batchWritesSaved.get());
        snap.put("p95LatencyMs",     getP95Latency());
        return snap;
    }
}
