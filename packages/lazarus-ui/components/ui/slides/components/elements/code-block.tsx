'use client'

import { cn } from '@/lib/utils'

import { Theme } from '../../types'

interface CodeBlockProps {
  code: string
  language: string
  theme: Theme
  highlight?: number[] | string
  showLineNumbers?: boolean
  className?: string
}

export function CodeBlock({
  code,
  language,
  theme,
  highlight,
  showLineNumbers = true,
  className,
}: CodeBlockProps) {
  const lines = code.split('\n')

  // Parse highlight prop
  const highlightedLines = new Set<number>()
  if (highlight) {
    if (Array.isArray(highlight)) {
      highlight.forEach((line) => highlightedLines.add(line))
    } else if (typeof highlight === 'string') {
      // Parse ranges like "1-3,5,7-9"
      highlight.split(',').forEach((part) => {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map((n) => parseInt(n.trim()))
          for (let i = start; i <= end; i++) {
            highlightedLines.add(i)
          }
        } else {
          highlightedLines.add(parseInt(part.trim()))
        }
      })
    }
  }

  // For now, we'll render a simple code block with basic styling
  // In a real implementation, you'd use a library like Prism.js or Shiki
  return (
    <div className={cn('relative overflow-hidden rounded-lg', className)}>
      <div
        className='flex items-center justify-between px-4 py-2'
        style={{
          backgroundColor: theme.colors.code.background,
          borderBottom: `1px solid ${theme.colors.border}`,
        }}>
        <span
          className='text-xs font-medium'
          style={{ color: theme.colors.secondary }}>
          {language}
        </span>
        <button
          className='rounded px-2 py-1 text-xs transition-colors hover:bg-white/10'
          style={{ color: theme.colors.secondary }}
          onClick={() => navigator.clipboard.writeText(code)}>
          Copy
        </button>
      </div>

      <pre
        className='overflow-x-auto p-4'
        style={{
          backgroundColor: theme.colors.code.background,
          color: theme.colors.code.text,
          fontFamily: theme.typography.fontFamily.mono,
          fontSize: theme.typography.fontSize.sm,
          lineHeight: theme.typography.lineHeight.relaxed,
        }}>
        <code>
          {lines.map((line, index) => {
            const lineNumber = index + 1
            const isHighlighted = highlightedLines.has(lineNumber)

            return (
              <div
                key={index}
                className={cn(
                  'relative flex',
                  isHighlighted && 'bg-yellow-500/10',
                )}>
                {showLineNumbers && (
                  <span
                    className='mr-4 select-none text-right'
                    style={{
                      color: theme.colors.code.comment,
                      minWidth: '2.5rem',
                      display: 'inline-block',
                    }}>
                    {lineNumber}
                  </span>
                )}
                <span
                  className={cn('flex-1', isHighlighted && 'relative')}
                  dangerouslySetInnerHTML={{
                    __html: syntaxHighlight(line, language, theme),
                  }}
                />
              </div>
            )
          })}
        </code>
      </pre>
    </div>
  )
}

// Basic syntax highlighting function
// In production, you'd use a proper syntax highlighting library
function syntaxHighlight(code: string, language: string, theme: Theme): string {
  // Basic keyword highlighting for common languages
  const keywords: Record<string, string[]> = {
    javascript: [
      'const',
      'let',
      'var',
      'function',
      'return',
      'if',
      'else',
      'for',
      'while',
      'class',
      'import',
      'export',
      'from',
      'async',
      'await',
    ],
    typescript: [
      'const',
      'let',
      'var',
      'function',
      'return',
      'if',
      'else',
      'for',
      'while',
      'class',
      'import',
      'export',
      'from',
      'async',
      'await',
      'interface',
      'type',
      'enum',
    ],
    python: [
      'def',
      'class',
      'if',
      'else',
      'elif',
      'for',
      'while',
      'import',
      'from',
      'return',
      'yield',
      'with',
      'as',
      'try',
      'except',
    ],
    yaml: ['true', 'false', 'null'],
  }

  let highlighted = code
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Highlight strings
  highlighted = highlighted.replace(
    /(["'])(?:(?=(\\?))\2.)*?\1/g,
    `<span style="color: ${theme.colors.code.string}">$&</span>`,
  )

  // Highlight numbers
  highlighted = highlighted.replace(
    /\b(\d+(?:\.\d+)?)\b/g,
    `<span style="color: ${theme.colors.code.number}">$1</span>`,
  )

  // Highlight comments
  if (language === 'javascript' || language === 'typescript') {
    highlighted = highlighted.replace(
      /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
      `<span style="color: ${theme.colors.code.comment}">$1</span>`,
    )
  } else if (language === 'python' || language === 'yaml') {
    highlighted = highlighted.replace(
      /(#.*$)/gm,
      `<span style="color: ${theme.colors.code.comment}">$1</span>`,
    )
  }

  // Highlight keywords
  const langKeywords = keywords[language] || []
  langKeywords.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g')
    highlighted = highlighted.replace(
      regex,
      `<span style="color: ${theme.colors.code.keyword}; font-weight: 500">$&</span>`,
    )
  })

  // Highlight functions (basic)
  highlighted = highlighted.replace(
    /\b([a-zA-Z_]\w*)\s*\(/g,
    `<span style="color: ${theme.colors.code.function}">$1</span>(`,
  )

  return highlighted
}
