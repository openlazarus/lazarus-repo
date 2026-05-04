'use client'

import { AgendaSection, Slide } from '../../types'

interface AgendaSlideProps {
  slide: Slide
  theme: any
}

export function AgendaSlide({ slide, theme }: AgendaSlideProps) {
  const { title, subtitle, sections = [] } = slide

  if (!sections || sections.length === 0) {
    return (
      <div className='flex h-full items-center justify-center text-muted-foreground'>
        <p>No agenda sections provided</p>
      </div>
    )
  }

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

      {/* Agenda Items */}
      <div className='flex-1 overflow-auto'>
        <div className='mx-auto max-w-4xl space-y-4'>
          {sections.map((section, index) => (
            <AgendaItem
              key={index}
              section={section}
              theme={theme}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function AgendaItem({
  section,
  theme,
  index,
}: {
  section: AgendaSection
  theme: any
  index: number
}) {
  const { time, title, duration, speaker, description } = section

  return (
    <div
      className='flex gap-6 rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02]'
      style={{
        backgroundColor:
          index % 2 === 0
            ? theme.name === 'dark'
              ? 'rgba(255,255,255,0.03)'
              : 'rgba(0,0,0,0.02)'
            : 'transparent',
        border: `1px solid ${theme.colors.border}20`,
      }}>
      {/* Time Column */}
      {time && (
        <div className='w-24 flex-shrink-0'>
          <p
            className='text-lg font-semibold'
            style={{
              color: theme.colors.primary,
              fontFamily: theme.typography.fontFamily.sans,
            }}>
            {time}
          </p>
          {duration && (
            <p
              className='text-sm opacity-70'
              style={{ color: theme.colors.muted }}>
              {duration}
            </p>
          )}
        </div>
      )}

      {/* Content */}
      <div className='flex-1'>
        <h3
          className='mb-2 text-xl font-semibold'
          style={{
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamily.sans,
          }}>
          {title}
        </h3>

        {speaker && (
          <p
            className='mb-2 text-sm font-medium'
            style={{ color: theme.colors.primary }}>
            {speaker}
          </p>
        )}

        {description && (
          <p
            className='text-base opacity-80'
            style={{ color: theme.colors.muted }}>
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
