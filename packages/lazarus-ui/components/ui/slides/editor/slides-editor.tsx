'use client'

import React, { useCallback, useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

interface SlidesEditorProps {
  value: string
  onChange: (value: string) => void
  errors?: string[]
  className?: string
}

export function SlidesEditor({
  value,
  onChange,
  errors = [],
  className,
}: SlidesEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)

  // Update line numbers on scroll
  const handleScroll = useCallback(() => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }, [])

  // Generate line numbers
  const lineCount = value.split('\n').length
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1)

  // Handle tab key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        const start = e.currentTarget.selectionStart
        const end = e.currentTarget.selectionEnd

        const newValue = value.substring(0, start) + '  ' + value.substring(end)
        onChange(newValue)

        // Reset cursor position
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = start + 2
            textareaRef.current.selectionEnd = start + 2
          }
        }, 0)
      }
    },
    [value, onChange],
  )

  // Sync scroll position on mount and value change
  useEffect(() => {
    handleScroll()
  }, [value, handleScroll])

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Error display */}
      {errors.length > 0 && (
        <div className='border-b border-red-200 bg-red-50 p-3'>
          <h4 className='mb-1 text-sm font-medium text-red-800'>
            Validation Errors
          </h4>
          <ul className='space-y-0.5 text-xs text-red-700'>
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Editor */}
      <div className='relative flex flex-1 overflow-hidden bg-gray-50 font-mono text-sm'>
        {/* Line numbers */}
        <div
          ref={lineNumbersRef}
          className='flex-shrink-0 overflow-hidden border-r border-gray-200 bg-gray-50 px-3 py-4 text-right text-gray-500'
          style={{ width: '50px' }}>
          {lineNumbers.map((num) => (
            <div key={num} className='leading-6'>
              {num}
            </div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex-1 resize-none bg-white p-4 font-mono text-sm leading-6',
            'border-0 outline-none focus:ring-0',
            'placeholder-gray-400',
          )}
          placeholder={`# Start your presentation here
presentation:
  meta:
    title: "Your Title"
    author: "Your Name"
    theme: minimal
    
  slides:
    - type: title
      title: "Welcome"
      subtitle: "Let's begin"`}
          spellCheck={false}
          style={{
            tabSize: 2,
            fontFamily:
              'SF Mono, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          }}
        />
      </div>

      {/* Status bar */}
      <div className='flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-600'>
        <div className='flex items-center gap-4'>
          <span>YAML</span>
          <span>•</span>
          <span>{lineCount} lines</span>
          <span>•</span>
          <span>{value.length} characters</span>
        </div>
        <div className='flex items-center gap-2'>
          {errors.length > 0 ? (
            <span className='flex items-center text-red-600'>
              <svg
                className='mr-1 h-3 w-3'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
              {errors.length} error{errors.length > 1 ? 's' : ''}
            </span>
          ) : (
            <span className='flex items-center text-green-600'>
              <svg
                className='mr-1 h-3 w-3'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
              Valid
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
