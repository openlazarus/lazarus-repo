'use client'

import { ChartData, Slide } from '../../types'

interface DataVizSlideProps {
  slide: Slide
  theme: any
}

export function DataVizSlide({ slide, theme }: DataVizSlideProps) {
  const { title, subtitle, data } = slide

  if (!data || !('type' in data)) {
    return (
      <div className='flex h-full items-center justify-center text-muted-foreground'>
        <p>No chart data provided</p>
      </div>
    )
  }

  const chartData = data as ChartData
  const maxValue = Math.max(...chartData.datasets.flatMap((d) => d.data))

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

      {/* Chart Container */}
      <div className='flex flex-1 items-center justify-center'>
        {chartData.type === 'bar' && (
          <BarChart data={chartData} maxValue={maxValue} theme={theme} />
        )}
        {chartData.type === 'line' && (
          <LineChart data={chartData} maxValue={maxValue} theme={theme} />
        )}
        {chartData.type === 'pie' && (
          <PieChart data={chartData} theme={theme} />
        )}
        {chartData.type === 'donut' && (
          <DonutChart data={chartData} theme={theme} />
        )}
      </div>
    </div>
  )
}

// Bar Chart Component
function BarChart({
  data,
  maxValue,
  theme,
}: {
  data: ChartData
  maxValue: number
  theme: any
}) {
  const barWidth = 100 / (data.labels?.length || data.datasets[0].data.length)

  return (
    <div className='flex h-full w-full flex-col'>
      <div
        className='flex flex-1 items-end justify-between px-8'
        style={{ gap: '1rem' }}>
        {data.labels?.map((label, i) => (
          <div
            key={i}
            className='flex flex-1 flex-col items-center'
            style={{ maxWidth: `${barWidth}%` }}>
            <div
              className='flex w-full items-end justify-center'
              style={{ height: '300px', gap: '0.5rem' }}>
              {data.datasets.map((dataset, j) => (
                <div
                  key={j}
                  className='transition-all duration-700 ease-out hover:opacity-80'
                  style={{
                    width: `${100 / data.datasets.length}%`,
                    height: `${(dataset.data[i] / maxValue) * 100}%`,
                    backgroundColor:
                      dataset.backgroundColor || theme.colors.primary,
                    borderRadius: '4px 4px 0 0',
                    minHeight: '4px',
                  }}
                />
              ))}
            </div>
            <p
              className='mt-4 text-center text-sm'
              style={{ color: theme.colors.muted }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Legend */}
      {data.options?.showLegend !== false && data.datasets.length > 1 && (
        <div className='mt-8 flex justify-center gap-6'>
          {data.datasets.map((dataset, i) => (
            <div key={i} className='flex items-center gap-2'>
              <div
                className='h-3 w-3 rounded'
                style={{
                  backgroundColor:
                    dataset.backgroundColor || theme.colors.primary,
                }}
              />
              <span className='text-sm' style={{ color: theme.colors.muted }}>
                {dataset.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Line Chart Component
function LineChart({
  data,
  maxValue,
  theme,
}: {
  data: ChartData
  maxValue: number
  theme: any
}) {
  const points = data.labels?.length || data.datasets[0].data.length
  const stepX = 100 / (points - 1)

  return (
    <div className='flex h-full w-full flex-col'>
      <div className='relative flex-1' style={{ padding: '2rem' }}>
        <svg
          className='h-full w-full'
          viewBox='0 0 100 100'
          preserveAspectRatio='none'>
          {/* Grid lines */}
          {data.options?.showGrid !== false && (
            <g opacity={0.1}>
              {[0, 25, 50, 75, 100].map((y) => (
                <line
                  key={y}
                  x1='0'
                  y1={y}
                  x2='100'
                  y2={y}
                  stroke={theme.colors.border}
                  strokeWidth='0.2'
                />
              ))}
            </g>
          )}

          {/* Lines */}
          {data.datasets.map((dataset, i) => {
            const pathData = dataset.data
              .map((value, j) => {
                const x = j * stepX
                const y = 100 - (value / maxValue) * 100
                return `${j === 0 ? 'M' : 'L'} ${x} ${y}`
              })
              .join(' ')

            return (
              <g key={i}>
                <path
                  d={pathData}
                  fill='none'
                  stroke={dataset.borderColor || theme.colors.primary}
                  strokeWidth='2'
                  className='transition-all duration-700'
                />
                {/* Data points */}
                {dataset.data.map((value, j) => (
                  <circle
                    key={j}
                    cx={j * stepX}
                    cy={100 - (value / maxValue) * 100}
                    r='1.5'
                    fill={dataset.borderColor || theme.colors.primary}
                    className='hover:r-[2.5] transition-all duration-300'
                  />
                ))}
              </g>
            )
          })}
        </svg>

        {/* X-axis labels */}
        <div className='absolute bottom-0 left-0 right-0 flex justify-between px-8'>
          {data.labels?.map((label, i) => (
            <span
              key={i}
              className='text-xs'
              style={{ color: theme.colors.muted }}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Legend */}
      {data.options?.showLegend !== false && data.datasets.length > 1 && (
        <div className='mt-4 flex justify-center gap-6'>
          {data.datasets.map((dataset, i) => (
            <div key={i} className='flex items-center gap-2'>
              <div
                className='h-0.5 w-8'
                style={{
                  backgroundColor: dataset.borderColor || theme.colors.primary,
                }}
              />
              <span className='text-sm' style={{ color: theme.colors.muted }}>
                {dataset.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Pie Chart Component
function PieChart({ data, theme }: { data: ChartData; theme: any }) {
  const total = data.datasets[0].data.reduce((a, b) => a + b, 0)
  let cumulativeAngle = -90 // Start from top

  const slices = data.datasets[0].data.map((value, i) => {
    const angle = (value / total) * 360
    const startAngle = cumulativeAngle
    cumulativeAngle += angle

    const startRad = (startAngle * Math.PI) / 180
    const endRad = (cumulativeAngle * Math.PI) / 180

    const x1 = 50 + 40 * Math.cos(startRad)
    const y1 = 50 + 40 * Math.sin(startRad)
    const x2 = 50 + 40 * Math.cos(endRad)
    const y2 = 50 + 40 * Math.sin(endRad)

    const largeArc = angle > 180 ? 1 : 0

    return {
      path: `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`,
      value,
      percentage: Math.round((value / total) * 100),
      color: data.datasets[0].backgroundColor || theme.colors.primary,
      label: data.labels?.[i],
    }
  })

  return (
    <div className='flex h-full w-full items-center justify-center gap-12'>
      <div className='relative' style={{ width: '300px', height: '300px' }}>
        <svg viewBox='0 0 100 100' className='h-full w-full rotate-0 transform'>
          {slices.map((slice, i) => (
            <path
              key={i}
              d={slice.path}
              fill={Array.isArray(slice.color) ? slice.color[i] : slice.color}
              className='transition-all duration-300 hover:opacity-80'
              style={{ cursor: 'pointer' }}
            />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className='flex flex-col gap-3'>
        {slices.map((slice, i) => (
          <div key={i} className='flex items-center gap-3'>
            <div
              className='h-4 w-4 rounded'
              style={{
                backgroundColor: Array.isArray(slice.color)
                  ? slice.color[i]
                  : slice.color,
              }}
            />
            <span className='text-sm' style={{ color: theme.colors.text }}>
              {slice.label}: {slice.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Donut Chart Component
function DonutChart({ data, theme }: { data: ChartData; theme: any }) {
  const total = data.datasets[0].data.reduce((a, b) => a + b, 0)
  let cumulativeAngle = -90

  const slices = data.datasets[0].data.map((value, i) => {
    const angle = (value / total) * 360
    const startAngle = cumulativeAngle
    cumulativeAngle += angle

    const startRad = (startAngle * Math.PI) / 180
    const endRad = (cumulativeAngle * Math.PI) / 180

    const outerRadius = 40
    const innerRadius = 25

    const x1 = 50 + outerRadius * Math.cos(startRad)
    const y1 = 50 + outerRadius * Math.sin(startRad)
    const x2 = 50 + outerRadius * Math.cos(endRad)
    const y2 = 50 + outerRadius * Math.sin(endRad)
    const x3 = 50 + innerRadius * Math.cos(endRad)
    const y3 = 50 + innerRadius * Math.sin(endRad)
    const x4 = 50 + innerRadius * Math.cos(startRad)
    const y4 = 50 + innerRadius * Math.sin(startRad)

    const largeArc = angle > 180 ? 1 : 0

    return {
      path: `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`,
      value,
      percentage: Math.round((value / total) * 100),
      color: data.datasets[0].backgroundColor || theme.colors.primary,
      label: data.labels?.[i],
    }
  })

  return (
    <div className='flex h-full w-full items-center justify-center gap-12'>
      <div className='relative' style={{ width: '300px', height: '300px' }}>
        <svg viewBox='0 0 100 100' className='h-full w-full'>
          {slices.map((slice, i) => (
            <path
              key={i}
              d={slice.path}
              fill={Array.isArray(slice.color) ? slice.color[i] : slice.color}
              className='transition-all duration-300 hover:opacity-80'
              style={{ cursor: 'pointer' }}
            />
          ))}
        </svg>

        {/* Center text */}
        <div className='absolute inset-0 flex items-center justify-center'>
          <div className='text-center'>
            <p
              className='text-3xl font-bold'
              style={{ color: theme.colors.text }}>
              {total}
            </p>
            <p className='text-sm' style={{ color: theme.colors.muted }}>
              Total
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className='flex flex-col gap-3'>
        {slices.map((slice, i) => (
          <div key={i} className='flex items-center gap-3'>
            <div
              className='h-4 w-4 rounded'
              style={{
                backgroundColor: Array.isArray(slice.color)
                  ? slice.color[i]
                  : slice.color,
              }}
            />
            <span className='text-sm' style={{ color: theme.colors.text }}>
              {slice.label}: {slice.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
