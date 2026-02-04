'use client';

import { useState, useEffect } from 'react';

/**
 * React hook for responsive media query matching
 * @param query - CSS media query string (e.g., '(min-width: 768px)')
 * @returns Whether the media query currently matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      const media = window.matchMedia(query);
      return media?.matches ?? false;
    }
    return false;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    
    const updateMatch = () => {
      setMatches(media.matches);
    };
    
    updateMatch();
    
    media.addEventListener('change', updateMatch);
    
    return () => {
      media.removeEventListener('change', updateMatch);
    };
  }, [query]);

  return matches;
}
