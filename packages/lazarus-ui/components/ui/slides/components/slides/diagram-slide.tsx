'use client'

import { useEffect, useRef } from 'react'

import { Slide, Theme } from '../../types'

interface DiagramSlideProps {
  slide: Slide
  theme: Theme
  isFullscreen: boolean
}

export function DiagramSlide({
  slide,
  theme,
  isFullscreen,
}: DiagramSlideProps) {
  const diagramRef = useRef<HTMLDivElement>(null)
  const titleSize = isFullscreen
    ? theme.typography.fontSize['2xl']
    : theme.typography.fontSize.xl

  // Extract diagram content
  const diagramContent = Array.isArray(slide.content) ? slide.content[0] : null
  const diagramCode = diagramContent?.value || ''

  useEffect(() => {
    // In a real implementation, this would render Mermaid diagrams
    // For now, we'll just show a placeholder
    if (typeof window !== 'undefined' && diagramRef.current) {
      // Dynamic import of mermaid would go here
      // import('mermaid').then(mermaid => { ... })
    }
  }, [diagramCode])

  return (
    <div className='flex h-full flex-col'>
      {/* Title */}
      {slide.title && (
        <h2
          className='animate-fade-in-down mb-6 text-center'
          style={{
            fontSize: titleSize,
            fontWeight: theme.typography.fontWeight.semibold,
            lineHeight: theme.typography.lineHeight.tight,
          }}>
          {slide.title}
        </h2>
      )}

      {/* Diagram container */}
      <div className='animate-fade-in-up flex flex-1 items-center justify-center overflow-auto'>
        <div
          ref={diagramRef}
          className='relative max-w-full'
          style={{
            backgroundColor: theme.colors.background,
          }}>
          {/* Placeholder for diagram */}
          <div
            className='rounded-lg border-2 border-dashed p-12 text-center'
            style={{
              borderColor: theme.colors.border,
              color: theme.colors.secondary,
            }}>
            <svg
              className='mx-auto mb-4 h-16 w-16'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
              />
            </svg>
            <p className='mb-2 text-lg font-medium'>Diagram Placeholder</p>
            <p className='text-sm'>
              In production, this would render a Mermaid diagram
            </p>
            {diagramCode && (
              <details className='mt-4 text-left'>
                <summary className='cursor-pointer text-sm font-medium'>
                  View diagram code
                </summary>
                <pre
                  className='mt-2 overflow-x-auto rounded bg-gray-100 p-3 text-xs'
                  style={{
                    backgroundColor: theme.colors.code.background,
                    color: theme.colors.code.text,
                    fontFamily: theme.typography.fontFamily.mono,
                  }}>
                  <code>{diagramCode}</code>
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>

      {/* Caption */}
      {diagramContent?.alt && (
        <p
          className='animate-fade-in animation-delay-200 mt-4 text-center text-sm'
          style={{ color: theme.colors.secondary }}>
          {diagramContent.alt}
        </p>
      )}
    </div>
  )
}
