/**
 * useDebounce.js
 *
 * Custom hook that debounces a value by a given delay.
 *
 * WHY debounce (viva explanation):
 * - Without debounce: every keystroke fires an API call
 *   Typing "iphone" (6 chars) = 6 API calls
 * - With 300ms debounce: only fires when user pauses for 300ms
 *   "iphone" typed quickly = 1 API call
 * - Reduces backend load dramatically
 * - Avoids race conditions from out-of-order responses
 */

import { useState, useEffect } from 'react';

/**
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default 300ms)
 * @returns {any} - The debounced value
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timer to update debouncedValue after delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: cancel the timer if value changes before delay elapses
    // This is the core of debouncing — we keep resetting the timer
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
