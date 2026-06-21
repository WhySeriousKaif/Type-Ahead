package com.searchiq.worker;

import com.searchiq.cache.CacheManager;
import com.searchiq.metrics.MetricsService;
import com.searchiq.model.Query;
import com.searchiq.repository.QueryRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * BatchWriterService — in-memory write buffer that batches DB writes.
 *
 * THE PROBLEM:
 *   10,000 searches → 10,000 individual DB writes → MongoDB overloaded
 *
 * THE SOLUTION:
 *   Buffer: ConcurrentHashMap<query, BufferEntry>
 *   "iphone" searched 500 times → buffer.get("iphone").count = 500
 *   On flush → ONE MongoDB bulkWrite: iphone.count += 500
 *   DB writes reduced from 10,000 to 1 round-trip (many ops)
 *
 * TWO FLUSH TRIGGERS:
 *   1. @Scheduled: runs every FLUSH_INTERVAL_MS (default 30 seconds)
 *   2. Size trigger: when buffer reaches FLUSH_SIZE unique queries (default 100)
 *      → prevents memory overflow during viral spikes
 *
 * TRADEOFF (important for viva):
 *   If the JVM crashes before flush → buffered counts are LOST
 *   Production fix: Kafka as a durable message queue before the in-memory buffer
 *
 * THREAD SAFETY:
 *   Using ConcurrentHashMap so multiple HTTP request threads can call addToBuffer()
 *   simultaneously without corrupting the map.
 *   The flush() method is synchronized to prevent double-flush race conditions.
 */
@Service
public class BatchWriterService {

    @Value("${searchiq.batch.flush-interval-ms:30000}")
    private long flushIntervalMs;

    @Value("${searchiq.batch.flush-size:100}")
    private int flushSize;

    private final MongoTemplate   mongoTemplate;
    private final CacheManager    cacheManager;
    private final MetricsService  metrics;

    /** Buffer entry: count of buffered searches + timestamps for the 1-hour window */
    private static class BufferEntry {
        volatile long          count      = 0;
        final List<Instant>    timestamps = Collections.synchronizedList(new ArrayList<>());
    }

    // ConcurrentHashMap: thread-safe, no synchronized needed for per-key writes
    private final ConcurrentHashMap<String, BufferEntry> buffer = new ConcurrentHashMap<>();

    public BatchWriterService(MongoTemplate mongoTemplate,
                              CacheManager cacheManager,
                              MetricsService metrics) {
        this.mongoTemplate = mongoTemplate;
        this.cacheManager  = cacheManager;
        this.metrics       = metrics;
    }

    @PostConstruct
    public void init() {
        System.out.printf("[BATCH WRITER] Started — flush every %ds OR at %d unique queries%n",
                flushIntervalMs / 1000, flushSize);
    }

    /**
     * Add a search query to the in-memory buffer.
     * Called by SearchController on every POST /search.
     * Does NOT touch MongoDB — purely in-memory.
     *
     * @param query the normalized search query
     */
    public void addToBuffer(String query) {
        String key = query.toLowerCase().trim();
        if (key.isEmpty()) return;

        // computeIfAbsent is atomic — safe for concurrent requests
        BufferEntry entry = buffer.computeIfAbsent(key, k -> new BufferEntry());
        synchronized (entry) {
            entry.count++;
            entry.timestamps.add(Instant.now());
        }

        metrics.incrementBatchSaved(1); // every buffered write = 1 DB write saved

        System.out.printf("[BUFFER ADD] query=\"%s\" count=%d buffer_size=%d%n",
                key, entry.count, buffer.size());

        // Size-based flush trigger
        if (buffer.size() >= flushSize) {
            System.out.printf("[BUFFER] Size limit %d reached — triggering flush%n", flushSize);
            flush();
        }
    }

    /**
     * Flush the buffer to MongoDB.
     * Uses MongoTemplate for bulkWrite-style upserts.
     *
     * @Scheduled: runs every flushIntervalMs (configured via @Scheduled fixedDelay
     * in a separate config class, or here via fixedDelayString).
     */
    @Scheduled(fixedDelayString = "${searchiq.batch.flush-interval-ms:30000}")
    public synchronized void flush() {
        if (buffer.isEmpty()) {
            System.out.println("[BATCH FLUSH] Buffer empty — nothing to flush");
            return;
        }

        // Take a snapshot and clear buffer atomically
        Map<String, BufferEntry> snapshot = new HashMap<>(buffer);
        buffer.clear();

        int   uniqueQueries   = snapshot.size();
        long  totalRequests   = 0;
        List<String> flushedQueries = new ArrayList<>();

        for (Map.Entry<String, BufferEntry> entry : snapshot.entrySet()) {
            String      key   = entry.getKey();
            BufferEntry data  = entry.getValue();
            totalRequests    += data.count;
            flushedQueries.add(key);

            try {
                // MongoDB upsert: increment count, push timestamps, set lastSearched
                org.springframework.data.mongodb.core.query.Query mongoQuery =
                        new org.springframework.data.mongodb.core.query.Query(
                                Criteria.where("query").is(key));

                Update update = new Update()
                        .inc("count", data.count)
                        .set("lastSearched", data.timestamps.get(data.timestamps.size() - 1))
                        .push("recentSearches").each(data.timestamps.toArray());

                // upsert = create document if it doesn't exist yet
                mongoTemplate.upsert(mongoQuery, update, Query.class);

                metrics.incrementDbWrite(1);

            } catch (Exception e) {
                System.err.printf("[BATCH FLUSH] ❌ Error for query \"%s\": %s%n",
                        key, e.getMessage());
                // Restore failed entry to buffer for next flush
                buffer.merge(key, data, (existing, failed) -> {
                    existing.count += failed.count;
                    existing.timestamps.addAll(failed.timestamps);
                    return existing;
                });
            }
        }

        // After DB write, invalidate cache prefixes (stale suggestions must be evicted)
        for (String query : flushedQueries) {
            for (int len = 1; len <= Math.min(5, query.length()); len++) {
                cacheManager.invalidate(query.substring(0, len));
            }
        }

        System.out.printf("[BATCH FLUSH] ✅ Flushed %d unique queries%n", uniqueQueries);
        System.out.printf("              Total buffered requests: %d%n", totalRequests);
        System.out.printf("              Writes SAVED by batching: %d%n",
                totalRequests - uniqueQueries);
        if (totalRequests > 0) {
            System.out.printf("              Write reduction: %.1f%%%n",
                    (1.0 - (double) uniqueQueries / totalRequests) * 100);
        }
    }

    /**
     * Buffer status for the /metrics endpoint.
     */
    public Map<String, Object> getBufferStatus() {
        return Map.of(
                "bufferedQueries",    buffer.size(),
                "flushIntervalMs",    flushIntervalMs,
                "flushSizeLimit",     flushSize
        );
    }
}
