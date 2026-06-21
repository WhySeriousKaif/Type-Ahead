/**
 * suggestController.js
 * Handles GET /suggest?q=<prefix>
 */

import { getSuggestions } from '../services/suggestionService.js';

export async function suggest(req, res) {
  const prefix = req.query.q || '';

  if (!prefix.trim()) {
    return res.json({ suggestions: [], source: 'empty-input' });
  }

  try {
    const suggestions = await getSuggestions(prefix.trim());
    res.json({ suggestions, prefix: prefix.trim() });
  } catch (err) {
    console.error('[SUGGEST CONTROLLER]', err.message);
    res.status(500).json({ error: 'Failed to fetch suggestions', suggestions: [] });
  }
}
