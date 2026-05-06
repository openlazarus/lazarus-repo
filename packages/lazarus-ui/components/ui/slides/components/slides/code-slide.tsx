'use client'

import { Slide, Theme } from '../../types'
import { CodeBlock } from '../elements/code-block'

interface CodeSlideProps {
  slide: Slide
  theme: Theme
  isFullscreen: boolean
}

export function CodeSlide({ slide, theme, isFullscreen }: CodeSlideProps) {
  const titleSize = isFullscreen
    ? theme.typography.fontSize['2xl']
    : theme.typography.fontSize.xl

  // Extract code from content or use the slide's content property
  const codeContent = Array.isArray(slide.content) ? slide.content[0] : null
  const code = codeContent?.value || ''
  const language = slide.language || codeContent?.language || 'javascript'
  const highlight = slide.highlight || codeContent?.highlight

  return (
    <div className='flex h-full flex-col'>
      {/* Title */}
      {slide.title && (
        <h2
          className='animate-fade-in-down mb-6'
          style={{
            fontSize: titleSize,
            fontWeight: theme.typography.fontWeight.semibold,
            lineHeight: theme.typography.lineHeight.tight,
          }}>
          {slide.title}
        </h2>
      )}

      {/* Code block */}
      <div className='animate-fade-in-up flex-1 overflow-auto'>
        <CodeBlock
          code={code}
          language={language}
          theme={theme}
          highlight={highlight}
          showLineNumbers={true}
          className='h-full'
        />
      </div>

      {/* Output section */}
      {slide.output?.show && (
        <div
          className='animate-fade-in-up animation-delay-200 mt-4'
          style={{
            height: slide.output.height ? `${slide.output.height}px` : 'auto',
            maxHeight: '30vh',
          }}>
          <div
            className='overflow-auto rounded-lg border p-4'
            style={{
              backgroundColor: theme.colors.muted,
              borderColor: theme.colors.border,
            }}>
            <div
              className='mb-2 text-xs font-medium'
              style={{ color: theme.colors.secondary }}>
              Output:
            </div>
            <pre
              className='text-sm'
              style={{
                fontFamily: theme.typography.fontFamily.mono,
                color: theme.colors.text,
              }}>
              <code>{`// Output would appear here`}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Executable indicator */}
      {slide.executable && (
        <div className='animate-fade-in animation-delay-400 mt-4 flex items-center gap-2'>
          <div
            className='h-2 w-2 animate-pulse rounded-full'
            style={{ backgroundColor: theme.colors.accent }}
          />
          <span className='text-sm' style={{ color: theme.colors.secondary }}>
            Live code execution enabled
          </span>
        </div>
      )}
    </div>
  )
}
