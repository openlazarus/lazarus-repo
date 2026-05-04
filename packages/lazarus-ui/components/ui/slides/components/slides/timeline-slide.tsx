'use client'

import { Slide, TimelineEvent } from '../../types'

interface TimelineSlideProps {
  slide: Slide
  theme: any
}

export function TimelineSlide({ slide, theme }: TimelineSlideProps) {
  const { title, subtitle, events = [] } = slide

  if (!events || events.length === 0) {
    return (
      <div className='flex h-full items-center justify-center text-muted-foreground'>
        <p>No timeline events provided</p>
      </div>
    )
  }

  // Determine layout based on number of events
  const isVertical = events.length > 6

  return (
    <div
      className='flex h-full flex-col'
      style={{ padding: theme.spacing.slide.padding }}>
      {/* Header */}
      {(title || subtitle) && (
        <div className='mb-8'>
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

      {/* Timeline */}
      <div className='flex flex-1 items-center'>
        {isVertical ? (
          <VerticalTimeline events={events} theme={theme} />
        ) : (
          <HorizontalTimeline events={events} theme={theme} />
        )}
      </div>
    </div>
  )
}

function HorizontalTimeline({
  events,
  theme,
}: {
  events: TimelineEvent[]
  theme: any
}) {
  return (
    <div className='w-full'>
      {/* Timeline line */}
      <div className='relative'>
        <div
          className='absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2'
          style={{ backgroundColor: theme.colors.border }}
        />

        {/* Events */}
        <div className='relative flex justify-between'>
          {events.map((event, index) => (
            <div
              key={index}
              className='flex flex-col items-center'
              style={{ flex: '1 1 0%' }}>
              {/* Top content (alternating) */}
              {index % 2 === 0 && (
                <div className='mb-4 px-2 text-center'>
                  <p
                    className='mb-1 text-sm font-medium'
                    style={{ color: theme.colors.primary }}>
                    {event.date}
                  </p>
                  <h3
                    className='mb-1 text-base font-semibold'
                    style={{
                      color: theme.colors.text,
                      fontFamily: theme.typography.fontFamily.sans,
                    }}>
                    {event.title}
                  </h3>
                  {event.description && (
                    <p
                      className='text-sm opacity-80'
                      style={{ color: theme.colors.muted }}>
                      {event.description}
                    </p>
                  )}
                </div>
              )}

              {/* Dot */}
              <div
                className={`relative z-10 rounded-full border-2 bg-white ${event.milestone ? 'h-5 w-5' : 'h-3 w-3'} `}
                style={{
                  borderColor: event.color || theme.colors.primary,
                  backgroundColor: event.milestone
                    ? event.color || theme.colors.primary
                    : theme.name === 'dark'
                      ? '#000'
                      : '#fff',
                }}>
                {event.icon && (
                  <span
                    className='absolute inset-0 flex items-center justify-center text-xs'
                    style={{ color: theme.colors.background }}>
                    {event.icon}
                  </span>
                )}
              </div>

              {/* Bottom content (alternating) */}
              {index % 2 === 1 && (
                <div className='mt-4 px-2 text-center'>
                  <p
                    className='mb-1 text-sm font-medium'
                    style={{ color: theme.colors.primary }}>
                    {event.date}
                  </p>
                  <h3
                    className='mb-1 text-base font-semibold'
                    style={{
                      color: theme.colors.text,
                      fontFamily: theme.typography.fontFamily.sans,
                    }}>
                    {event.title}
                  </h3>
                  {event.description && (
                    <p
                      className='text-sm opacity-80'
                      style={{ color: theme.colors.muted }}>
                      {event.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function VerticalTimeline({
  events,
  theme,
}: {
  events: TimelineEvent[]
  theme: any
}) {
  return (
    <div className='mx-auto w-full max-w-3xl'>
      <div className='relative'>
        {/* Vertical line */}
        <div
          className='absolute bottom-0 left-1/2 top-0 w-0.5 -translate-x-1/2'
          style={{ backgroundColor: theme.colors.border }}
        />

        {/* Events */}
        <div className='relative space-y-8'>
          {events.map((event, index) => (
            <div
              key={index}
              className={`flex items-center ${index % 2 === 0 ? '' : 'flex-row-reverse'}`}>
              {/* Content */}
              <div className='flex-1 px-8'>
                <div
                  className={`rounded-xl p-4 transition-all duration-300 hover:scale-105 ${index % 2 === 0 ? 'text-right' : 'text-left'} `}
                  style={{
                    backgroundColor:
                      theme.name === 'dark'
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,0,0,0.03)',
                    border: `1px solid ${event.color || theme.colors.border}`,
                  }}>
                  <p
                    className='mb-1 text-sm font-medium'
                    style={{ color: event.color || theme.colors.primary }}>
                    {event.date}
                  </p>
                  <h3
                    className='mb-1 text-lg font-semibold'
                    style={{
                      color: theme.colors.text,
                      fontFamily: theme.typography.fontFamily.sans,
                    }}>
                    {event.title}
                  </h3>
                  {event.description && (
                    <p
                      className='text-sm opacity-80'
                      style={{ color: theme.colors.muted }}>
                      {event.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Center dot */}
              <div
                className={`relative z-10 flex-shrink-0 rounded-full border-2 bg-white ${event.milestone ? 'h-6 w-6' : 'h-4 w-4'} `}
                style={{
                  borderColor: event.color || theme.colors.primary,
                  backgroundColor: event.milestone
                    ? event.color || theme.colors.primary
                    : theme.name === 'dark'
                      ? '#000'
                      : '#fff',
                }}>
                {event.icon && (
                  <span
                    className='absolute inset-0 flex items-center justify-center text-xs'
                    style={{
                      color: event.milestone
                        ? theme.colors.background
                        : event.color || theme.colors.primary,
                    }}>
                    {event.icon}
                  </span>
                )}
              </div>

              {/* Empty space for alignment */}
              <div className='flex-1' />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
