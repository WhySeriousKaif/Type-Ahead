/**
 * CacheManager.js
 *
 * Orchestrates 3 logical cache nodes using the ConsistentHashRing.
 *
 * WHY 3 nodes:
 * - Simulates a distributed cache cluster (like Redis Cluster)
 * - Each node independently stores a portion of the keyspace
 * - Prefix → hashed → ring → routed to 1 of 3 nodes
 */

import ConsistentHashRing from '../hashing/ConsistentHashRing.js';
import CacheNode from './CacheNode.js';
import { incrementHit, incrementMiss } from '../metrics.js';

const NODE_NAMES = ['CacheNodeA', 'CacheNodeB', 'CacheNodeC'];
const TTL_MS = parseInt(process.env.CACHE_TTL_MS) || 300000; // default 5 min

// Instantiate 3 physical cache nodes
const nodes = {
  CacheNodeA: new CacheNode('CacheNodeA', TTL_MS),
  CacheNodeB: new CacheNode('CacheNodeB', TTL_MS),
  CacheNodeC: new CacheNode('CacheNodeC', TTL_MS),
};

// Build the ring with all 3 nodes
const ring = new ConsistentHashRing(NODE_NAMES, 150);

/**
 * Given a prefix string, resolve which node owns it via consistent hashing
 */
function resolveNode(prefix) {
  const { nodeName, hashValue } = ring.getNode(prefix.toLowerCase());
  return { node: nodes[nodeName], nodeName, hashValue };
}

/**
 * Get suggestions from the cache for a prefix.
 * Returns null on miss (caller should fetch from DB).
 */
export function get(prefix) {
  const { node, nodeName, hashValue } = resolveNode(prefix);
  const result = node.get(prefix.toLowerCase());

  if (result !== null) {
    incrementHit();
    console.log(`[CACHE HIT]  prefix="${prefix}" → node=${nodeName} hash=${hashValue}`);
  } else {
    incrementMiss();
    console.log(`[CACHE MISS] prefix="${prefix}" → node=${nodeName} hash=${hashValue}`);
  }

  return result;
}

/**
 * Store suggestions in the correct cache node for this prefix.
 */
export function set(prefix, suggestions) {
  const { node, nodeName, hashValue } = resolveNode(prefix);
  node.set(prefix.toLowerCase(), suggestions);
  console.log(`[CACHE SET]  prefix="${prefix}" → node=${nodeName} hash=${hashValue} entries=${node.size()}`);
}

/**
 * Invalidate a prefix from its node
 */
export function invalidate(prefix) {
  const { node, nodeName } = resolveNode(prefix);
  node.delete(prefix.toLowerCase());
  console.log(`[CACHE INVALIDATE] prefix="${prefix}" → node=${nodeName}`);
}

/**
 * Debug endpoint data — for the /cache/debug API
 */
export function debug(prefix) {
  const { node, nodeName, hashValue } = resolveNode(prefix);
  const lowerPrefix = prefix.toLowerCase();
  const cached = node.get(lowerPrefix);

  return {
    prefix,
    assignedNode: nodeName,
    hashValue,
    hit: cached !== null,
    cachedResultCount: cached ? cached.length : 0,
    nodeStats: nodes[nodeName].getStats(),
  };
}

/**
 * All node stats — for /metrics endpoint
 */
export function getAllNodeStats() {
  return NODE_NAMES.map(name => nodes[name].getStats());
}

/**
 * Ring distribution stats
 */
export function getRingStats() {
  return ring.getStats();
}
