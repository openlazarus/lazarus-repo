'use client'

import { cn } from '@/lib/utils'

import { ContentSlideWithDiff } from '../components/slides/content-slide-with-diff'
import { Slide, Theme } from '../types'
import { SlideDiff } from '../types/diff'
import { SlideRenderer } from './slide-renderer'

interface SlideRendererWithDiffProps {
  slide: Slide
  originalSlide?: Slide
  theme: Theme
  isFullscreen: boolean
  slideIndex: number
  totalSlides: number
  slideDiff?: SlideDiff | null
  showDiff?: boolean
}

export function SlideRendererWithDiff({
  slide,
  originalSlide,
  theme,
  isFullscreen,
  slideIndex,
  totalSlides,
  slideDiff,
  showDiff = false,
}: SlideRendererWithDiffProps) {
  if (!showDiff || !slideDiff) {
    return (
      <SlideRenderer
        slide={slide}
        theme={theme}
        isFullscreen={isFullscreen}
        slideIndex={slideIndex}
        totalSlides={totalSlides}
      />
    )
  }

  // For content slides, use the diff-aware renderer
  if (slide.type === 'content' && slideDiff) {
    return (
      <div
        className='relative h-full w-full'
        style={{ backgroundColor: theme.colors.background }}>
        <ContentSlideWithDiff
          slide={slide}
          originalSlide={originalSlide}
          theme={theme}
          isFullscreen={isFullscreen}
          changes={slideDiff.changes}
        />

        {/* Slide-level indicator in corner */}
        {slideDiff.type !== 'modified' && (
          <div
            className={cn(
              'absolute right-4 top-4 rounded-lg px-3 py-1 text-sm font-medium',
              slideDiff.type === 'added' && 'bg-green-500 text-white',
              slideDiff.type === 'removed' && 'bg-red-500 text-white',
              slideDiff.type === 'reordered' && 'bg-orange-500 text-white',
            )}>
            {slideDiff.type === 'added' && 'New Slide'}
            {slideDiff.type === 'removed' && 'Deleted Slide'}
            {slideDiff.type === 'reordered' &&
              `Moved from position ${(slideDiff.originalIndex || 0) + 1}`}
          </div>
        )}

        {/* Changes summary - moved to side panel */}
        {slideDiff.changes.length > 0 && (
          <div className='absolute right-0 top-20 w-64 border-l border-gray-200 bg-gray-50 p-3'>
            <h4 className='mb-2 text-xs font-medium text-gray-700'>
              Changes Summary
            </h4>
            <div className='space-y-1'>
              {slideDiff.changes.map((change, index) => (
                <div key={index} className='flex items-start gap-1.5'>
                  <div
                    className={cn(
                      'mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full',
                      change.type === 'added' && 'bg-green-500',
                      change.type === 'removed' && 'bg-red-500',
                      change.type === 'modified' && 'bg-yellow-500',
                    )}
                  />
                  <p className='text-xs leading-relaxed text-gray-600'>
                    {formatChangePath(change.path)} {change.type}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // For other slide types, use the standard renderer with overlay
  return (
    <div className='relative h-full w-full'>
      <SlideRenderer
        slide={slide}
        theme={theme}
        isFullscreen={isFullscreen}
        slideIndex={slideIndex}
        totalSlides={totalSlides}
      />

      {/* Minimal diff indicators for non-content slides */}
      {slideDiff && (
        <div className='absolute right-4 top-4'>
          <div
            className={cn(
              'rounded-lg px-3 py-1 text-sm font-medium',
              slideDiff.type === 'added' && 'bg-green-500 text-white',
              slideDiff.type === 'removed' && 'bg-red-500 text-white',
              slideDiff.type === 'modified' && 'bg-yellow-500 text-white',
              slideDiff.type === 'reordered' && 'bg-orange-500 text-white',
            )}>
            {slideDiff.changes.length} changes
          </div>
        </div>
      )}
    </div>
  )
}

function formatChangePath(path: string): string {
  // Convert technical paths to human-readable labels
  const pathMap: Record<string, string> = {
    title: 'Title',
    subtitle: 'Subtitle',
    content: 'Content',
    layout: 'Layout',
    background: 'Background',
    notes: 'Speaker Notes',
  }

  return pathMap[path] || path.charAt(0).toUpperCase() + path.slice(1)
}
