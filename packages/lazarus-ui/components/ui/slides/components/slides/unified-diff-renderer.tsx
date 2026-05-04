'use client'

import * as Diff from 'diff'

import { cn } from '@/lib/utils'

import type { Slide, Theme } from '../../types'

interface UnifiedDiffRendererProps {
  originalSlide?: Slide
  modifiedSlide: Slide
  theme: Theme
  isFullscreen: boolean
}

export function UnifiedDiffRenderer({
  originalSlide,
  modifiedSlide,
  theme,
  isFullscreen,
}: UnifiedDiffRendererProps) {
  const fontSize = isFullscreen ? 'text-2xl' : 'text-base'
  const padding = isFullscreen ? 'p-24' : 'p-12'

  // Helper to render text with word-level diff
  const renderTextDiff = (oldText: string = '', newText: string = '') => {
    const diff = Diff.diffWords(oldText, newText)

    return (
      <span>
        {diff.map((part, index) => {
          if (part.added) {
            return (
              <span
                key={index}
                className='inline-block rounded px-1'
                style={{
                  backgroundColor: '#bbf7d0',
                  color: '#14532d',
                  textDecoration: 'none',
                }}>
                {part.value}
              </span>
            )
          }
          if (part.removed) {
            return (
              <span
                key={index}
                className='inline-block rounded px-1 line-through'
                style={{
                  backgroundColor: '#fecaca',
                  color: '#7f1d1d',
                  textDecoration: 'line-through',
                }}>
                {part.value}
              </span>
            )
          }
          return <span key={index}>{part.value}</span>
        })}
      </span>
    )
  }

  // Render different slide types with diff support
  const renderSlideContent = () => {
    switch (modifiedSlide.type) {
      case 'title':
        return (
          <div className='flex h-full flex-col items-center justify-center text-center'>
            <h1
              className={cn(
                'mb-8 font-bold',
                isFullscreen ? 'text-6xl' : 'text-4xl',
              )}>
              {renderTextDiff(originalSlide?.title, modifiedSlide.title)}
            </h1>
            {(originalSlide?.subtitle || modifiedSlide.subtitle) && (
              <p className={cn('mb-12', isFullscreen ? 'text-2xl' : 'text-xl')}>
                {renderTextDiff(
                  originalSlide?.subtitle || '',
                  modifiedSlide.subtitle || '',
                )}
              </p>
            )}
          </div>
        )

      case 'content':
        return (
          <div className={cn('flex h-full flex-col', padding)}>
            {modifiedSlide.title && (
              <h2
                className={cn(
                  'mb-8 font-bold',
                  isFullscreen ? 'text-5xl' : 'text-3xl',
                )}>
                {renderTextDiff(originalSlide?.title, modifiedSlide.title)}
              </h2>
            )}
            {renderContentDiff()}
          </div>
        )

      case 'metrics':
        return (
          <div className={cn('flex h-full flex-col', padding)}>
            {modifiedSlide.title && (
              <h2
                className={cn(
                  'mb-8 font-bold',
                  isFullscreen ? 'text-5xl' : 'text-3xl',
                )}>
                {renderTextDiff(originalSlide?.title, modifiedSlide.title)}
              </h2>
            )}
            {renderMetricsDiff()}
          </div>
        )

      case 'comparison':
        return (
          <div className={cn('flex h-full flex-col', padding)}>
            {modifiedSlide.title && (
              <h2
                className={cn(
                  'mb-8 font-bold',
                  isFullscreen ? 'text-5xl' : 'text-3xl',
                )}>
                {renderTextDiff(originalSlide?.title, modifiedSlide.title)}
              </h2>
            )}
            {renderComparisonDiff()}
          </div>
        )

      case 'summary':
        return (
          <div className={cn('flex h-full flex-col', padding)}>
            {modifiedSlide.title && (
              <h2
                className={cn(
                  'mb-8 font-bold',
                  isFullscreen ? 'text-5xl' : 'text-3xl',
                )}>
                {renderTextDiff(originalSlide?.title, modifiedSlide.title)}
              </h2>
            )}
            {renderSummaryDiff()}
          </div>
        )

      case 'timeline':
        return (
          <div className={cn('flex h-full flex-col', padding)}>
            {modifiedSlide.title && (
              <h2
                className={cn(
                  'mb-8 font-bold',
                  isFullscreen ? 'text-5xl' : 'text-3xl',
                )}>
                {renderTextDiff(originalSlide?.title, modifiedSlide.title)}
              </h2>
            )}
            {renderTimelineDiff()}
          </div>
        )

      default:
        return renderGenericDiff()
    }
  }

  // Render content slide diff
  const renderContentDiff = () => {
    const oldContent = originalSlide?.content
    const newContent = modifiedSlide.content

    if (!newContent) return null

    // Handle different content layouts
    if (
      modifiedSlide.layout === 'two-column' &&
      typeof newContent === 'object' &&
      'left' in newContent
    ) {
      return (
        <div className='grid h-full grid-cols-2 gap-12'>
          <div className='space-y-6'>
            {renderContentArrayDiff(
              oldContent &&
                typeof oldContent === 'object' &&
                'left' in oldContent
                ? oldContent.left || []
                : [],
              newContent.left || [],
            )}
          </div>
          <div className='space-y-6'>
            {renderContentArrayDiff(
              oldContent &&
                typeof oldContent === 'object' &&
                'right' in oldContent
                ? oldContent.right || []
                : [],
              newContent.right || [],
            )}
          </div>
        </div>
      )
    }

    if (Array.isArray(newContent)) {
      return (
        <div className='space-y-6'>
          {renderContentArrayDiff(
            Array.isArray(oldContent) ? oldContent : [],
            newContent,
          )}
        </div>
      )
    }

    return null
  }

  // Render array of content with diff
  const renderContentArrayDiff = (oldArray: any[], newArray: any[]) => {
    const maxLength = Math.max(oldArray.length, newArray.length)
    const elements = []

    for (let i = 0; i < maxLength; i++) {
      const oldItem = oldArray[i]
      const newItem = newArray[i]

      if (!oldItem && newItem) {
        // Added item
        elements.push(
          <div key={i} className='relative pl-4'>
            <div
              className='absolute bottom-0 left-0 top-0 w-1 rounded'
              style={{ backgroundColor: '#16a34a' }}
            />
            <div
              style={{
                backgroundColor: '#bbf7d0',
                padding: '0.5rem',
                borderRadius: '0.25rem',
              }}>
              {renderContentItem(newItem, fontSize)}
            </div>
          </div>,
        )
      } else if (oldItem && !newItem) {
        // Removed item
        elements.push(
          <div key={i} className='relative pl-4 opacity-60'>
            <div
              className='absolute bottom-0 left-0 top-0 w-1 rounded'
              style={{ backgroundColor: '#dc2626' }}
            />
            <div
              style={{
                backgroundColor: '#fecaca',
                padding: '0.5rem',
                borderRadius: '0.25rem',
              }}>
              {renderContentItem(oldItem, fontSize)}
            </div>
          </div>,
        )
      } else if (oldItem && newItem) {
        // Modified or unchanged item
        if (
          oldItem.type === 'text' &&
          newItem.type === 'text' &&
          oldItem.value !== newItem.value
        ) {
          elements.push(
            <div key={i} className={fontSize}>
              {renderTextDiff(oldItem.value, newItem.value)}
            </div>,
          )
        } else {
          elements.push(
            <div key={i} className={fontSize}>
              {renderContentItem(newItem, fontSize)}
            </div>,
          )
        }
      }
    }

    return elements
  }

  // Render individual content item
  const renderContentItem = (item: any, className: string) => {
    if (!item) return null

    switch (item.type) {
      case 'text':
        return (
          <div
            className={className}
            dangerouslySetInnerHTML={{
              __html: parseMarkdown(item.value || ''),
            }}
          />
        )
      case 'list':
        return (
          <ul className={cn('list-disc space-y-2 pl-6', className)}>
            {item.items?.map((listItem: string, idx: number) => (
              <li key={idx}>{listItem}</li>
            ))}
          </ul>
        )
      case 'quote':
        return (
          <blockquote
            className={cn('border-l-4 pl-4 italic', className)}
            style={{ borderColor: theme.colors.primary }}>
            <p>{item.text}</p>
            {item.author && (
              <footer className='mt-2 text-sm'>— {item.author}</footer>
            )}
          </blockquote>
        )
      default:
        return (
          <div className={className}>Unsupported content type: {item.type}</div>
        )
    }
  }

  // Render metrics diff
  const renderMetricsDiff = () => {
    const oldMetrics = originalSlide?.metrics || []
    const newMetrics = modifiedSlide.metrics || []

    const metricsMap = new Map()

    // Add all metrics to map
    oldMetrics.forEach((m: any) => metricsMap.set(m.label, { old: m }))
    newMetrics.forEach((m: any) => {
      const existing = metricsMap.get(m.label) || {}
      metricsMap.set(m.label, { ...existing, new: m })
    })

    return (
      <div className='grid grid-cols-2 gap-8 md:grid-cols-3'>
        {Array.from(metricsMap.entries()).map(
          ([label, { old, new: newMetric }]) => (
            <div key={label} className='text-center'>
              <div
                className={cn(
                  'mb-2 text-lg',
                  !old && 'text-green-600',
                  !newMetric && 'text-red-600 line-through',
                )}>
                {label}
              </div>
              <div
                className={cn(
                  'mb-1 font-bold',
                  isFullscreen ? 'text-5xl' : 'text-3xl',
                )}>
                {old && newMetric && old.value !== newMetric.value ? (
                  renderTextDiff(old.value, newMetric.value)
                ) : (
                  <span
                    className={cn(
                      !old && 'text-green-600',
                      !newMetric && 'text-red-600 line-through',
                    )}>
                    {newMetric?.value || old?.value}
                  </span>
                )}
              </div>
              {(newMetric?.change || old?.change) && (
                <div
                  className={cn(
                    'text-sm',
                    newMetric?.trend === 'up'
                      ? 'text-green-500'
                      : 'text-red-500',
                  )}>
                  {old && newMetric && old.change !== newMetric.change
                    ? renderTextDiff(old.change, newMetric.change)
                    : newMetric?.change || old?.change}
                </div>
              )}
            </div>
          ),
        )}
      </div>
    )
  }

  // Render comparison diff
  const renderComparisonDiff = () => {
    const oldItems = originalSlide?.items || []
    const newItems = modifiedSlide.items || []

    return (
      <div className='grid grid-cols-2 gap-8'>
        {newItems.map((itemObj: any, index: number) => {
          const key = Object.keys(itemObj)[0]
          const newItem = itemObj[key]
          const oldItem = oldItems[index]?.[key]

          return (
            <div key={key} className='space-y-4'>
              <h3 className='text-xl font-semibold'>
                {oldItem && newItem
                  ? renderTextDiff(oldItem.title, newItem.title)
                  : newItem.title}
              </h3>
              <ul className='space-y-2'>
                {renderPointsDiff(oldItem?.points || [], newItem.points || [])}
              </ul>
            </div>
          )
        })}
      </div>
    )
  }

  // Render points diff
  const renderPointsDiff = (oldPoints: string[], newPoints: string[]) => {
    const maxLength = Math.max(oldPoints.length, newPoints.length)
    const elements = []

    for (let i = 0; i < maxLength; i++) {
      if (!oldPoints[i] && newPoints[i]) {
        elements.push(
          <li key={i} className='flex items-start'>
            <span className='mr-2 text-green-600'>+</span>
            <span
              style={{
                backgroundColor: '#bbf7d0',
                padding: '0.125rem 0.25rem',
                borderRadius: '0.125rem',
              }}>
              {newPoints[i]}
            </span>
          </li>,
        )
      } else if (oldPoints[i] && !newPoints[i]) {
        elements.push(
          <li key={i} className='flex items-start opacity-60'>
            <span className='mr-2 text-red-600'>-</span>
            <span
              className='line-through'
              style={{
                backgroundColor: '#fecaca',
                padding: '0.125rem 0.25rem',
                borderRadius: '0.125rem',
              }}>
              {oldPoints[i]}
            </span>
          </li>,
        )
      } else if (oldPoints[i] !== newPoints[i]) {
        elements.push(
          <li key={i}>{renderTextDiff(oldPoints[i], newPoints[i])}</li>,
        )
      } else {
        elements.push(<li key={i}>{newPoints[i]}</li>)
      }
    }

    return elements
  }

  // Render summary diff
  const renderSummaryDiff = () => {
    const oldHighlights = originalSlide?.highlights || []
    const newHighlights = modifiedSlide.highlights || []
    const maxLength = Math.max(oldHighlights.length, newHighlights.length)
    const elements = []

    for (let i = 0; i < maxLength; i++) {
      if (!oldHighlights[i] && newHighlights[i]) {
        elements.push(
          <li key={i} className='flex items-start gap-2'>
            <span className='text-green-600'>+</span>
            <span
              style={{
                backgroundColor: '#bbf7d0',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
              }}>
              {newHighlights[i]}
            </span>
          </li>,
        )
      } else if (oldHighlights[i] && !newHighlights[i]) {
        elements.push(
          <li key={i} className='flex items-start gap-2 opacity-60'>
            <span className='text-red-600'>-</span>
            <span
              className='line-through'
              style={{
                backgroundColor: '#fecaca',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
              }}>
              {oldHighlights[i]}
            </span>
          </li>,
        )
      } else if (oldHighlights[i] !== newHighlights[i]) {
        elements.push(
          <li key={i} className='flex items-start gap-2'>
            <span className='text-blue-600'>•</span>
            {renderTextDiff(oldHighlights[i], newHighlights[i])}
          </li>,
        )
      } else {
        elements.push(
          <li key={i} className='flex items-start gap-2'>
            <span className='text-gray-400'>•</span>
            {newHighlights[i]}
          </li>,
        )
      }
    }

    return <ul className='space-y-3'>{elements}</ul>
  }

  // Render timeline diff
  const renderTimelineDiff = () => {
    const oldEvents = originalSlide?.events || []
    const newEvents = modifiedSlide.events || []

    return (
      <div className='space-y-6'>
        {newEvents.map((event: any, index: number) => {
          const oldEvent = oldEvents[index]
          const isNew = !oldEvent
          const isModified =
            oldEvent &&
            (oldEvent.title !== event.title ||
              oldEvent.description !== event.description)

          return (
            <div
              key={index}
              className={cn(
                'border-l-4 pl-4',
                isNew && 'border-green-500',
                isModified && 'border-yellow-500',
                !isNew && !isModified && 'border-gray-300',
              )}>
              <div className='text-sm font-medium text-gray-500'>
                {oldEvent && event.date !== oldEvent.date
                  ? renderTextDiff(oldEvent.date, event.date)
                  : event.date}
              </div>
              <div
                className={cn(
                  'mt-1 font-semibold',
                  isFullscreen ? 'text-xl' : 'text-lg',
                )}>
                {oldEvent ? (
                  renderTextDiff(oldEvent.title || '', event.title || '')
                ) : (
                  <span
                    style={{
                      backgroundColor: '#bbf7d0',
                      padding: '0.125rem 0.25rem',
                      borderRadius: '0.125rem',
                    }}>
                    {event.title}
                  </span>
                )}
              </div>
              {event.description && (
                <div className='mt-1 text-gray-600'>
                  {oldEvent ? (
                    renderTextDiff(
                      oldEvent.description || '',
                      event.description,
                    )
                  ) : (
                    <span
                      style={{
                        backgroundColor: '#bbf7d0',
                        padding: '0.125rem 0.25rem',
                        borderRadius: '0.125rem',
                      }}>
                      {event.description}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Show removed events */}
        {oldEvents.slice(newEvents.length).map((event: any, index: number) => (
          <div
            key={`removed-${index}`}
            className='border-l-4 border-red-500 pl-4 opacity-60'>
            <div className='text-sm font-medium text-gray-500 line-through'>
              {event.date}
            </div>
            <div
              className={cn(
                'mt-1 font-semibold line-through',
                isFullscreen ? 'text-xl' : 'text-lg',
              )}
              style={{
                backgroundColor: '#fecaca',
                padding: '0.125rem 0.25rem',
                borderRadius: '0.125rem',
              }}>
              {event.title}
            </div>
            {event.description && (
              <div
                className='mt-1 text-gray-600 line-through'
                style={{
                  backgroundColor: '#fecaca',
                  padding: '0.125rem 0.25rem',
                  borderRadius: '0.125rem',
                }}>
                {event.description}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  // Generic diff for other slide types
  const renderGenericDiff = () => {
    return (
      <div className={cn('flex h-full flex-col', padding)}>
        {modifiedSlide.title && (
          <h2
            className={cn(
              'mb-8 font-bold',
              isFullscreen ? 'text-5xl' : 'text-3xl',
            )}>
            {originalSlide?.title
              ? renderTextDiff(originalSlide.title, modifiedSlide.title)
              : modifiedSlide.title}
          </h2>
        )}
        <div className='flex flex-1 items-center justify-center'>
          <div className='text-center'>
            <p className='mb-4 text-gray-500'>
              Diff view for {modifiedSlide.type} slides
            </p>
            <div className='inline-flex items-center gap-2 rounded-lg bg-yellow-100 px-4 py-2 text-yellow-800'>
              <span>This slide has been</span>
              <span className='font-semibold'>
                {!originalSlide ? 'added' : 'modified'}
              </span>
            </div>
            <div className='mt-4 text-sm text-gray-600'>
              Full diff support coming soon for {modifiedSlide.type} slides
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Simple markdown parser
  const parseMarkdown = (text: string) => {
    return text
      .replace(/### (.*?)$/gm, '<h3 class="font-semibold text-xl mb-2">$1</h3>')
      .replace(/## (.*?)$/gm, '<h2 class="font-semibold text-2xl mb-3">$1</h2>')
      .replace(/# (.*?)$/gm, '<h1 class="font-bold text-3xl mb-4">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />')
  }

  return (
    <div
      className='h-full w-full overflow-auto'
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily.sans,
      }}>
      {renderSlideContent()}
    </div>
  )
}
