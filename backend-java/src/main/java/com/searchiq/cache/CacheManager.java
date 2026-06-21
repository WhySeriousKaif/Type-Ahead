package com.searchiq.cache;

import com.searchiq.hashing.ConsistentHashRing;
import com.searchiq.metrics.MetricsService;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * CacheManager — routes cache reads/writes to the correct CacheNode
 * using the ConsistentHashRing.
 *
 * Manages 3 physical cache nodes:
 *   CacheNodeA, CacheNodeB, CacheNodeC
 *
 * Flow for any prefix (e.g. "iph"):
 *   1. Hash "iph" → ring position
 *   2. Ring lookup → find clockwise node (e.g. CacheNodeB)
 *   3. Delegate get/set/delete to CacheNodeB
 *
 * WHY this matters:
 * - All requests for "iph" ALWAYS go to the same node
 * - Removing one node only displaces ~33% of cached prefixes
 */
@Service
public class CacheManager {

    @Value("${searchiq.cache.ttl-ms:300000}")
    private long cacheTtlMs;

    private final ConsistentHashRing ring;
    private final MetricsService     metrics;

    private Map<String, CacheNode> nodes;

    public CacheManager(ConsistentHashRing ring, MetricsService metrics) {
        this.ring    = ring;
        this.metrics = metrics;
    }

    /**
     * @PostConstruct runs after Spring injects all dependencies.
     * Creates 3 CacheNode instances and registers them on the ring.
     */
    @PostConstruct
    public void init() {
        nodes = Map.of(
                "CacheNodeA", new CacheNode("CacheNodeA", cacheTtlMs),
                "CacheNodeB", new CacheNode("CacheNodeB", cacheTtlMs),
                "CacheNodeC", new CacheNode("CacheNodeC", cacheTtlMs)
        );
        ring.addNode("CacheNodeA");
        ring.addNode("CacheNodeB");
        ring.addNode("CacheNodeC");
        System.out.println("[CACHE MANAGER] Initialized 3 nodes with TTL=" + cacheTtlMs + "ms");
    }

    /**
     * Get suggestions from cache for a prefix.
     * @return null on miss
     */
    public List<Map<String, Object>> get(String prefix) {
        String lowerPrefix = prefix.toLowerCase();
        ConsistentHashRing.RingLookupResult lookup = ring.getNode(lowerPrefix);
        CacheNode node   = nodes.get(lookup.nodeName());
        List<Map<String, Object>> result = node.get(lowerPrefix);

        if (result != null) {
            metrics.incrementHit();
            System.out.printf("[CACHE HIT]  prefix=\"%s\" → node=%s hash=%d%n",
                    prefix, lookup.nodeName(), lookup.hashValue());
        } else {
            metrics.incrementMiss();
            System.out.printf("[CACHE MISS] prefix=\"%s\" → node=%s hash=%d%n",
                    prefix, lookup.nodeName(), lookup.hashValue());
        }

        return result;
    }

    /**
     * Store results in the correct cache node for this prefix.
     */
    public void set(String prefix, List<Map<String, Object>> suggestions) {
        String lowerPrefix = prefix.toLowerCase();
        ConsistentHashRing.RingLookupResult lookup = ring.getNode(lowerPrefix);
        CacheNode node = nodes.get(lookup.nodeName());
        node.set(lowerPrefix, suggestions);
        System.out.printf("[CACHE SET]  prefix=\"%s\" → node=%s entries=%d%n",
                prefix, lookup.nodeName(), node.size());
    }

    /**
     * Invalidate a prefix (called after batch flush changes a query's count).
     */
    public void invalidate(String prefix) {
        String lowerPrefix = prefix.toLowerCase();
        ConsistentHashRing.RingLookupResult lookup = ring.getNode(lowerPrefix);
        CacheNode node = nodes.get(lookup.nodeName());
        node.delete(lowerPrefix);
        System.out.printf("[CACHE INVALIDATE] prefix=\"%s\" → node=%s%n",
                prefix, lookup.nodeName());
    }

    /**
     * Debug info for the /cache/debug?prefix= endpoint.
     */
    public Map<String, Object> debug(String prefix) {
        String lowerPrefix = prefix.toLowerCase();
        ConsistentHashRing.RingLookupResult lookup = ring.getNode(lowerPrefix);
        CacheNode node   = nodes.get(lookup.nodeName());
        List<Map<String, Object>> cached = node.peek(lowerPrefix);

        return Map.of(
                "prefix",            prefix,
                "assignedNode",      lookup.nodeName(),
                "hashValue",         lookup.hashValue(),
                "hit",               cached != null,
                "cachedResultCount", cached != null ? cached.size() : 0,
                "nodeStats",         node.getStats()
        );
    }

    /** All node stats for the /metrics endpoint. */
    public List<Map<String, Object>> getAllNodeStats() {
        return nodes.values().stream()
                .map(CacheNode::getStats)
                .toList();
    }

    /** Ring distribution for debug panel. */
    public Map<String, Object> getRingStats() {
        return Map.of(
                "totalVirtualNodes", ring.getTotalVirtualNodes(),
                "distribution",      ring.getDistribution()
        );
    }
}
