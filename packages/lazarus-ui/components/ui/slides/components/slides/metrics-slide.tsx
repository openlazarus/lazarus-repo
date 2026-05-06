'use client'

import { MetricItem, Slide } from '../../types'

interface MetricsSlideProps {
  slide: Slide
  theme: any
}

export function MetricsSlide({ slide, theme }: MetricsSlideProps) {
  const { title, subtitle, metrics = [] } = slide

  if (!metrics || metrics.length === 0) {
    return (
      <div className='flex h-full items-center justify-center text-muted-foreground'>
        <p>No metrics data provided</p>
      </div>
    )
  }

  // Determine grid layout based on number of metrics
  const gridCols =
    metrics.length <= 3
      ? metrics.length
      : metrics.length === 4
        ? 2
        : metrics.length <= 6
          ? 3
          : 4

  return (
    <div
      className='flex h-full flex-col'
      style={{ padding: theme.spacing.slide.padding }}>
      {/* Header */}
      {(title || subtitle) && (
        <div className='mb-12'>
          {title && (
            <h2
              className='mb-3 text-4xl font-semibold'
              style={{
                fontFamily: theme.typography.fontFamily.sans,
                color: theme.colors.text,
              }}>
              {title}
            </h2>
          )}
          {subtitle && (
            <p
              className='text-xl opacity-80'
              style={{
                fontFamily: theme.typography.fontFamily.sans,
                color: theme.colors.muted,
              }}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Metrics Grid */}
      <div className='flex flex-1 items-center'>
        <div
          className={`grid w-full gap-6 ${gridCols === 1 ? 'grid-cols-1' : ''} ${gridCols === 2 ? 'grid-cols-2' : ''} ${gridCols === 3 ? 'grid-cols-3' : ''} ${gridCols === 4 ? 'grid-cols-4' : ''} `}>
          {metrics.map((metric, index) => (
            <MetricCard key={index} metric={metric} theme={theme} />
          ))}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ metric, theme }: { metric: MetricItem; theme: any }) {
  const { label, value, change, icon, color, description } = metric

  // Determine change color
  const changeColor =
    change?.type === 'increase'
      ? '#10b981'
      : change?.type === 'decrease'
        ? '#ef4444'
        : theme.colors.muted

  return (
    <div
      className='rounded-2xl p-6 transition-all duration-300 hover:scale-105'
      style={{
        backgroundColor:
          theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        border: `1px solid ${theme.colors.border}`,
        borderColor: color ? `${color}20` : theme.colors.border,
      }}>
      {/* Icon */}
      {icon && (
        <div
          className='mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-2xl'
          style={{
            backgroundColor: color ? `${color}20` : theme.colors.primary + '20',
            color: color || theme.colors.primary,
          }}>
          {icon}
        </div>
      )}

      {/* Label */}
      <p
        className='mb-2 text-sm font-medium'
        style={{
          color: theme.colors.muted,
          fontFamily: theme.typography.fontFamily.sans,
        }}>
        {label}
      </p>

      {/* Value and Change */}
      <div className='mb-2 flex items-baseline gap-3'>
        <h3
          className='text-3xl font-bold'
          style={{
            color: color || theme.colors.text,
            fontFamily: theme.typography.fontFamily.sans,
          }}>
          {formatValue(value)}
        </h3>

        {change && (
          <div className='flex items-center gap-1'>
            <span className='text-lg' style={{ color: changeColor }}>
              {change.type === 'increase'
                ? '↑'
                : change.type === 'decrease'
                  ? '↓'
                  : '→'}
            </span>
            <span
              className='text-sm font-medium'
              style={{ color: changeColor }}>
              {Math.abs(change.value)}%
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      {description && (
        <p
          className='text-sm opacity-70'
          style={{
            color: theme.colors.muted,
            fontFamily: theme.typography.fontFamily.sans,
          }}>
          {description}
        </p>
      )}
    </div>
  )
}

function formatValue(value: string | number): string {
  if (typeof value === 'number') {
    // Format large numbers
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toLocaleString()
  }
  return String(value)
}
