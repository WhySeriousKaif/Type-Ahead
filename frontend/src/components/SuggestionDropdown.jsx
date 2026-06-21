import React from 'react';

function HighlightMatch({ text, prefix }) {
  if (!prefix || !text.toLowerCase().startsWith(prefix.toLowerCase())) {
    return <span>{text}</span>;
  }
  const len = prefix.length;
  return (
    <span>
      <span className="text-terra font-semibold">{text.slice(0, len)}</span>
      <span className="text-ink">{text.slice(len)}</span>
    </span>
  );
}

function fmtCount(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

export default function SuggestionDropdown({ suggestions, prefix, activeIndex, onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-1 card overflow-hidden z-50 animate-dropdown shadow-md">
      {/* header */}
      <div className="px-4 py-2 flex items-center justify-between" style={{ borderBottom: '1.5px solid #E0D8CC' }}>
        <span className="text-xs text-muted font-medium tracking-wide uppercase">Suggestions</span>
        <span className="text-xs text-cream-500">{suggestions.length} results</span>
      </div>

      <ul>
        {suggestions.map((item, idx) => (
          <li
            key={item.query}
            className={`suggestion-item group ${idx === activeIndex ? 'active' : ''}`}
            onMouseDown={() => onSelect(item.query)}
          >
            {/* search icon */}
            <svg className="w-4 h-4 text-cream-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>

            <span className="flex-1 text-sm">
              <HighlightMatch text={item.query} prefix={prefix} />
            </span>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {item.recentCount > 0 && (
                <span className="tag tag-terra">🔥 {fmtCount(item.recentCount)}</span>
              )}
              <span className="text-xs text-muted">{fmtCount(item.count)}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="px-4 py-2 flex gap-4" style={{ borderTop: '1.5px solid #E0D8CC' }}>
        {['↑↓ navigate', '↵ select', 'esc close'].map(hint => (
          <span key={hint} className="text-xs text-cream-500">{hint}</span>
        ))}
      </div>
    </div>
  );
}
