'use client'

import { cn } from '@/lib/utils'

import { Slide, Theme } from '../../types'

interface ComparisonSlideProps {
  slide: Slide
  theme: Theme
  isFullscreen: boolean
}

export function ComparisonSlide({
  slide,
  theme,
  isFullscreen,
}: ComparisonSlideProps) {
  const titleSize = isFullscreen
    ? theme.typography.fontSize['3xl']
    : theme.typography.fontSize['2xl']
  const headingSize = isFullscreen
    ? theme.typography.fontSize.xl
    : theme.typography.fontSize.lg

  if (!slide.items || slide.items.length === 0) {
    return (
      <div className='flex h-full items-center justify-center'>
        <p style={{ color: theme.colors.secondary }}>No comparison items</p>
      </div>
    )
  }

  // Get all column keys from the first item
  const columns = Object.keys(slide.items[0])

  return (
    <div className='flex h-full flex-col'>
      {/* Title */}
      {slide.title && (
        <h2
          className='animate-fade-in-down mb-8 text-center'
          style={{
            fontSize: titleSize,
            fontWeight: theme.typography.fontWeight.semibold,
            lineHeight: theme.typography.lineHeight.tight,
          }}>
          {slide.title}
        </h2>
      )}

      {/* Comparison grid */}
      <div className='flex-1 overflow-auto'>
        <div
          className='animate-fade-in-up grid h-full'
          style={{
            gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
            gap: theme.spacing.content.gap,
          }}>
          {columns.map((column, colIndex) => {
            const item = slide.items![0][column]

            return (
              <div
                key={column}
                className={cn(
                  'flex flex-col rounded-lg border p-6',
                  `animate-fade-in-up animation-delay-${colIndex * 100}`,
                )}
                style={{
                  borderColor: theme.colors.border,
                  backgroundColor:
                    colIndex % 2 === 0
                      ? theme.colors.background
                      : theme.colors.muted,
                }}>
                {/* Icon */}
                {item.icon && (
                  <div className='mb-4 text-center text-4xl'>{item.icon}</div>
                )}

                {/* Title */}
                <h3
                  className='mb-4 text-center font-semibold'
                  style={{
                    fontSize: headingSize,
                    color: theme.colors.text,
                  }}>
                  {item.title}
                </h3>

                {/* Points */}
                <ul
                  className='flex-1 space-y-3'
                  style={{
                    listStyleType: 'none',
                    paddingLeft: 0,
                  }}>
                  {item.points.map((point, pointIndex) => (
                    <li
                      key={pointIndex}
                      className='flex items-start'
                      style={{
                        fontSize: theme.typography.fontSize.base,
                        color: theme.colors.text,
                      }}>
                      <span
                        className='mr-2 mt-1.5 block h-1.5 w-1.5 flex-shrink-0 rounded-full'
                        style={{
                          backgroundColor:
                            colIndex % 2 === 0
                              ? theme.colors.primary
                              : theme.colors.accent,
                        }}
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

                {/* Optional: Add a visual indicator for better/worse */}
                {column === 'traditional' && (
                  <div
                    className='mt-4 text-center text-sm'
                    style={{ color: theme.colors.secondary }}>
                    <span className='opacity-60'>Traditional approach</span>
                  </div>
                )}
                {column === 'slides' && (
                  <div
                    className='mt-4 text-center text-sm font-medium'
                    style={{ color: theme.colors.primary }}>
                    <span>✓ Recommended</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
