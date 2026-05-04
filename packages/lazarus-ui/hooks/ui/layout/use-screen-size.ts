import { useEffect, useState } from 'react'

import { useIsMounted } from '@/hooks/utils/use-is-mounted'

type ScreenSize = {
  isLargeScreen: boolean
  width: number | null
  height: number | null
}

export const useScreenSize = (
  breakpoint: number = 1024,
): ScreenSize & { isMounted: boolean } => {
  const isMounted = useIsMounted()
  const [screenSize, setScreenSize] = useState<ScreenSize>({
    isLargeScreen: true, // Default to desktop during SSR
    width: null,
    height: null,
  })

  useEffect(() => {
    if (!isMounted) return

    const handleResize = () => {
      setScreenSize({
        isLargeScreen: window.innerWidth >= breakpoint,
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    // Initial check
    handleResize()

    // Add event listener
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => window.removeEventListener('resize', handleResize)
  }, [breakpoint, isMounted])

  return {
    ...screenSize,
    isMounted,
  }
}
