import React, { useState, useEffect } from 'react';
import { fetchTrending } from '../api/client';

const POLL_MS = 30000;

function fmtCount(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

/* small coloured rank pill */
const RANK_COLORS = [
  'bg-terra text-cream-50',
  'bg-navy text-cream-50',
  'bg-sage text-cream-50',
];

function RankPill({ rank }) {
  const cls = RANK_COLORS[rank - 1] || 'bg-cream-400 text-muted';
  return (
    <span className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full flex-shrink-0 ${cls}`}>
      {rank}
    </span>
  );
}

export default function TrendingSection({ onQueryClick }) {
  const [trending, setTrending]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [error, setError]         = useState(null);

  const maxScore = trending[0]?.score || 1;

  async function load() {
    try {
      const d = await fetchTrending();
      setTrending(d.trending || []);
      setUpdatedAt(new Date());
      setError(null);
    } catch { setError('Failed to load'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="card p-5">
      {/* header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Trending Searches</h2>
          <p className="text-xs text-muted mt-0.5">
            score = all‑time count + recent × 10
          </p>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="w-2 h-2 rounded-full bg-terra" />
          {updatedAt && (
            <span className="text-xs text-muted">{updatedAt.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      <div className="divider mb-4" />

      {loading ? (
        <div className="flex items-center gap-1 py-6 justify-center">
          <div className="loading-dots text-cream-400">
            <span>•</span><span>•</span><span>•</span>
          </div>
        </div>
      ) : error ? (
        <p className="text-sm text-terra text-center py-6">{error}</p>
      ) : trending.length === 0 ? (
        <p className="text-sm text-muted text-center py-6">No trending data yet. Try some searches.</p>
      ) : (
        <ul className="space-y-2">
          {trending.map((item, idx) => {
            const barPct = Math.min((item.score / maxScore) * 100, 100);
            return (
              <li
                key={item.query}
                onClick={() => onQueryClick?.(item.query)}
                className="group cursor-pointer rounded-lg px-3 py-2.5 hover:bg-cream-200 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <RankPill rank={idx + 1} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-ink font-medium truncate group-hover:text-terra transition-colors">
                        {item.query}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.recentCount > 0 && (
                          <span className="tag tag-terra">+{fmtCount(item.recentCount)}</span>
                        )}
                        <span className="text-xs text-muted font-mono">{fmtCount(item.score)}</span>
                      </div>
                    </div>
                    {/* score bar */}
                    <div className="h-0.5 bg-cream-300 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bar-fill"
                        style={{ width: `${barPct}%`, backgroundColor: '#C4532A' }}
                      />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="divider mt-4 mb-3" />
      <p className="text-xs text-muted leading-relaxed">
        A viral query searched 500× in the past hour gets +5,000 to its score — enough to
        temporarily outrank older high‑count queries. The boost fades as the 1‑hour window slides.
      </p>
    </div>
  );
}
