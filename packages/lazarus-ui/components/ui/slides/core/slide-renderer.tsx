'use client'

import React from 'react'

import { cn } from '@/lib/utils'

import { AgendaSlide } from '../components/slides/agenda-slide'
import { CodeSlide } from '../components/slides/code-slide'
import { ComparisonSlide } from '../components/slides/comparison-slide'
import { ContentSlide } from '../components/slides/content-slide'
import { DataVizSlide } from '../components/slides/data-viz-slide'
import { DiagramSlide } from '../components/slides/diagram-slide'
import { GallerySlide } from '../components/slides/gallery-slide'
import { MetricsSlide } from '../components/slides/metrics-slide'
import { ProcessSlide } from '../components/slides/process-slide'
import { SummarySlide } from '../components/slides/summary-slide'
import { TableSlide } from '../components/slides/table-slide'
import { TeamSlide } from '../components/slides/team-slide'
import { TestimonialSlide } from '../components/slides/testimonial-slide'
import { TimelineSlide } from '../components/slides/timeline-slide'
import { TitleSlide } from '../components/slides/title-slide'
import { Slide, Theme } from '../types'

interface SlideRendererProps {
  slide: Slide
  theme: Theme
  isFullscreen: boolean
  slideIndex: number
  totalSlides: number
}

export function SlideRenderer({
  slide,
  theme,
  isFullscreen,
  slideIndex,
  totalSlides,
}: SlideRendererProps) {
  const slideProps = {
    slide,
    theme,
    isFullscreen,
  }

  const renderSlide = () => {
    switch (slide.type) {
      case 'title':
        return <TitleSlide {...slideProps} />
      case 'content':
        return <ContentSlide {...slideProps} />
      case 'code':
        return <CodeSlide {...slideProps} />
      case 'diagram':
        return <DiagramSlide {...slideProps} />
      case 'comparison':
        return <ComparisonSlide {...slideProps} />
      case 'data-viz':
        return <DataVizSlide {...slideProps} />
      case 'table':
        return <TableSlide {...slideProps} />
      case 'metrics':
        return <MetricsSlide {...slideProps} />
      case 'timeline':
        return <TimelineSlide {...slideProps} />
      case 'team':
        return <TeamSlide {...slideProps} />
      case 'testimonial':
        return <TestimonialSlide {...slideProps} />
      case 'gallery':
        return <GallerySlide {...slideProps} />
      case 'process':
        return <ProcessSlide {...slideProps} />
      case 'agenda':
        return <AgendaSlide {...slideProps} />
      case 'summary':
        return <SummarySlide {...slideProps} />
      default:
        return (
          <div className='flex h-full items-center justify-center'>
            <p className='text-gray-500'>Unknown slide type: {slide.type}</p>
          </div>
        )
    }
  }

  // Get background styles
  const getBackgroundStyles = () => {
    if (!slide.background) return {}

    const bg = slide.background
    const styles: React.CSSProperties = {}

    if (bg.type === 'gradient' || bg.value?.startsWith('gradient-')) {
      // Handle predefined gradients
      const gradientName = bg.value?.replace('gradient-', '') || 'purple'
      const gradient =
        theme.colors.gradients[
          gradientName as keyof typeof theme.colors.gradients
        ]
      if (gradient) {
        styles.background = gradient
      }
    } else if (bg.type === 'color') {
      styles.backgroundColor = bg.value
    } else if (bg.type === 'image') {
      styles.backgroundImage = `url(${bg.value})`
      styles.backgroundSize = 'cover'
      styles.backgroundPosition = 'center'
      if (bg.blur) {
        styles.filter = `blur(${bg.blur}px)`
      }
    }

    if (bg.opacity !== undefined) {
      styles.opacity = bg.opacity
    }

    return styles
  }

  const padding = isFullscreen
    ? theme.spacing.slide.padding
    : `calc(${theme.spacing.slide.padding} * 0.75)`

  return (
    <div
      className={cn(
        'relative h-full w-full overflow-hidden',
        'transition-all duration-300 ease-in-out',
      )}
      style={{
        color: theme.colors.text,
        ...getBackgroundStyles(),
      }}>
      {/* Background overlay for better text readability */}
      {slide.background && slide.background.type === 'image' && (
        <div
          className='absolute inset-0 bg-black/30'
          style={{
            mixBlendMode: 'multiply',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Slide content */}
      <div
        className='relative h-full w-full'
        style={{
          padding,
          paddingTop: isFullscreen ? padding : `calc(${padding} * 0.5)`,
          paddingBottom: isFullscreen ? padding : `calc(${padding} * 0.5)`,
        }}>
        {renderSlide()}
      </div>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className='absolute left-2 top-2 rounded bg-black/50 px-2 py-1 text-xs text-white'>
          Slide {slideIndex + 1} | Type: {slide.type}
        </div>
      )}
    </div>
  )
}
