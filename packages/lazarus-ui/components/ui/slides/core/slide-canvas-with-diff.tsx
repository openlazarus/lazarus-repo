'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

import { DiffTimeline } from '../components/diff-timeline'
import { UnifiedDiffRenderer } from '../components/slides/unified-diff-renderer'
import { getTheme } from '../defaults'
import { usePresentationDiff } from '../hooks/use-presentation-diff'
import { NavigationState, PresentationData, Theme } from '../types'
import { NavigationController } from './navigation-controller'
import { SlideRenderer } from './slide-renderer'

import type { DiffTimelineEntry } from '../types/diff'

interface SlideCanvasWithDiffProps {
  presentation: PresentationData | null
  originalPresentation?: PresentationData | null
  className?: string
  onSlideChange?: (slideIndex: number) => void
  startSlide?: number
  autoPlay?: boolean
  showControls?: boolean
  diffMode?: boolean
  showDiffTimeline?: boolean
}

export function SlideCanvasWithDiff({
  presentation,
  originalPresentation,
  className,
  onSlideChange,
  startSlide = 0,
  autoPlay = false,
  showControls = true,
  diffMode = false,
  showDiffTimeline = true,
}: SlideCanvasWithDiffProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentSlide: startSlide,
    isFullscreen: false,
    isPresenterMode: false,
    isBlackScreen: false,
  })

  const [theme, setTheme] = useState<Theme>(() => {
    if (presentation?.meta.theme) {
      return getTheme(presentation.meta.theme)
    }
    return getTheme('minimal')
  })

  // Handle diff change navigation
  const handleChangeNavigate = useCallback(
    (entry: DiffTimelineEntry) => {
      if (entry.slideIndex !== undefined) {
        setNavigationState((prev) => ({
          ...prev,
          currentSlide: entry.slideIndex!,
        }))
        onSlideChange?.(entry.slideIndex)
      }
    },
    [onSlideChange],
  )

  // Use diff hook
  const {
    diff,
    statistics,
    filteredTimeline,
    viewState,
    navState,
    toggleDiff,
    toggleChangeType,
    navigateToChange,
    navigateNext,
    navigatePrevious,
    togglePlayback,
    setPlaybackSpeed,
    slideHasChanges,
    getSlideChanges,
  } = usePresentationDiff({
    originalData:
      diffMode && originalPresentation ? originalPresentation : null,
    modifiedData: diffMode && presentation ? presentation : null,
    onChangeNavigate: handleChangeNavigate,
  })

  // Auto-enable diff view when in diff mode
  useEffect(() => {
    if (diffMode && !viewState.showDiff) {
      toggleDiff()
    }
  }, [diffMode])

  // Update theme when presentation changes
  useEffect(() => {
    if (presentation?.meta.theme) {
      setTheme(getTheme(presentation.meta.theme))
    }
  }, [presentation?.meta.theme])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!presentation) return

      // In diff mode, additional shortcuts
      if (diffMode && viewState.showDiff) {
        switch (e.key) {
          case 'd':
          case 'D':
            if (!e.ctrlKey && !e.metaKey) {
              e.preventDefault()
              toggleDiff()
            }
            break
          case ']':
            e.preventDefault()
            navigateNext()
            break
          case '[':
            e.preventDefault()
            navigatePrevious()
            break
        }
      }

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault()
          goToNextSlide()
          break
        case 'ArrowLeft':
          e.preventDefault()
          goToPreviousSlide()
          break
        case 'Home':
          e.preventDefault()
          goToSlide(0)
          break
        case 'End':
          e.preventDefault()
          goToSlide(presentation.slides.length - 1)
          break
        case 'f':
        case 'F':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            toggleFullscreen()
          }
          break
        case 'Escape':
          if (navigationState.isFullscreen) {
            e.preventDefault()
            exitFullscreen()
          }
          break
        case 'b':
        case 'B':
          e.preventDefault()
          toggleBlackScreen()
          break
        case 'p':
        case 'P':
          e.preventDefault()
          togglePresenterMode()
          break
        default:
          // Handle number keys for jumping to slides
          if (e.key >= '1' && e.key <= '9') {
            const slideIndex = parseInt(e.key) - 1
            if (slideIndex < presentation.slides.length) {
              goToSlide(slideIndex)
            }
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    presentation,
    navigationState,
    diffMode,
    viewState,
    navigateNext,
    navigatePrevious,
    toggleDiff,
  ])

  // Navigation functions
  const goToSlide = useCallback(
    (index: number) => {
      if (!presentation) return

      const newIndex = Math.max(
        0,
        Math.min(index, presentation.slides.length - 1),
      )
      setNavigationState((prev) => ({ ...prev, currentSlide: newIndex }))
      onSlideChange?.(newIndex)
    },
    [presentation, onSlideChange],
  )

  const goToNextSlide = useCallback(() => {
    if (!presentation) return
    goToSlide(navigationState.currentSlide + 1)
  }, [presentation, navigationState.currentSlide, goToSlide])

  const goToPreviousSlide = useCallback(() => {
    goToSlide(navigationState.currentSlide - 1)
  }, [navigationState.currentSlide, goToSlide])

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await canvasRef.current?.requestFullscreen()
      setNavigationState((prev) => ({ ...prev, isFullscreen: true }))
    } else {
      await document.exitFullscreen()
      setNavigationState((prev) => ({ ...prev, isFullscreen: false }))
    }
  }, [])

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      setNavigationState((prev) => ({ ...prev, isFullscreen: false }))
    }
  }, [])

  const toggleBlackScreen = useCallback(() => {
    setNavigationState((prev) => ({
      ...prev,
      isBlackScreen: !prev.isBlackScreen,
    }))
  }, [])

  const togglePresenterMode = useCallback(() => {
    setNavigationState((prev) => ({
      ...prev,
      isPresenterMode: !prev.isPresenterMode,
    }))
  }, [])

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || !presentation) return

    const interval = setInterval(
      () => {
        if (navigationState.currentSlide < presentation.slides.length - 1) {
          goToNextSlide()
        } else {
          clearInterval(interval)
        }
      },
      (presentation.defaults?.duration || 5) * 1000,
    )

    return () => clearInterval(interval)
  }, [autoPlay, presentation, navigationState.currentSlide, goToNextSlide])

  if (!presentation) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-50 text-gray-500',
          className,
        )}>
        <p>No presentation loaded</p>
      </div>
    )
  }

  const currentSlide = presentation.slides[navigationState.currentSlide]
  const aspectRatio = presentation.meta.aspectRatio || '16:9'
  const aspectClass =
    aspectRatio === '16:9'
      ? 'aspect-video'
      : aspectRatio === '4:3'
        ? 'aspect-[4/3]'
        : 'aspect-square'

  return (
    <>
      <div
        ref={canvasRef}
        className={cn(
          'relative bg-white',
          navigationState.isFullscreen && 'fixed inset-0 z-50',
          className,
        )}
        style={{
          backgroundColor: theme.colors.background,
          fontFamily: theme.typography.fontFamily.sans,
          color: theme.colors.text,
          paddingBottom:
            diffMode && viewState.showDiff && showDiffTimeline ? '200px' : '0',
        }}>
        {/* Black screen overlay */}
        {navigationState.isBlackScreen && (
          <div className='absolute inset-0 z-40 bg-black' />
        )}

        {/* Diff mode indicator */}
        {diffMode && viewState.showDiff && (
          <div className='absolute left-4 top-4 z-30 flex items-center gap-2'>
            <div className='rounded-lg bg-black/50 px-3 py-1 text-sm text-white'>
              Diff Mode
            </div>
            {slideHasChanges(navigationState.currentSlide) && (
              <div className='rounded-lg bg-yellow-500/80 px-3 py-1 text-sm text-white'>
                Slide has changes
              </div>
            )}
          </div>
        )}

        {/* Main slide container */}
        <div
          className={cn(
            'relative mx-auto h-full',
            !navigationState.isFullscreen && aspectClass,
            navigationState.isFullscreen && 'flex items-center justify-center',
          )}>
          <div
            className={cn(
              'h-full w-full',
              navigationState.isFullscreen && aspectClass,
              navigationState.isFullscreen && 'max-h-full max-w-full',
              diffMode && viewState.showDiff && 'relative',
            )}>
            {diffMode && viewState.showDiff && originalPresentation ? (
              <UnifiedDiffRenderer
                modifiedSlide={currentSlide}
                originalSlide={
                  originalPresentation.slides[navigationState.currentSlide]
                }
                theme={theme}
                isFullscreen={navigationState.isFullscreen}
              />
            ) : (
              <SlideRenderer
                slide={currentSlide}
                theme={theme}
                isFullscreen={navigationState.isFullscreen}
                slideIndex={navigationState.currentSlide}
                totalSlides={presentation.slides.length}
              />
            )}
          </div>
        </div>

        {/* Navigation controls */}
        {showControls && !navigationState.isBlackScreen && (
          <NavigationController
            currentSlide={navigationState.currentSlide}
            totalSlides={presentation.slides.length}
            isFullscreen={navigationState.isFullscreen}
            onNext={goToNextSlide}
            onPrevious={goToPreviousSlide}
            onGoToSlide={goToSlide}
            onToggleFullscreen={toggleFullscreen}
            theme={theme}
          />
        )}

        {/* Slide indicator */}
        {!navigationState.isBlackScreen && (
          <div
            className={cn(
              'absolute bottom-4 right-4 rounded-lg px-3 py-1 text-sm',
              navigationState.isFullscreen
                ? 'bg-black/50 text-white'
                : 'bg-gray-900/10',
              diffMode && viewState.showDiff && showDiffTimeline && 'bottom-36',
            )}
            style={{
              color: navigationState.isFullscreen
                ? '#ffffff'
                : theme.colors.secondary,
            }}>
            {navigationState.currentSlide + 1} / {presentation.slides.length}
          </div>
        )}

        {/* Diff toggle button */}
        {diffMode && (
          <button
            onClick={toggleDiff}
            className={cn(
              'absolute right-4 top-4 z-30 rounded-lg px-3 py-1 text-sm transition-colors',
              viewState.showDiff
                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
            )}>
            {viewState.showDiff ? 'Hide Diff' : 'Show Diff'}
          </button>
        )}
      </div>

      {/* Diff timeline */}
      {diffMode &&
        viewState.showDiff &&
        showDiffTimeline &&
        filteredTimeline.length > 0 && (
          <DiffTimeline
            timeline={filteredTimeline}
            currentIndex={viewState.currentChangeIndex}
            statistics={statistics}
            isPlaying={navState.isPlaying}
            playbackSpeed={navState.playbackSpeed}
            filteredTypes={viewState.filteredTypes}
            onNavigate={navigateToChange}
            onTogglePlayback={togglePlayback}
            onSetPlaybackSpeed={setPlaybackSpeed}
            onToggleChangeType={toggleChangeType}
            onClose={toggleDiff}
          />
        )}
    </>
  )
}
