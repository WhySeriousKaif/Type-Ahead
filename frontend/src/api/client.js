/**
 * api/client.js
 *
 * Centralized API client — all backend calls go through here.
 * Using native fetch (available in all modern browsers).
 */

const BASE_URL = '/api';

/**
 * Get suggestions for a prefix
 * @param {string} prefix
 */
export async function fetchSuggestions(prefix) {
  const res = await fetch(`${BASE_URL}/suggest?q=${encodeURIComponent(prefix)}`);
  if (!res.ok) throw new Error('Failed to fetch suggestions');
  return res.json();
}

/**
 * Submit a search query
 * @param {string} query
 */
export async function submitSearch(query) {
  const res = await fetch(`${BASE_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error('Search submission failed');
  return res.json();
}

/**
 * Get trending searches
 */
export async function fetchTrending() {
  const res = await fetch(`${BASE_URL}/trending`);
  if (!res.ok) throw new Error('Failed to fetch trending');
  return res.json();
}

/**
 * Get cache debug info for a prefix
 * @param {string} prefix
 */
export async function fetchCacheDebug(prefix) {
  const res = await fetch(`${BASE_URL}/cache/debug?prefix=${encodeURIComponent(prefix)}`);
  if (!res.ok) throw new Error('Failed to fetch cache debug');
  return res.json();
}

/**
 * Get system metrics
 */
export async function fetchMetrics() {
  const res = await fetch(`${BASE_URL}/metrics`);
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
}
