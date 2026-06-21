import React, { useState, useCallback } from 'react';
import SearchBox from './components/SearchBox';
import TrendingSection from './components/TrendingSection';
import MetricsDashboard from './components/MetricsDashboard';
import { fetchCacheDebug } from './api/client';

/* ── Consistent-hash debug panel ── */
function CacheDebugPanel({ data }) {
  if (!data) return null;
  const rows = [
    { label: 'Prefix',         val: `"${data.prefix}"`,           color: '#C4532A' },
    { label: 'Hash value',     val: data.hashValue,                color: '#4AACA8' },
    { label: 'Assigned node',  val: data.assignedNode,             color: '#1E2D4E' },
    { label: 'Cached results', val: `${data.cachedResultCount} suggestions`, color: '#2C2825' },
  ];

  return (
    <div className="card p-5 animate-in">
      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">Hash Routing</span>
          <span className={`tag ${data.hit ? 'tag-sage' : 'tag-terra'}`}>
            {data.hit ? 'CACHE HIT' : 'CACHE MISS'}
          </span>
        </div>
        <span className="text-xs text-muted">consistent hashing</span>
      </div>

      <div className="divider mb-4" />

      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.label} className="flex justify-between items-center py-1.5 px-3 card-inset">
            <span className="text-xs text-muted">{r.label}</span>
            <span className="text-xs font-mono font-semibold" style={{ color: r.color }}>{r.val}</span>
          </div>
        ))}
      </div>

      {/* ring viz */}
      {data.ring && (
        <div className="mt-4">
          <p className="text-xs text-muted mb-2">Virtual node distribution (150 VN each)</p>
          <div className="flex gap-2">
            {Object.entries(data.ring.distribution || {}).map(([node, count]) => {
              const isActive = node === data.assignedNode;
              return (
                <div key={node}
                  className="flex-1 text-center py-2 px-1 rounded-lg text-xs transition-colors"
                  style={{
                    background:   isActive ? '#C4532A' : '#EDE8DF',
                    color:        isActive ? '#FAF7F2' : '#8A7D72',
                    border:       `1.5px solid ${isActive ? '#AE4623' : '#D8D0C4'}`,
                    fontWeight:   isActive ? 700 : 400,
                  }}
                >
                  <div>{node.replace('CacheNode', 'Node ')}</div>
                  <div className="font-mono mt-0.5">{count} VN</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Architecture mini-diagram ── */
function ArchNote({ color, title, steps }) {
  return (
    <div>
      <p className="text-xs font-semibold mb-1.5" style={{ color }}>{title}</p>
      {steps.map((s, i) => (
        <p key={i} className="text-xs text-muted leading-5">
          {i < steps.length - 1 ? '↓' : '→'} {s}
        </p>
      ))}
    </div>
  );
}

/* ── Main app ── */
export default function App() {
  const [cacheDebug, setCacheDebug] = useState(null);

  const handleSearch = useCallback(async (query, typedPrefix) => {
    const prefix = (typedPrefix || (query.length > 3 ? query.slice(0, 3) : query)).trim();
    if (prefix) {
      try { setCacheDebug(await fetchCacheDebug(prefix)); } catch {}
    }
  }, []);

  const handleTrendingClick = useCallback((query) => {
    /* fill the search box by firing a custom event the SearchBox can't hear —
       simplest fix: just trigger the search directly via handleSearch */
    handleSearch(query);
  }, [handleSearch]);

  return (
    <div style={{ backgroundColor: '#F2EDE4', minHeight: '100vh' }}>
      <div className="max-w-6xl mx-auto px-5 py-10">

        {/* ── Header ── */}
        <header className="mb-10">
          <div className="flex items-end gap-4 mb-3">
            {/* wordmark */}
            <h1 className="font-serif text-5xl text-ink" style={{ letterSpacing: '-0.02em' }}>
              search<span style={{ color: '#C4532A' }}>IQ</span>
            </h1>
            {/* pill tags */}
            <div className="flex gap-2 mb-1.5 flex-wrap">
              <span className="tag tag-terra">HLD Assignment</span>
              <span className="tag tag-sage">Consistent Hashing</span>
              <span className="tag tag-teal">Batch Writes</span>
              <span className="tag tag-navy">Trending Engine</span>
            </div>
          </div>
          <p className="text-sm text-muted max-w-lg">
            A search typeahead system built on Node.js, Express, MongoDB Atlas, and
            a three-node in-memory cache distributed via a consistent hash ring.
          </p>
        </header>

        {/* ── Search ── */}
        <div className="mb-8 max-w-2xl">
          <SearchBox onSearch={handleSearch} />
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* left: debug + trending */}
          <div className="lg:col-span-2 space-y-5">
            {cacheDebug
              ? <CacheDebugPanel data={cacheDebug} />
              : (
                <div className="card p-5 text-center text-muted text-sm">
                  Search something to see the consistent hash routing panel
                </div>
              )
            }
            <TrendingSection onQueryClick={handleTrendingClick} />
          </div>

          {/* right: metrics */}
          <div className="lg:col-span-1">
            <MetricsDashboard />
          </div>
        </div>

        {/* ── Architecture row ── */}
        <div className="card p-6 mt-8">
          <h3 className="text-sm font-semibold text-ink mb-4">How it works</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <ArchNote color="#C4532A" title="GET /suggest?q=prefix" steps={[
              'Consistent Hash Ring',
              'CacheNodeA / B / C  (TTL check)',
              'MongoDB on miss',
              'Re-cache result for 5 min',
            ]} />
            <ArchNote color="#1E2D4E" title="POST /search" steps={[
              'In-memory write buffer',
              'Aggregate repeated queries',
              'Flush every 30s or 100 items',
              'MongoDB bulkWrite (upsert)',
            ]} />
            <ArchNote color="#4AACA8" title="GET /trending" steps={[
              'Top 200 from DB',
              'Prune 1-hour timestamps',
              'score = count + recent × 10',
              'Return top 10 by score',
            ]} />
          </div>
        </div>

        {/* footer */}
        <p className="text-xs text-muted text-center mt-8">
          React + Vite · Node.js + Express · MongoDB Atlas · Consistent Hashing · Batch Writer · Trending Score
        </p>

      </div>
    </div>
  );
}
