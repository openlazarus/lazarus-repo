'use client'

import { cn } from '@/lib/utils'

import { ContentBlock } from '../elements/content-block'

import type { Content, Slide, Theme } from '../../types'
import type { SlideChange } from '../../types/diff'

interface ContentSlideWithDiffProps {
  slide: Slide
  originalSlide?: Slide
  theme: Theme
  isFullscreen: boolean
  changes?: SlideChange[]
}

export function ContentSlideWithDiff({
  slide,
  originalSlide,
  theme,
  isFullscreen,
  changes = [],
}: ContentSlideWithDiffProps) {
  const fontSize = isFullscreen ? 'text-2xl' : 'text-base'
  const padding = isFullscreen ? 'p-24' : 'p-12'

  // Helper to render content with diff
  const renderContentWithDiff = (
    content: Content,
    originalContent?: Content,
    contentPath?: string,
  ) => {
    // Find changes related to this content
    const contentChanges = changes.filter(
      (c) => contentPath && c.path.includes(contentPath),
    )

    // If this content was modified, show both old and new
    if (
      contentChanges.some((c) => c.type === 'modified') &&
      originalContent &&
      content.type === 'text'
    ) {
      return (
        <div className='space-y-2'>
          {/* Original content with strikethrough */}
          {originalContent.value && (
            <div className='relative'>
              <div
                className='line-through opacity-60'
                style={{ color: '#dc2626' }}>
                <ContentBlock
                  content={originalContent}
                  theme={theme}
                  isFullscreen={isFullscreen}
                />
              </div>
            </div>
          )}
          {/* New content in green */}
          <div className='relative' style={{ color: '#16a34a' }}>
            <ContentBlock
              content={content}
              theme={theme}
              isFullscreen={isFullscreen}
            />
          </div>
        </div>
      )
    }

    // If content was added
    if (contentChanges.some((c) => c.type === 'added')) {
      return (
        <div className='relative'>
          <div
            className='absolute -left-4 bottom-0 top-0 w-1 rounded'
            style={{ backgroundColor: '#16a34a' }}
          />
          <div style={{ color: '#16a34a' }}>
            <ContentBlock
              content={content}
              theme={theme}
              isFullscreen={isFullscreen}
            />
          </div>
        </div>
      )
    }

    // If content was removed (only show in comparison)
    if (contentChanges.some((c) => c.type === 'removed') && originalContent) {
      return (
        <div className='relative'>
          <div
            className='absolute -left-4 bottom-0 top-0 w-1 rounded'
            style={{ backgroundColor: '#dc2626' }}
          />
          <div className='line-through opacity-60' style={{ color: '#dc2626' }}>
            <ContentBlock
              content={originalContent}
              theme={theme}
              isFullscreen={isFullscreen}
            />
          </div>
        </div>
      )
    }

    // Default rendering
    return (
      <ContentBlock
        content={content}
        theme={theme}
        isFullscreen={isFullscreen}
      />
    )
  }

  // Check for title/subtitle changes
  const titleChange = changes.find((c) => c.path === 'title')
  const subtitleChange = changes.find((c) => c.path === 'subtitle')

  return (
    <div className={cn('flex h-full flex-col', padding)}>
      {/* Title with diff */}
      {(slide.title || originalSlide?.title) && (
        <div className='mb-8'>
          {titleChange?.type === 'modified' ? (
            <div className='space-y-2'>
              <h1
                className={cn(
                  'font-bold line-through opacity-60',
                  isFullscreen ? 'text-6xl' : 'text-4xl',
                )}
                style={{ color: '#dc2626' }}>
                {titleChange.oldValue}
              </h1>
              <h1
                className={cn(
                  'font-bold',
                  isFullscreen ? 'text-6xl' : 'text-4xl',
                )}
                style={{ color: '#16a34a' }}>
                {slide.title}
              </h1>
            </div>
          ) : (
            <h1
              className={cn(
                'font-bold',
                isFullscreen ? 'text-6xl' : 'text-4xl',
                titleChange?.type === 'removed' && 'line-through opacity-60',
              )}
              style={{
                color:
                  titleChange?.type === 'added'
                    ? '#16a34a'
                    : titleChange?.type === 'removed'
                      ? '#dc2626'
                      : theme.colors.text,
              }}>
              {slide.title || originalSlide?.title}
            </h1>
          )}
        </div>
      )}

      {/* Subtitle with diff */}
      {(slide.subtitle || originalSlide?.subtitle) && (
        <div className='mb-12'>
          {subtitleChange?.type === 'modified' ? (
            <div className='space-y-1'>
              <p
                className={cn(
                  'line-through opacity-60',
                  isFullscreen ? 'text-2xl' : 'text-xl',
                )}
                style={{ color: '#dc2626' }}>
                {subtitleChange.oldValue}
              </p>
              <p
                className={cn(isFullscreen ? 'text-2xl' : 'text-xl')}
                style={{ color: '#16a34a' }}>
                {slide.subtitle}
              </p>
            </div>
          ) : (
            <p
              className={cn(
                isFullscreen ? 'text-2xl' : 'text-xl',
                subtitleChange?.type === 'removed' && 'line-through opacity-60',
              )}
              style={{
                color:
                  subtitleChange?.type === 'added'
                    ? '#16a34a'
                    : subtitleChange?.type === 'removed'
                      ? '#dc2626'
                      : theme.colors.secondary,
              }}>
              {slide.subtitle || originalSlide?.subtitle}
            </p>
          )}
        </div>
      )}

      {/* Content with diff */}
      <div className='flex-1 overflow-auto'>
        {slide.layout === 'two-column' &&
        slide.content &&
        typeof slide.content === 'object' &&
        'left' in slide.content ? (
          <div className='grid h-full grid-cols-2 gap-12'>
            <div className='space-y-6'>
              {slide.content.left?.map((content, index) => {
                const originalContent =
                  originalSlide?.content &&
                  typeof originalSlide.content === 'object' &&
                  'left' in originalSlide.content
                    ? originalSlide.content.left?.[index]
                    : undefined

                return (
                  <div key={index}>
                    {renderContentWithDiff(
                      content,
                      originalContent,
                      `content.left[${index}]`,
                    )}
                  </div>
                )
              })}
            </div>
            <div className='space-y-6'>
              {slide.content.right?.map((content, index) => {
                const originalContent =
                  originalSlide?.content &&
                  typeof originalSlide.content === 'object' &&
                  'right' in originalSlide.content
                    ? originalSlide.content.right?.[index]
                    : undefined

                return (
                  <div key={index}>
                    {renderContentWithDiff(
                      content,
                      originalContent,
                      `content.right[${index}]`,
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : Array.isArray(slide.content) ? (
          <div className='space-y-6'>
            {slide.content.map((content, index) => {
              const originalContent = Array.isArray(originalSlide?.content)
                ? originalSlide.content[index]
                : undefined

              return (
                <div key={index}>
                  {renderContentWithDiff(
                    content,
                    originalContent,
                    `content[${index}]`,
                  )}
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
