'use client'

import { cn } from '@/lib/utils'

import { Slide, Theme } from '../../types'

interface TitleSlideProps {
  slide: Slide
  theme: Theme
  isFullscreen: boolean
}

export function TitleSlide({ slide, theme, isFullscreen }: TitleSlideProps) {
  const titleSize = isFullscreen
    ? theme.typography.fontSize['5xl']
    : theme.typography.fontSize['4xl']
  const subtitleSize = isFullscreen
    ? theme.typography.fontSize['2xl']
    : theme.typography.fontSize.xl

  // Find logo if content is an array
  const logoContent = Array.isArray(slide.content)
    ? slide.content.find((c: any) => c.type === 'image' && c.alt === 'logo')
    : null

  return (
    <div className='flex h-full flex-col items-center justify-center text-center'>
      {/* Logo */}
      {logoContent && (
        <div className='mb-8'>
          <img src={logoContent.src} alt='Logo' className='h-20 w-auto' />
        </div>
      )}

      {/* Title */}
      {slide.title && (
        <h1
          className={cn('mb-6 leading-tight', 'animate-fade-in-up')}
          style={{
            fontSize: titleSize,
            fontWeight: theme.typography.fontWeight.bold,
            lineHeight: theme.typography.lineHeight.tight,
          }}>
          {slide.title}
        </h1>
      )}

      {/* Subtitle */}
      {slide.subtitle && (
        <h2
          className={cn(
            'mb-8 leading-relaxed opacity-90',
            'animate-fade-in-up animation-delay-200',
          )}
          style={{
            fontSize: subtitleSize,
            fontWeight: theme.typography.fontWeight.medium,
            lineHeight: theme.typography.lineHeight.normal,
            color: theme.colors.secondary,
          }}>
          {slide.subtitle}
        </h2>
      )}

      {/* Additional content (e.g., buttons, text) */}
      {slide.content && Array.isArray(slide.content) && (
        <div className='mt-8 space-y-4'>
          {slide.content.map((content, index) => {
            switch (content.type) {
              case 'text':
                // Check if this is author or date info
                if (
                  content.value?.includes('by ') ||
                  content.style?.align === 'center'
                ) {
                  return (
                    <p
                      key={index}
                      className='animate-fade-in-up animation-delay-800 mt-auto'
                      style={{
                        fontSize: theme.typography.fontSize.base,
                        color: theme.colors.secondary,
                      }}>
                      {content.value}
                    </p>
                  )
                }
                return (
                  <p
                    key={index}
                    className='animate-fade-in-up animation-delay-400'
                    style={{
                      fontSize: theme.typography.fontSize.lg,
                      color: theme.colors.secondary,
                    }}>
                    {content.value}
                  </p>
                )
              case 'buttons':
                return (
                  <div
                    key={index}
                    className='animate-fade-in-up animation-delay-600 flex gap-4'>
                    {content.items?.map((button: any, btnIndex: number) => (
                      <a
                        key={btnIndex}
                        href={button.url || '#'}
                        className={cn(
                          'rounded-lg px-6 py-3 font-medium transition-all duration-200',
                          'hover:scale-105 hover:shadow-lg',
                          button.style === 'primary'
                            ? 'bg-primary text-white'
                            : 'border-2 border-current',
                        )}
                        style={{
                          backgroundColor:
                            button.style === 'primary'
                              ? theme.colors.primary
                              : 'transparent',
                          borderColor:
                            button.style !== 'primary'
                              ? theme.colors.primary
                              : undefined,
                          color:
                            button.style === 'primary'
                              ? '#ffffff'
                              : theme.colors.primary,
                        }}>
                        {button.text}
                      </a>
                    ))}
                  </div>
                )
              default:
                return null
            }
          })}
        </div>
      )}
    </div>
  )
}
