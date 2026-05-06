'use client'

import { cn } from '@/lib/utils'

import { Content, Theme } from '../../types'
import { CodeBlock } from './code-block'

// Simple markdown rendering function
function renderMarkdown(text: string): string {
  return (
    text
      // Bold text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic text
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Inline code
      .replace(
        /`(.+?)`/g,
        '<code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm">$1</code>',
      )
      // Links
      .replace(
        /\[(.+?)\]\((.+?)\)/g,
        '<a href="$2" class="text-blue-600 hover:underline">$1</a>',
      )
      // Line breaks
      .replace(/\n/g, '<br/>')
  )
}

interface ContentBlockProps {
  content: Content
  theme: Theme
  isFullscreen: boolean
  animationDelay?: number
}

export function ContentBlock({
  content,
  theme,
  isFullscreen,
  animationDelay = 0,
}: ContentBlockProps) {
  const animationClass = `animate-fade-in-up animation-delay-${animationDelay}`

  switch (content.type) {
    case 'text':
      return (
        <div
          className={cn('prose prose-lg max-w-none', animationClass)}
          style={{
            fontSize: content.style?.size
              ? theme.typography.fontSize[
                  content.style.size === 'small'
                    ? 'sm'
                    : content.style.size === 'large'
                      ? 'lg'
                      : 'base'
                ]
              : theme.typography.fontSize.base,
            textAlign: content.style?.align || 'left',
            color: content.style?.color || theme.colors.text,
            fontWeight: content.style?.fontWeight
              ? theme.typography.fontWeight[content.style.fontWeight]
              : theme.typography.fontWeight.normal,
          }}
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(content.value || ''),
          }}
        />
      )

    case 'list':
      const listStyle = content.style?.bullets || 'disc'
      const ListTag = listStyle === 'numbers' ? 'ol' : 'ul'

      return (
        <ListTag
          className={cn(
            'space-y-2',
            animationClass,
            listStyle === 'none' && 'list-none',
          )}
          style={{
            listStyleType: listStyle === 'numbers' ? 'decimal' : listStyle,
            paddingLeft: listStyle === 'none' ? 0 : '1.5rem',
          }}>
          {content.items?.map((item, index) => {
            const itemText = typeof item === 'string' ? item : item.text
            const subItems = typeof item === 'object' ? item.subItems : null

            return (
              <li
                key={index}
                style={{
                  fontSize: theme.typography.fontSize.base,
                  color: theme.colors.text,
                }}>
                {itemText}
                {subItems && (
                  <ul
                    className='mt-2 space-y-1'
                    style={{ paddingLeft: '1.5rem' }}>
                    {subItems.map((subItem, subIndex) => (
                      <li
                        key={subIndex}
                        style={{
                          fontSize: theme.typography.fontSize.sm,
                          color: theme.colors.secondary,
                        }}>
                        {subItem}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ListTag>
      )

    case 'code':
      return (
        <CodeBlock
          code={content.value || ''}
          language={content.language || 'text'}
          theme={theme}
          highlight={content.highlight}
          className={animationClass}
        />
      )

    case 'image':
      return (
        <div className={cn('relative', animationClass)}>
          <img
            src={content.src}
            alt={content.alt || ''}
            className='mx-auto max-h-full max-w-full rounded-lg shadow-lg'
            style={{
              maxHeight: isFullscreen ? '60vh' : '40vh',
            }}
          />
          {content.alt && (
            <p
              className='mt-2 text-center text-sm'
              style={{ color: theme.colors.secondary }}>
              {content.alt}
            </p>
          )}
        </div>
      )

    case 'video':
      return (
        <div className={cn('relative', animationClass)}>
          <video
            src={content.src}
            controls
            className='mx-auto max-h-full max-w-full rounded-lg shadow-lg'
            style={{
              maxHeight: isFullscreen ? '60vh' : '40vh',
            }}>
            Your browser does not support the video tag.
          </video>
        </div>
      )

    case 'quote':
      return (
        <blockquote
          className={cn('border-l-4 pl-6 italic', animationClass)}
          style={{
            borderColor: theme.colors.primary,
            fontSize: theme.typography.fontSize.lg,
            color: theme.colors.secondary,
          }}>
          <p className='mb-2'>{content.text}</p>
          {content.author && (
            <cite
              className='block text-sm not-italic'
              style={{ color: theme.colors.muted }}>
              — {content.author}
            </cite>
          )}
        </blockquote>
      )

    case 'feature':
      return (
        <div
          className={cn('rounded-lg border p-4 text-center', animationClass)}
          style={{
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.muted,
          }}>
          {content.icon && <div className='mb-2 text-4xl'>{content.icon}</div>}
          <h4
            className='mb-1 font-semibold'
            style={{
              fontSize: theme.typography.fontSize.lg,
              color: theme.colors.text,
            }}>
            {content.value}
          </h4>
          {content.description && (
            <p
              style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.secondary,
              }}>
              {content.description}
            </p>
          )}
        </div>
      )

    case 'buttons':
      return (
        <div className={cn('flex gap-4', animationClass)}>
          {content.items?.map((button: any, index: number) => (
            <a
              key={index}
              href={button.url || '#'}
              className={cn(
                'rounded-lg px-6 py-3 font-medium transition-all duration-200',
                'hover:scale-105 hover:shadow-lg',
                button.style === 'primary' ? 'text-white' : 'border-2',
              )}
              style={{
                backgroundColor:
                  button.style === 'primary'
                    ? theme.colors.primary
                    : 'transparent',
                borderColor:
                  button.style !== 'primary' ? theme.colors.primary : undefined,
                color:
                  button.style === 'primary' ? '#ffffff' : theme.colors.primary,
              }}>
              {button.text}
            </a>
          ))}
        </div>
      )

    default:
      return null
  }
}
