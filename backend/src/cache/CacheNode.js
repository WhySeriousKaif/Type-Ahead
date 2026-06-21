/**
 * CacheNode.js
 *
 * Represents a single logical cache node backed by an in-memory JS Map.
 *
 * WHY Map over plain object:
 * - O(1) get/set/delete
 * - Predictable iteration order
 * - No prototype chain collisions
 *
 * TTL (Time To Live):
 * - Each entry stores an expiresAt timestamp
 * - On get(), if expired → delete & return null (lazy eviction)
 * - This avoids expensive periodic scans on large caches
 */

class CacheNode {
  /**
   * @param {string} name - Human-readable node name (e.g. 'CacheNodeA')
   * @param {number} defaultTtlMs - Default TTL in milliseconds
   */
  constructor(name, defaultTtlMs = 300000) {
    this.name = name;
    this.defaultTtlMs = defaultTtlMs;
    // store: Map<key, { value: any, expiresAt: number }>
    this.store = new Map();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get a value from cache.
   * Returns null on miss or if expired (and deletes stale entry).
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.missCount++;
      return null;
    }
    // Lazy TTL eviction
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.missCount++;
      return null;
    }
    this.hitCount++;
    return entry.value;
  }

  /**
   * Set a value in cache with optional custom TTL.
   */
  set(key, value, ttlMs = this.defaultTtlMs) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Explicitly delete a key (cache invalidation on ranking change)
   */
  delete(key) {
    this.store.delete(key);
  }

  /**
   * Number of active (non-expired) entries
   */
  size() {
    return this.store.size;
  }

  /**
   * Stats for monitoring
   */
  getStats() {
    return {
      name: this.name,
      entries: this.store.size,
      hits: this.hitCount,
      misses: this.missCount,
    };
  }
}

export default CacheNode;
