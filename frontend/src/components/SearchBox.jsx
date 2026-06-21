import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { fetchSuggestions, submitSearch } from '../api/client';
import SuggestionDropdown from './SuggestionDropdown';

export default function SearchBox({ onSearch }) {
  const [inputValue, setInputValue]   = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading]     = useState(false);
  const [isOpen, setIsOpen]           = useState(false);
  const [error, setError]             = useState(null);
  const [lastSearched, setLastSearched] = useState(null);

  const inputRef    = useRef(null);
  const containerRef = useRef(null);
  const debouncedInput = useDebounce(inputValue, 300);

  /* fetch suggestions */
  useEffect(() => {
    if (!debouncedInput.trim()) {
      setSuggestions([]); setIsOpen(false); return;
    }
    let cancelled = false;
    async function load() {
      setIsLoading(true); setError(null);
      try {
        const data = await fetchSuggestions(debouncedInput.trim());
        if (!cancelled) {
          setSuggestions(data.suggestions || []);
          setIsOpen((data.suggestions || []).length > 0);
          setActiveIndex(-1);
        }
      } catch {
        if (!cancelled) { setError('Could not load suggestions'); setSuggestions([]); }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [debouncedInput]);

  /* outside click */
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false); setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleKeyDown(e) {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(p => Math.min(p + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(p => Math.max(p - 1, -1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const q = activeIndex >= 0 ? suggestions[activeIndex]?.query : inputValue.trim();
      if (q) handleSelect(q);
    } else if (e.key === 'Escape') { setIsOpen(false); setActiveIndex(-1); }
  }

  const handleSelect = useCallback(async (query) => {
    const typedPrefix = inputValue.trim();
    setInputValue(query); setIsOpen(false); setActiveIndex(-1);
    try {
      const result = await submitSearch(query);
      setLastSearched({ query, message: result.message });
      onSearch?.(query, typedPrefix);
    } catch { setError('Submission failed'); }
  }, [onSearch, inputValue]);

  const handleChange = (e) => {
    setInputValue(e.target.value);
    if (!e.target.value.trim()) { setLastSearched(null); setError(null); }
  };

  const clearInput = () => {
    setInputValue(''); setSuggestions([]); setIsOpen(false);
    setLastSearched(null); setError(null);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">

      {/* ── Input row ── */}
      <div
        className="card flex items-center gap-3 px-4 py-3"
        style={{ borderRadius: 10, transition: 'border-color 0.15s', borderColor: isOpen ? '#C4532A' : '#E0D8CC' }}
      >
        {/* icon / spinner */}
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
          {isLoading
            ? <div className="w-4 h-4 border-2 border-terra rounded-full border-t-transparent animate-spin" />
            : (
              <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )
          }
        </div>

        <input
          ref={inputRef}
          id="search-input"
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder="Search anything — iphone, python, biryani..."
          className="flex-1 bg-transparent text-ink placeholder-cream-500 text-sm outline-none"
          autoComplete="off"
          spellCheck={false}
        />

        {inputValue && (
          <button onClick={clearInput}
            className="flex-shrink-0 text-cream-500 hover:text-muted transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <button
          id="search-btn"
          onClick={() => inputValue.trim() && handleSelect(inputValue.trim())}
          className="btn-primary flex-shrink-0"
        >
          Search
        </button>
      </div>

      {/* dropdown */}
      {isOpen && (
        <SuggestionDropdown
          suggestions={suggestions}
          prefix={debouncedInput}
          activeIndex={activeIndex}
          onSelect={handleSelect}
        />
      )}

      {/* error */}
      {error && (
        <p className="mt-2 text-sm text-terra animate-in">⚠ {error}</p>
      )}

      {/* confirmation */}
      {lastSearched && (
        <div className="mt-2 card-inset px-4 py-2.5 flex items-center gap-2 animate-in">
          <span className="w-2 h-2 rounded-full bg-sage flex-shrink-0" />
          <p className="text-sm text-ink">
            <span className="font-semibold">"{lastSearched.query}"</span>
            {' '}— {lastSearched.message}. Count queued in write buffer.
          </p>
        </div>
      )}
    </div>
  );
}
