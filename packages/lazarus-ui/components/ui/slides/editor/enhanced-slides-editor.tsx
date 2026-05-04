'use client'

import React, { useCallback, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

import { SlideTemplate, slideTemplates } from './slide-templates'
import { starterTemplate } from './starter-template'

interface EnhancedSlidesEditorProps {
  value: string
  onChange: (value: string) => void
  errors?: string[]
  className?: string
}

export function EnhancedSlidesEditor({
  value,
  onChange,
  errors = [],
  className,
}: EnhancedSlidesEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

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

  // Insert template - BULLETPROOF VERSION
  const insertTemplate = useCallback(
    (template: SlideTemplate) => {
      if (!textareaRef.current) return

      try {
        const lines = value.split('\n')

        // Find the slides section
        let slidesLineIndex = -1
        let baseIndent = 0

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          if (line.trim() === 'slides:') {
            slidesLineIndex = i
            baseIndent = line.indexOf('slides:')
            break
          }
        }

        if (slidesLineIndex === -1) {
          console.error('No slides section found')
          setShowTemplates(false)
          return
        }

        // Find insertion point (end of slides array)
        let insertIndex = lines.length
        for (let i = slidesLineIndex + 1; i < lines.length; i++) {
          const line = lines[i]
          const trimmed = line.trim()

          if (trimmed === '') continue

          const indent = line.length - line.trimStart().length
          // If we hit a line that's not indented enough to be part of slides, stop here
          if (indent <= baseIndent && trimmed !== '') {
            insertIndex = i
            break
          }
        }

        // Process template with EXACT indentation
        const templateLines = template.snippet.trim().split('\n')
        const slideIndent = baseIndent + 2 // slides are indented 2 spaces from 'slides:'

        const processedLines = templateLines.map((line, index) => {
          const trimmed = line.trim()
          if (trimmed === '') return ''

          if (index === 0) {
            // First line: "- type: xxx" gets slide-level indentation
            return ' '.repeat(slideIndent) + line.trim()
          } else {
            // Calculate original indentation in template relative to first line
            const originalIndent = line.length - line.trimStart().length
            // Properties of slide get slide indent + 2, plus any extra nesting beyond the base
            return (
              ' '.repeat(slideIndent + 2 + Math.max(0, originalIndent - 2)) +
              trimmed
            )
          }
        })

        // Insert with proper spacing
        const newContent = ['', ...processedLines, '']
        lines.splice(insertIndex, 0, ...newContent)

        const newValue = lines.join('\n')
        onChange(newValue)

        // Auto-select title for editing
        setTimeout(() => {
          if (textareaRef.current) {
            const titleMatch = newValue.match(/title:\s*"([^"]*)"/)
            if (titleMatch) {
              const start =
                newValue.indexOf(titleMatch[0]) +
                titleMatch[0].indexOf(titleMatch[1])
              const end = start + titleMatch[1].length
              textareaRef.current.setSelectionRange(start, end)
              textareaRef.current.focus()
            }
          }
        }, 100)
      } catch (error) {
        console.error('Template insertion failed:', error)
      }

      setShowTemplates(false)
    },
    [value, onChange],
  )

  // Get filtered templates
  const filteredTemplates =
    selectedCategory === 'All'
      ? slideTemplates
      : slideTemplates.filter((t) => t.category === selectedCategory)

  const categories = ['All', 'Content', 'Data', 'Business', 'Visual']

  return (
    <div className={cn('relative flex h-full flex-col', className)}>
      {/* Toolbar */}
      <div className='flex items-center justify-between border-b border-gray-200 bg-gray-50 p-2'>
        <div className='flex items-center gap-2'>
          <button
            onClick={() => {
              if (
                confirm(
                  'Start a new presentation? This will replace the current content.',
                )
              ) {
                onChange(starterTemplate)
                setShowTemplates(false)
              }
            }}
            className='rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50'>
            <span className='mr-2'>📄</span>
            New
          </button>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              'border border-gray-300',
              showTemplates
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'bg-white text-gray-700 hover:bg-gray-50',
            )}>
            <span className='mr-2'>➕</span>
            Add Slide
          </button>
          <span className='text-xs text-gray-500'>
            Use templates to add slides to your presentation
          </span>
        </div>

        <div className='text-xs text-gray-500'>
          {errors.length > 0 ? (
            <span className='text-red-600'>
              ⚠️ {errors.length} error{errors.length > 1 ? 's' : ''}
            </span>
          ) : (
            <span className='text-green-600'>✓ Valid YAML</span>
          )}
        </div>
      </div>

      {/* Templates Panel */}
      {showTemplates && (
        <div className='absolute left-2 right-2 top-12 z-10 max-h-[500px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl'>
          {/* Category Tabs */}
          <div className='flex gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2'>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                  selectedCategory === category
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900',
                )}>
                {category}
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className='max-h-[400px] overflow-y-auto p-4'>
            <div className='grid grid-cols-2 gap-3'>
              {filteredTemplates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => insertTemplate(template)}
                  className='group rounded-lg border border-gray-200 p-4 text-left transition-all hover:border-blue-400 hover:bg-blue-50'>
                  <div className='flex items-start gap-3'>
                    <span className='text-2xl'>{template.icon}</span>
                    <div className='flex-1'>
                      <h4 className='font-medium text-gray-900 group-hover:text-blue-700'>
                        {template.label}
                      </h4>
                      <p className='mt-0.5 text-xs text-gray-500'>
                        {template.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
          onClick={() => setShowTemplates(false)}
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
      subtitle: "Click 'Add Slide' to browse templates"`}
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
        <div className='flex items-center gap-4'>
          <span className='text-gray-500'>
            💡 Tip: Ensure your presentation has proper YAML structure with
            'presentation:' root
          </span>
        </div>
      </div>
    </div>
  )
}
