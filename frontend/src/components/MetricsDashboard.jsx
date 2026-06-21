import React, { useState, useEffect } from 'react';
import { fetchMetrics } from '../api/client';

const POLL_MS = 1000;

/* one stat tile */
function Stat({ label, value, sub, accent = '#C4532A' }) {
  return (
    <div className="card metric-card">
      <span className="text-xs text-muted font-medium uppercase tracking-wide">{label}</span>
      <span className="text-xl font-bold" style={{ color: accent }}>{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  );
}

/* hit / miss bar */
function HitBar({ hitRate, missRate }) {
  const hit  = parseFloat(hitRate)  || 0;
  const miss = parseFloat(missRate) || 0;
  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-ink">Cache Performance</span>
        <div className="flex gap-3 text-xs text-muted">
          <span style={{ color: '#7A9B6A' }}>● Hit {hitRate}</span>
          <span style={{ color: '#C4532A' }}>● Miss {missRate}</span>
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden flex bg-cream-300">
        <div className="h-full transition-all duration-700" style={{ width: `${hit}%`, backgroundColor: '#7A9B6A' }} />
        <div className="h-full transition-all duration-700" style={{ width: `${miss}%`, backgroundColor: '#C4532A' }} />
      </div>
      <p className="text-xs text-muted mt-1.5">More hits = fewer DB reads = lower latency</p>
    </div>
  );
}

/* one cache node row — 4-column grid: dot+name | hits | misses | entries */
function StatCell({ value, label, color }) {
  return (
    <div className="flex flex-col items-center min-w-[52px]">
      <span className="text-sm font-bold font-mono leading-tight" style={{ color }}>{value}</span>
      <span className="text-xs text-muted leading-tight">{label}</span>
    </div>
  );
}

function NodeRow({ node }) {
  return (
    <div
      className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-cream-200 transition-colors"
      style={{ borderBottom: '1px solid #EDE8DF' }}
    >
      {/* left: dot + name */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#4AACA8' }} />
        <span className="text-sm font-medium text-ink truncate">{node.name}</span>
      </div>

      {/* right: three stat cells */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <StatCell value={node.hits}    label="hits"    color="#7A9B6A" />
        <StatCell value={node.misses}  label="misses"  color="#C4532A" />
        <StatCell value={node.entries} label="entries" color="#2C2825" />
      </div>
    </div>
  );
}

export default function MetricsDashboard() {
  const [m, setM]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try { const d = await fetchMetrics(); setM(d); }
      catch {}
      finally { setLoading(false); }
    }
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, []);

  if (loading || !m) {
    return (
      <div className="card p-6 flex items-center justify-center">
        <div className="loading-dots text-cream-400"><span>•</span><span>•</span><span>•</span></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Live Metrics</h2>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sage" />
          <span className="text-xs text-muted">refresh 1s</span>
        </div>
      </div>

      <HitBar hitRate={m.cacheHitRate} missRate={m.cacheMissRate} />

      {/* stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Cache Hits"    value={m.cacheHits.toLocaleString()}  sub="from memory"      accent="#7A9B6A" />
        <Stat label="Cache Misses"  value={m.cacheMisses.toLocaleString()} sub="DB fallback"     accent="#C4532A" />
        <Stat label="DB Reads"      value={m.dbReads.toLocaleString()}     sub="MongoDB queries" accent="#4AACA8" />
        <Stat label="DB Writes"     value={m.dbWrites.toLocaleString()}    sub="Bulk upserts"    accent="#1E2D4E" />
        <Stat label="Writes Saved"  value={m.batchWritesSaved.toLocaleString()} sub="By buffer"  accent="#7A9B6A" />
        <Stat label="p95 Latency"   value={`${m.p95LatencyMs}ms`}         sub="95th percentile" accent="#C4532A" />
      </div>

      {/* batch buffer */}
      {m.batchBuffer && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-ink">Write Buffer</span>
            <span className="tag tag-navy">{m.batchBuffer.bufferedQueries} queued</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted">
            <span>Flush interval: <span className="text-ink">{m.batchBuffer.flushIntervalMs / 1000}s</span></span>
            <span>Size trigger: <span className="text-ink">{m.batchBuffer.flushSizeLimit}</span></span>
          </div>
          <div className="divider my-3" />
          <p className="text-xs text-muted leading-relaxed">
            <span className="text-terra font-medium">Tradeoff —</span> buffered writes are lost on crash.
            Production systems use Kafka or a WAL before the buffer.
          </p>
        </div>
      )}

      {/* cache nodes */}
      {m.cacheNodes && (
        <div className="card p-4">
          <p className="text-sm font-semibold text-ink mb-3">Cache Node Distribution</p>
          <div>
            {m.cacheNodes.map(n => <NodeRow key={n.name} node={n} />)}
          </div>
          <div className="divider my-3" />
          <p className="text-xs text-muted leading-relaxed">
            Consistent hashing routes each prefix to exactly one node via clockwise ring lookup
            (150 virtual nodes per physical node).
          </p>
        </div>
      )}
    </div>
  );
}
