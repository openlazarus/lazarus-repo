'use client'

import { cn } from '@/lib/utils'

import { Theme } from '../types'

interface NavigationControllerProps {
  currentSlide: number
  totalSlides: number
  isFullscreen: boolean
  onNext: () => void
  onPrevious: () => void
  onGoToSlide: (index: number) => void
  onToggleFullscreen: () => void
  theme: Theme
}

export function NavigationController({
  currentSlide,
  totalSlides,
  isFullscreen,
  onNext,
  onPrevious,
  onGoToSlide,
  onToggleFullscreen,
  theme,
}: NavigationControllerProps) {
  const canGoPrevious = currentSlide > 0
  const canGoNext = currentSlide < totalSlides - 1

  return (
    <>
      {/* Navigation buttons */}
      <div className='pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-4'>
        <button
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className={cn(
            'pointer-events-auto rounded-full p-3 transition-all duration-200',
            'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2',
            canGoPrevious
              ? 'bg-white/10 backdrop-blur-sm hover:bg-white/20'
              : 'cursor-not-allowed opacity-30',
          )}
          style={{
            color: isFullscreen ? '#ffffff' : theme.colors.text,
          }}
          aria-label='Previous slide'>
          <svg
            className='h-6 w-6'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M15 19l-7-7 7-7'
            />
          </svg>
        </button>

        <button
          onClick={onNext}
          disabled={!canGoNext}
          className={cn(
            'pointer-events-auto rounded-full p-3 transition-all duration-200',
            'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2',
            canGoNext
              ? 'bg-white/10 backdrop-blur-sm hover:bg-white/20'
              : 'cursor-not-allowed opacity-30',
          )}
          style={{
            color: isFullscreen ? '#ffffff' : theme.colors.text,
          }}
          aria-label='Next slide'>
          <svg
            className='h-6 w-6'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 5l7 7-7 7'
            />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className='absolute bottom-0 left-0 right-0 h-1 bg-gray-200/20'>
        <div
          className='h-full transition-all duration-300 ease-out'
          style={{
            width: `${((currentSlide + 1) / totalSlides) * 100}%`,
            backgroundColor: theme.colors.primary,
          }}
        />
      </div>

      {/* Slide dots indicator */}
      <div className='absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2'>
        {Array.from({ length: Math.min(totalSlides, 10) }).map((_, index) => (
          <button
            key={index}
            onClick={() => onGoToSlide(index)}
            className={cn(
              'h-2 w-2 rounded-full transition-all duration-200',
              'hover:scale-125 focus:outline-none focus:ring-2 focus:ring-offset-2',
              index === currentSlide ? 'w-8' : 'hover:bg-opacity-60',
            )}
            style={{
              backgroundColor:
                index === currentSlide
                  ? theme.colors.primary
                  : isFullscreen
                    ? 'rgba(255, 255, 255, 0.3)'
                    : 'rgba(0, 0, 0, 0.2)',
            }}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
        {totalSlides > 10 && (
          <span
            className='ml-2 text-xs'
            style={{
              color: isFullscreen
                ? 'rgba(255, 255, 255, 0.5)'
                : theme.colors.secondary,
            }}>
            +{totalSlides - 10}
          </span>
        )}
      </div>

      {/* Fullscreen toggle */}
      <button
        onClick={onToggleFullscreen}
        className={cn(
          'absolute right-4 top-4 rounded-lg p-2 transition-all duration-200',
          'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2',
          'bg-white/10 backdrop-blur-sm hover:bg-white/20',
        )}
        style={{
          color: isFullscreen ? '#ffffff' : theme.colors.text,
        }}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
        {isFullscreen ? (
          <svg
            className='h-5 w-5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        ) : (
          <svg
            className='h-5 w-5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4'
            />
          </svg>
        )}
      </button>
    </>
  )
}
