import { useCallback, useEffect, useMemo, useState } from 'react'

import { calculatePresentationDiff } from '../utils/diff-calculator'

import type { PresentationData } from '../types'
import type {
  ChangeType,
  DiffNavigationState,
  DiffStatistics,
  DiffTimelineEntry,
  DiffViewState,
} from '../types/diff'

interface UsePresentationDiffProps {
  originalData: PresentationData | null
  modifiedData: PresentationData | null
  onChangeNavigate?: (entry: DiffTimelineEntry) => void
}

export function usePresentationDiff({
  originalData,
  modifiedData,
  onChangeNavigate,
}: UsePresentationDiffProps) {
  // Diff calculation
  const diff = useMemo(() => {
    if (!originalData || !modifiedData) return null
    return calculatePresentationDiff(originalData, modifiedData)
  }, [originalData, modifiedData])

  // View state
  const [viewState, setViewState] = useState<DiffViewState>({
    showDiff: false,
    currentChangeIndex: 0,
    filteredTypes: ['content', 'style', 'layout', 'metadata', 'reorder'],
    viewMode: 'timeline',
    highlightedChanges: new Set(),
  })

  // Navigation state
  const [navState, setNavState] = useState<DiffNavigationState>({
    isPlaying: false,
    playbackSpeed: 1,
    currentTimestamp: 0,
  })

  // Filtered timeline based on selected change types
  const filteredTimeline = useMemo(() => {
    if (!diff) return []
    return diff.timeline.filter((entry) =>
      viewState.filteredTypes.includes(entry.change.changeType),
    )
  }, [diff, viewState.filteredTypes])

  // Statistics
  const statistics = useMemo((): DiffStatistics | null => {
    if (!diff) return null

    const stats: DiffStatistics = {
      slidesAdded: 0,
      slidesRemoved: 0,
      slidesModified: 0,
      slidesReordered: 0,
      contentChanges: 0,
      styleChanges: 0,
      layoutChanges: 0,
      metadataChanges: 0,
    }

    diff.slides.forEach((slide) => {
      switch (slide.type) {
        case 'added':
          stats.slidesAdded++
          break
        case 'removed':
          stats.slidesRemoved++
          break
        case 'modified':
          stats.slidesModified++
          break
        case 'reordered':
          stats.slidesReordered++
          break
      }
    })

    Object.entries(diff.changesByType).forEach(([type, count]) => {
      switch (type as ChangeType) {
        case 'content':
          stats.contentChanges = count
          break
        case 'style':
          stats.styleChanges = count
          break
        case 'layout':
          stats.layoutChanges = count
          break
        case 'metadata':
          stats.metadataChanges = count
          break
      }
    })

    return stats
  }, [diff])

  // Toggle diff view
  const toggleDiff = useCallback(() => {
    setViewState((prev) => ({ ...prev, showDiff: !prev.showDiff }))
  }, [])

  // Set view mode
  const setViewMode = useCallback((mode: DiffViewState['viewMode']) => {
    setViewState((prev) => ({ ...prev, viewMode: mode }))
  }, [])

  // Filter change types
  const toggleChangeType = useCallback((type: ChangeType) => {
    setViewState((prev) => {
      const newTypes = new Set(prev.filteredTypes)
      if (newTypes.has(type)) {
        newTypes.delete(type)
      } else {
        newTypes.add(type)
      }
      return { ...prev, filteredTypes: Array.from(newTypes) }
    })
  }, [])

  // Navigate to specific change
  const navigateToChange = useCallback(
    (index: number) => {
      if (!filteredTimeline.length) return

      const clampedIndex = Math.max(
        0,
        Math.min(index, filteredTimeline.length - 1),
      )
      setViewState((prev) => ({ ...prev, currentChangeIndex: clampedIndex }))

      const entry = filteredTimeline[clampedIndex]
      if (entry && onChangeNavigate) {
        onChangeNavigate(entry)
      }
    },
    [filteredTimeline, onChangeNavigate],
  )

  // Navigate to next/previous change
  const navigateNext = useCallback(() => {
    navigateToChange(viewState.currentChangeIndex + 1)
  }, [viewState.currentChangeIndex, navigateToChange])

  const navigatePrevious = useCallback(() => {
    navigateToChange(viewState.currentChangeIndex - 1)
  }, [viewState.currentChangeIndex, navigateToChange])

  // Jump to specific slide's changes
  const jumpToSlide = useCallback(
    (slideIndex: number) => {
      const changeIndex = filteredTimeline.findIndex(
        (entry) => entry.slideIndex === slideIndex,
      )
      if (changeIndex !== -1) {
        navigateToChange(changeIndex)
      }
    },
    [filteredTimeline, navigateToChange],
  )

  // Highlight specific changes
  const highlightChange = useCallback((changeId: string) => {
    setViewState((prev) => {
      const newHighlights = new Set(prev.highlightedChanges)
      newHighlights.add(changeId)
      return { ...prev, highlightedChanges: newHighlights }
    })

    // Auto-clear highlight after 2 seconds
    setTimeout(() => {
      setViewState((prev) => {
        const newHighlights = new Set(prev.highlightedChanges)
        newHighlights.delete(changeId)
        return { ...prev, highlightedChanges: newHighlights }
      })
    }, 2000)
  }, [])

  // Playback functionality
  const togglePlayback = useCallback(() => {
    setNavState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }))
  }, [])

  const setPlaybackSpeed = useCallback((speed: number) => {
    setNavState((prev) => ({ ...prev, playbackSpeed: speed }))
  }, [])

  // Auto-advance through changes during playback
  useEffect(() => {
    if (!navState.isPlaying || !filteredTimeline.length) return

    const interval = setInterval(() => {
      setViewState((prev) => {
        const nextIndex = prev.currentChangeIndex + 1
        if (nextIndex >= filteredTimeline.length) {
          setNavState((n) => ({ ...n, isPlaying: false }))
          return prev
        }

        const entry = filteredTimeline[nextIndex]
        if (entry && onChangeNavigate) {
          onChangeNavigate(entry)
        }

        return { ...prev, currentChangeIndex: nextIndex }
      })
    }, 2000 / navState.playbackSpeed) // 2 seconds per change at 1x speed

    return () => clearInterval(interval)
  }, [
    navState.isPlaying,
    navState.playbackSpeed,
    filteredTimeline,
    onChangeNavigate,
  ])

  // Get current change
  const currentChange = useMemo(() => {
    return filteredTimeline[viewState.currentChangeIndex] || null
  }, [filteredTimeline, viewState.currentChangeIndex])

  // Check if a specific slide has changes
  const slideHasChanges = useCallback(
    (slideIndex: number): boolean => {
      if (!diff) return false
      return diff.slides.some(
        (slide) =>
          slide.originalIndex === slideIndex ||
          slide.modifiedIndex === slideIndex,
      )
    },
    [diff],
  )

  // Get changes for a specific slide
  const getSlideChanges = useCallback(
    (slideIndex: number) => {
      if (!diff) return []
      return diff.slides.filter(
        (slide) =>
          slide.originalIndex === slideIndex ||
          slide.modifiedIndex === slideIndex,
      )
    },
    [diff],
  )

  return {
    // Diff data
    diff,
    statistics,
    filteredTimeline,
    currentChange,

    // View state
    viewState,
    toggleDiff,
    setViewMode,
    toggleChangeType,
    highlightChange,

    // Navigation
    navigateToChange,
    navigateNext,
    navigatePrevious,
    jumpToSlide,

    // Playback
    navState,
    togglePlayback,
    setPlaybackSpeed,

    // Utilities
    slideHasChanges,
    getSlideChanges,
  }
}
