'use client'

import { cn } from '@/lib/utils'
import { useState } from 'react'

interface CodeBlockProps {
  children: string
  className?: string
  inline?: boolean
  node?: { tagName?: string; position?: { start?: { line?: number } } }
}

export function CodeBlock({
  children,
  className,
  inline,
  node,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  // Extract language from className (format: language-xxx)
  const language = className?.replace(/language-/, '') || 'text'

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Determine if inline: react-markdown v10+ doesn't pass inline prop reliably
  // Check if content has newlines (block code) or if it's a short single-line snippet (inline)
  const hasNewlines = children.includes('\n')
  const hasLanguage = className && className.includes('language-')
  const isInline =
    inline === true || (!hasNewlines && !hasLanguage && inline !== false)

  // Inline code - simple, no box styling
  if (isInline) {
    return <code className={className}>{children}</code>
  }

  // Block code
  return (
    <div className='group relative'>
      <div className='absolute right-3 top-3 z-10 flex items-center gap-2'>
        {language && language !== 'text' && (
          <span className='select-none text-[11px] font-medium uppercase tracking-wide text-[hsl(var(--text-tertiary))] opacity-40 transition-opacity group-hover:opacity-60'>
            {language}
          </span>
        )}
        <button
          onClick={handleCopy}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md border transition-all',
            'border-[rgba(0,0,0,0.06)] bg-[#fafafa] dark:border-[rgba(255,255,255,0.08)] dark:bg-[#2c2c2e]',
            'opacity-0 group-hover:opacity-100',
            'hover:border-[rgba(0,0,0,0.12)] hover:bg-[#f0f0f2] dark:hover:border-[rgba(255,255,255,0.16)] dark:hover:bg-[#38383a]',
          )}
          aria-label='Copy code'>
          {copied ? (
            <i className='ri-check-line text-[14px] text-[hsl(var(--lazarus-blue))]' />
          ) : (
            <i className='ri-file-copy-line text-[14px] text-[hsl(var(--text-secondary))]' />
          )}
        </button>
      </div>
      <pre className={className}>
        <code>{children}</code>
      </pre>
    </div>
  )
}
