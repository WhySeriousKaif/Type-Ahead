package com.searchiq.cache;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * CacheNode — one logical in-memory cache node.
 *
 * Backed by a plain HashMap (Java's equivalent of JS Map).
 *
 * WHY HashMap:
 * - O(1) average get/put/remove
 * - No external dependencies (simulates Redis in-memory store)
 *
 * TTL (Time To Live):
 * - Every entry has an expiresAt Instant
 * - On get(), expired entry is deleted immediately (lazy eviction)
 * - Avoids costly background scan of all keys
 *
 * Thread Safety:
 * - Using synchronized methods since Spring's scheduler + request threads
 *   may access the same node concurrently
 */
public class CacheNode {

    private final String name;
    private final long defaultTtlMs;

    // Internal entry type: stores value + expiry time
    private record CacheEntry(List<Map<String, Object>> value, Instant expiresAt) {}

    // The backing store: key → CacheEntry
    private final Map<String, CacheEntry> store = new HashMap<>();

    // Counters for metrics dashboard
    private long hitCount  = 0;
    private long missCount = 0;

    public CacheNode(String name, long defaultTtlMs) {
        this.name         = name;
        this.defaultTtlMs = defaultTtlMs;
    }

    /**
     * Get a cached value.
     * Returns null on miss or if the entry has expired (lazy eviction).
     */
    public synchronized List<Map<String, Object>> get(String key) {
        CacheEntry entry = store.get(key);

        if (entry == null) {
            missCount++;
            return null;
        }

        // Lazy TTL eviction — delete expired entry on read
        if (Instant.now().isAfter(entry.expiresAt())) {
            store.remove(key);
            missCount++;
            return null;
        }

        hitCount++;
        return entry.value();
    }

    /**
     * Store a value in cache with the default TTL.
     */
    public synchronized void set(String key, List<Map<String, Object>> value) {
        store.put(key, new CacheEntry(value, Instant.now().plusMillis(defaultTtlMs)));
    }

    /**
     * Explicitly remove a key (used during cache invalidation after batch flush).
     */
    public synchronized void delete(String key) {
        store.remove(key);
    }

    /** Number of entries currently in the store (including potentially expired). */
    public synchronized int size() {
        return store.size();
    }

    /**
     * Return stats for the /metrics endpoint.
     */
    public synchronized Map<String, Object> getStats() {
        return Map.of(
                "name",    name,
                "entries", store.size(),
                "hits",    hitCount,
                "misses",  missCount
        );
    }

    public String getName() { return name; }
}
