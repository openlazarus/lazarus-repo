'use client'

import { Slide } from '../../types'

interface SummarySlideProps {
  slide: Slide
  theme: any
}

export function SummarySlide({ slide, theme }: SummarySlideProps) {
  const { title, subtitle, highlights = [] } = slide

  if (!highlights || highlights.length === 0) {
    return (
      <div className='flex h-full items-center justify-center text-muted-foreground'>
        <p>No summary highlights provided</p>
      </div>
    )
  }

  return (
    <div
      className='flex h-full flex-col'
      style={{ padding: theme.spacing.slide.padding }}>
      {/* Header */}
      <div className='mb-12 text-center'>
        {title && (
          <h2
            className='mb-4 text-5xl font-semibold'
            style={{
              fontFamily: theme.typography.fontFamily.sans,
              color: theme.colors.text,
            }}>
            {title}
          </h2>
        )}
        {subtitle && (
          <p
            className='text-2xl opacity-80'
            style={{
              fontFamily: theme.typography.fontFamily.sans,
              color: theme.colors.muted,
            }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Highlights */}
      <div className='flex flex-1 items-center'>
        <div className='mx-auto w-full max-w-4xl'>
          {highlights.length <= 3 ? (
            <LargeHighlights highlights={highlights} theme={theme} />
          ) : (
            <CompactHighlights highlights={highlights} theme={theme} />
          )}
        </div>
      </div>
    </div>
  )
}

function LargeHighlights({
  highlights,
  theme,
}: {
  highlights: string[]
  theme: any
}) {
  return (
    <div className='space-y-8'>
      {highlights.map((highlight, index) => (
        <div
          key={index}
          className='flex items-center gap-6 rounded-2xl p-8 transition-all duration-500 hover:scale-105'
          style={{
            backgroundColor:
              theme.name === 'dark'
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.03)',
            border: `2px solid ${theme.colors.primary}20`,
            animationDelay: `${index * 100}ms`,
          }}>
          {/* Number */}
          <div
            className='flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full'
            style={{
              backgroundColor: theme.colors.primary,
              color: theme.colors.background,
            }}>
            <span className='text-2xl font-bold'>{index + 1}</span>
          </div>

          {/* Text */}
          <p
            className='flex-1 text-xl'
            style={{
              fontFamily: theme.typography.fontFamily.sans,
              color: theme.colors.text,
              fontWeight: theme.typography.fontWeight.medium,
            }}>
            {highlight}
          </p>
        </div>
      ))}
    </div>
  )
}

function CompactHighlights({
  highlights,
  theme,
}: {
  highlights: string[]
  theme: any
}) {
  const midPoint = Math.ceil(highlights.length / 2)
  const leftColumn = highlights.slice(0, midPoint)
  const rightColumn = highlights.slice(midPoint)

  return (
    <div className='grid grid-cols-2 gap-8'>
      {/* Left Column */}
      <div className='space-y-4'>
        {leftColumn.map((highlight, index) => (
          <HighlightItem
            key={index}
            highlight={highlight}
            index={index}
            theme={theme}
          />
        ))}
      </div>

      {/* Right Column */}
      <div className='space-y-4'>
        {rightColumn.map((highlight, index) => (
          <HighlightItem
            key={index + midPoint}
            highlight={highlight}
            index={index + midPoint}
            theme={theme}
          />
        ))}
      </div>
    </div>
  )
}

function HighlightItem({
  highlight,
  index,
  theme,
}: {
  highlight: string
  index: number
  theme: any
}) {
  return (
    <div
      className='hover:scale-102 flex items-start gap-4 rounded-xl p-4 transition-all duration-300'
      style={{
        backgroundColor:
          theme.name === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        animationDelay: `${index * 50}ms`,
      }}>
      {/* Bullet */}
      <div
        className='mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full'
        style={{
          backgroundColor: theme.colors.primary + '20',
          color: theme.colors.primary,
        }}>
        <span className='text-sm font-bold'>{index + 1}</span>
      </div>

      {/* Text */}
      <p
        className='flex-1 text-base'
        style={{
          fontFamily: theme.typography.fontFamily.sans,
          color: theme.colors.text,
        }}>
        {highlight}
      </p>
    </div>
  )
}
