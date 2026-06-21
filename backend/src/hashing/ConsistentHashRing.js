/**
 * ConsistentHashRing.js
 *
 * WHY: Normal hash(key) % N routing means if a cache node is added/removed,
 * almost EVERY key changes node. That destroys the cache.
 *
 * Consistent Hashing solves this:
 * - Nodes are placed on a virtual ring (0 to 2^32)
 * - A key is hashed → placed on ring → walks CLOCKWISE to find its node
 * - If a node is removed, only keys between it and the previous node move
 *
 * This means only ~K/N keys are remapped (where K=keys, N=nodes).
 */

import crypto from 'crypto';

class ConsistentHashRing {
  /**
   * @param {string[]} nodes - Array of node names e.g. ['CacheNodeA','CacheNodeB','CacheNodeC']
   * @param {number} virtualNodes - Virtual replicas per physical node (more = better distribution)
   */
  constructor(nodes = [], virtualNodes = 150) {
    this.virtualNodes = virtualNodes;
    // ring: Map<hashPosition, nodeName>
    this.ring = new Map();
    // sorted array of hash positions for binary-search-style clockwise lookup
    this.sortedKeys = [];

    nodes.forEach(node => this.addNode(node));
  }

  /**
   * Hash a string key to a position on the ring (0 to 2^32 - 1)
   */
  _hash(key) {
    return parseInt(crypto.createHash('md5').update(key).digest('hex').slice(0, 8), 16);
  }

  /**
   * Add a physical node with its virtual replicas onto the ring
   */
  addNode(nodeName) {
    for (let i = 0; i < this.virtualNodes; i++) {
      const virtualKey = `${nodeName}#VN${i}`;
      const position = this._hash(virtualKey);
      this.ring.set(position, nodeName);
      this.sortedKeys.push(position);
    }
    this.sortedKeys.sort((a, b) => a - b);
  }

  /**
   * Remove a physical node (and all its virtual replicas) from the ring
   */
  removeNode(nodeName) {
    for (let i = 0; i < this.virtualNodes; i++) {
      const virtualKey = `${nodeName}#VN${i}`;
      const position = this._hash(virtualKey);
      this.ring.delete(position);
      const idx = this.sortedKeys.indexOf(position);
      if (idx !== -1) this.sortedKeys.splice(idx, 1);
    }
  }

  /**
   * Get the node responsible for a given key.
   * 1. Hash the key to get position
   * 2. Walk CLOCKWISE to find first node position >= key position
   * 3. If none found (key is past the last node), wrap around to first node
   */
  getNode(key) {
    if (this.sortedKeys.length === 0) {
      throw new Error('Hash ring is empty — no cache nodes registered');
    }

    const hashValue = this._hash(key);

    // Binary search: find first position >= hashValue
    let lo = 0, hi = this.sortedKeys.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.sortedKeys[mid] < hashValue) lo = mid + 1;
      else hi = mid;
    }

    // Wrap around if past the last position
    const position = this.sortedKeys[lo % this.sortedKeys.length];
    const nodeName = this.ring.get(position);

    return { nodeName, hashValue };
  }

  /**
   * Debug: show ring stats
   */
  getStats() {
    const distribution = {};
    for (const nodeName of this.ring.values()) {
      distribution[nodeName] = (distribution[nodeName] || 0) + 1;
    }
    return { totalVirtualNodes: this.sortedKeys.length, distribution };
  }
}

export default ConsistentHashRing;
