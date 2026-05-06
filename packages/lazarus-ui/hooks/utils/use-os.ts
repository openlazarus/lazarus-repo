import { useMemo } from 'react'

/**
 * Represents the possible operating systems that can be detected.
 */
type OperatingSystem =
  | 'MacOS'
  | 'Windows'
  | 'Linux'
  | 'iOS'
  | 'Android'
  | 'Unknown'

/**
 * A custom React hook that detects the user's operating system.
 *
 * This hook uses `navigator.userAgent` and `navigator.appVersion` to determine
 * the user's operating system more accurately.
 *
 * @returns {OperatingSystem} The detected operating system.
 *
 * @example
 * const MyComponent = () => {
 *   const os = useOperatingSystem();
 *   return <div>Your OS is: {os}</div>;
 * };
 */
export function useOperatingSystem(): OperatingSystem {
  return useMemo(() => {
    if (typeof window === 'undefined') {
      return 'Unknown'
    }

    const userAgent = window.navigator.userAgent.toLowerCase()
    const appVersion = window.navigator.appVersion.toLowerCase()

    if (/macintosh|mac os x/i.test(userAgent)) return 'MacOS'
    if (/windows|win32/i.test(userAgent)) return 'Windows'
    if (/linux/i.test(userAgent)) return 'Linux'
    if (/iphone|ipad|ipod/i.test(userAgent)) return 'iOS'
    if (/android/i.test(userAgent)) return 'Android'

    // Additional checks for edge cases
    if (/macintosh|mac os x/i.test(appVersion)) return 'MacOS'
    if (/windows|win32/i.test(appVersion)) return 'Windows'

    return 'Unknown'
  }, [])
}
