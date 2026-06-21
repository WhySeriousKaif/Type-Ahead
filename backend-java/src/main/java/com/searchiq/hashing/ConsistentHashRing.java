package com.searchiq.hashing;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;

/**
 * ConsistentHashRing — distributes cache keys across multiple nodes.
 *
 * WHY consistent hashing (and not key % N):
 * - Normal modulo: adding/removing a node remaps ~all keys → cache wipe
 * - Consistent hashing: removing 1 of 3 nodes remaps only ~33% of keys
 *
 * HOW it works:
 * - Imagine a ring (clock face) from 0 to 2^32
 * - Each physical node gets VIRTUAL_NODES "virtual copies" placed on the ring
 * - A key is hashed → position on ring → walk clockwise → find first node
 * - If that node is removed, only keys between it and its predecessor move
 *
 * VIRTUAL NODES:
 * - Without them, 3 nodes on a ring of 2^32 positions would cluster unevenly
 * - 150 virtual nodes per physical node = even distribution (~33% each)
 */
@Component
public class ConsistentHashRing {

    private static final int VIRTUAL_NODES = 150;

    // Sorted map: ring position → node name (TreeMap keeps positions sorted)
    private final TreeMap<Long, String> ring = new TreeMap<>();

    // List of physical nodes currently on the ring
    private final List<String> nodeNames = new ArrayList<>();

    /**
     * Add a physical node with VIRTUAL_NODES replicas onto the ring.
     */
    public synchronized void addNode(String nodeName) {
        nodeNames.add(nodeName);
        for (int i = 0; i < VIRTUAL_NODES; i++) {
            long position = hash(nodeName + "#VN" + i);
            ring.put(position, nodeName);
        }
        System.out.println("[HASH RING] Added node: " + nodeName
                + " → total virtual nodes: " + ring.size());
    }

    /**
     * Remove a physical node and all its virtual replicas.
     */
    public synchronized void removeNode(String nodeName) {
        nodeNames.remove(nodeName);
        for (int i = 0; i < VIRTUAL_NODES; i++) {
            long position = hash(nodeName + "#VN" + i);
            ring.remove(position);
        }
    }

    /**
     * Get the node responsible for a key.
     *
     * Algorithm:
     * 1. Hash the key to a ring position
     * 2. Find the first entry in the TreeMap with key >= hashValue (clockwise)
     * 3. If none exists (hashValue > all positions), wrap around to ring.firstEntry()
     *
     * @param key the cache key (e.g. prefix "iph")
     * @return RingLookupResult with node name and hash value
     */
    public RingLookupResult getNode(String key) {
        if (ring.isEmpty()) {
            throw new IllegalStateException("Hash ring is empty — no nodes registered");
        }

        long hashValue = hash(key.toLowerCase());

        // Find first entry with position >= hashValue (clockwise walk)
        Map.Entry<Long, String> entry = ring.ceilingEntry(hashValue);

        // If none found (past the last entry), wrap around to first
        if (entry == null) {
            entry = ring.firstEntry();
        }

        return new RingLookupResult(entry.getValue(), hashValue);
    }

    /**
     * Returns distribution stats: how many virtual nodes each physical node has.
     */
    public Map<String, Integer> getDistribution() {
        Map<String, Integer> dist = new LinkedHashMap<>();
        for (String name : nodeNames) {
            dist.put(name, 0);
        }
        for (String nodeName : ring.values()) {
            dist.merge(nodeName, 1, Integer::sum);
        }
        return dist;
    }

    public int getTotalVirtualNodes() {
        return ring.size();
    }

    /**
     * MD5-based hash → unsigned 32-bit long.
     * Uses only the first 8 hex chars of the MD5 digest (same as Node.js implementation).
     */
    private long hash(String key) {
        try {
            MessageDigest md5 = MessageDigest.getInstance("MD5");
            byte[] digest = md5.digest(key.getBytes(StandardCharsets.UTF_8));
            // Take first 4 bytes and treat as unsigned 32-bit integer
            long result = 0;
            for (int i = 0; i < 4; i++) {
                result = (result << 8) | (digest[i] & 0xFF);
            }
            return result;
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("MD5 not available", e);
        }
    }

    /**
     * Result of a ring lookup.
     */
    public record RingLookupResult(String nodeName, long hashValue) {}
}
