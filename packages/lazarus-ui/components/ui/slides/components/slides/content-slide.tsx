'use client'

import { cn } from '@/lib/utils'

import { ColumnContent, Content, Slide, Theme } from '../../types'
import { ContentBlock } from '../elements/content-block'

interface ContentSlideProps {
  slide: Slide
  theme: Theme
  isFullscreen: boolean
}

export function ContentSlide({
  slide,
  theme,
  isFullscreen,
}: ContentSlideProps) {
  const titleSize = isFullscreen
    ? theme.typography.fontSize['3xl']
    : theme.typography.fontSize['2xl']

  // Determine layout
  const layout = slide.layout || 'single'
  const isGridLayout = typeof layout === 'object' && layout.type === 'grid'
  const gridColumns = isGridLayout ? layout.columns : 1
  const gridGap = isGridLayout
    ? theme.spacing.grid.gap[layout.gap || 'medium']
    : undefined

  const renderContent = (content: Content, index: number) => (
    <ContentBlock
      key={index}
      content={content}
      theme={theme}
      isFullscreen={isFullscreen}
      animationDelay={index * 100}
    />
  )

  const renderColumnContent = () => {
    if (!slide.content || Array.isArray(slide.content)) {
      return null
    }

    const columnContent = slide.content as ColumnContent
    const columns = Object.keys(columnContent)

    if (
      layout === 'two-column' &&
      columns.includes('left') &&
      columns.includes('right')
    ) {
      return (
        <div
          className='grid h-full grid-cols-2'
          style={{ gap: theme.spacing.content.gap }}>
          <div className='space-y-4'>
            {columnContent.left?.map(renderContent)}
          </div>
          <div className='space-y-4'>
            {columnContent.right?.map(renderContent)}
          </div>
        </div>
      )
    }

    // Generic column layout
    return (
      <div
        className='grid h-full'
        style={{
          gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
          gap: theme.spacing.content.gap,
        }}>
        {columns.map((column) => (
          <div key={column} className='space-y-4'>
            {columnContent[column]?.map(renderContent)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Title */}
      {slide.title && (
        <h2
          className={cn(
            'animate-fade-in-down mb-8',
            layout === 'single' ? 'text-center' : 'text-left',
          )}
          style={{
            fontSize: titleSize,
            fontWeight: theme.typography.fontWeight.semibold,
            lineHeight: theme.typography.lineHeight.tight,
          }}>
          {slide.title}
        </h2>
      )}

      {/* Content */}
      <div className='flex-1 overflow-auto'>
        {Array.isArray(slide.content) ? (
          // Array content
          layout === 'single' ? (
            <div className='space-y-6'>{slide.content.map(renderContent)}</div>
          ) : isGridLayout ? (
            <div
              className='grid h-full'
              style={{
                gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
                gap: gridGap,
              }}>
              {slide.content.map(renderContent)}
            </div>
          ) : (
            // Default two-column for array content
            <div
              className='grid h-full grid-cols-2'
              style={{ gap: theme.spacing.content.gap }}>
              <div className='space-y-4'>
                {slide.content
                  .slice(0, Math.ceil(slide.content.length / 2))
                  .map(renderContent)}
              </div>
              <div className='space-y-4'>
                {slide.content
                  .slice(Math.ceil(slide.content.length / 2))
                  .map(renderContent)}
              </div>
            </div>
          )
        ) : (
          // Column content
          renderColumnContent()
        )}
      </div>
    </div>
  )
}
