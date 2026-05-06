import { useCallback, useEffect, useState } from 'react'

const MOBILE_BREAKPOINT = '(max-width: 768px)'
const TABLET_BREAKPOINT = '(max-width: 1024px)'

/**
 * A custom React hook that listens to media query changes.
 *
 * This hook allows components to respond to changes in media queries, such as
 * screen size or orientation. It's particularly useful for creating responsive
 * designs or implementing different layouts based on device capabilities.
 *
 * @param {string} query - A valid media query string (e.g., "(max-width: 600px)")
 * @returns {boolean} - Returns true if the media query matches, false otherwise
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)');
 *
 * if (isMobile) {
 *   // Render mobile layout
 * } else {
 *   // Render desktop layout
 * }
 */
export function useMediaQuery(query: string): boolean {
  const getMatches = useCallback((query: string): boolean => {
    // Prevent SSR issues
    if (typeof window === 'undefined') {
      return false
    }
    return window.matchMedia(query).matches
  }, [])

  const [matches, setMatches] = useState<boolean>(() => getMatches(query))

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)

    const handleChange = () => setMatches(mediaQuery.matches)

    // Set initial state
    handleChange()

    // Use modern event listener methods
    mediaQuery.addEventListener('change', handleChange)

    // Clean up
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [query, getMatches])

  return matches
}

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_BREAKPOINT)
}

export function useIsTablet(): boolean {
  return useMediaQuery(TABLET_BREAKPOINT)
}
