import { useMemo } from 'react'

interface UseResponsiveLayoutOptions {
  containerWidth: number
  leftWidth: number
  hasEditor: boolean
  breakpoint?: number
}

export function useResponsiveLayout({
  containerWidth,
  leftWidth,
  hasEditor,
  breakpoint = 800,
}: UseResponsiveLayoutOptions) {
  return useMemo(() => {
    const effectiveWidth = hasEditor
      ? (containerWidth * leftWidth) / 100
      : containerWidth
    const isNarrow = effectiveWidth < breakpoint

    return {
      isNarrow,
      effectiveWidth,
      tabsGridClass: isNarrow ? 'grid-cols-1 gap-1' : 'grid-cols-3',
      statsGridClass: isNarrow ? 'grid-cols-2' : 'md:grid-cols-4',
      tabTriggerClass: isNarrow ? 'justify-start' : '',
      getTabLabel: (full: string, short: string) => (isNarrow ? short : full),
    }
  }, [containerWidth, leftWidth, hasEditor, breakpoint])
}
