'use client'

import { useEffect, useRef, useState } from 'react'

import {
  defaultFlowDocument,
  essayOutlineTemplate,
  projectPlanTemplate,
  systemArchitectureTemplate,
} from './lib/templates'

interface FlowEditorProps {
  value: string
  onChange: (value: string) => void
  errors: string[]
}

export function FlowEditor({ value, onChange, errors }: FlowEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const [currentLine, setCurrentLine] = useState(1)
  const [isTyping, setIsTyping] = useState(false)

  // Enhanced syntax highlighting with more colors
  const highlightYAML = (text: string) => {
    return (
      text
        // Comments
        .replace(
          /^(\s*)(#.*)$/gm,
          '$1<span class="text-gray-400 italic">$2</span>',
        )
        // Keys
        .replace(
          /^(\s*)([\w-]+)(\s*):/gm,
          '$1<span class="text-blue-600 font-semibold">$2</span>$3:',
        )
        // String values with quotes
        .replace(
          /:\s*(["|'])([^"|']*)\1/gm,
          ': $1<span class="text-green-600">$2</span>$1',
        )
        // String values without quotes
        .replace(
          /:\s+([^"|'\n][^\n]*?)$/gm,
          ': <span class="text-green-600">$1</span>',
        )
        // List items
        .replace(
          /^(\s*)-\s+/gm,
          '<span class="text-purple-600 font-medium">$1- </span>',
        )
        // Numbers
        .replace(
          /:\s*(\d+(?:\.\d+)?)/gm,
          ': <span class="text-orange-600 font-medium">$1</span>',
        )
        // Booleans
        .replace(
          /:\s*(true|false)/gm,
          ': <span class="text-pink-600 font-medium">$1</span>',
        )
        // Special values
        .replace(
          /:\s*(null|auto|center)/gm,
          ': <span class="text-purple-600 font-medium italic">$1</span>',
        )
        // Array brackets
        .replace(
          /(\[|\])/g,
          '<span class="text-purple-600 font-medium">$1</span>',
        )
        // Object braces in position arrays
        .replace(
          /(\{|\})/g,
          '<span class="text-purple-600 font-medium">$1</span>',
        )
        // Pipe character for multiline
        .replace(/\|/g, '<span class="text-blue-500 font-medium">|</span>')
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    setIsTyping(true)
    setTimeout(() => setIsTyping(false), 100)

    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.currentTarget.selectionStart
      const end = e.currentTarget.selectionEnd
      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      onChange(newValue)

      // Reset cursor position after React re-render
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart =
            textareaRef.current.selectionEnd = start + 2
        }
      }, 0)
    }
  }

  const handleScroll = () => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }

  const updateCurrentLine = () => {
    if (textareaRef.current) {
      const pos = textareaRef.current.selectionStart
      const lines = value.substring(0, pos).split('\n')
      setCurrentLine(lines.length)
    }
  }

  const loadTemplate = (template: string, _templateName: string) => {
    const confirmed =
      value.trim() === defaultFlowDocument.trim() ||
      window.confirm('This will replace your current document. Continue?')
    if (confirmed) {
      onChange(template)
    }
  }

  useEffect(() => {
    updateCurrentLine()
  }, [value, updateCurrentLine])

  return (
    <div className='flex h-full flex-col bg-white'>
      {/* Enhanced Toolbar */}
      <div className='border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white px-4 py-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-1'>
            <span className='mr-2 text-xs font-medium text-gray-500'>
              Templates:
            </span>
            <div className='flex items-center space-x-1 rounded-lg bg-gray-100 p-1'>
              <button
                onClick={() => loadTemplate(defaultFlowDocument, 'Default')}
                className='rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 transition-all duration-200 hover:bg-white hover:text-gray-900'>
                Default
              </button>
              <button
                onClick={() =>
                  loadTemplate(systemArchitectureTemplate, 'Architecture')
                }
                className='rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 transition-all duration-200 hover:bg-white hover:text-gray-900'>
                Architecture
              </button>
              <button
                onClick={() => loadTemplate(projectPlanTemplate, 'Project')}
                className='rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 transition-all duration-200 hover:bg-white hover:text-gray-900'>
                Project
              </button>
              <button
                onClick={() => loadTemplate(essayOutlineTemplate, 'Essay')}
                className='rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 transition-all duration-200 hover:bg-white hover:text-gray-900'>
                Essay
              </button>
            </div>
          </div>

          <div className='flex items-center space-x-3 text-xs'>
            <div className='flex items-center space-x-2'>
              <div
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  isTyping ? 'animate-pulse bg-green-500' : 'bg-gray-300'
                }`}
              />
              <span className='font-medium text-gray-500'>YAML</span>
            </div>
            <span className='text-gray-300'>•</span>
            <span className='text-gray-500'>Line {currentLine}</span>
            <span className='text-gray-300'>•</span>
            <span className='text-gray-500'>Tab: 2 spaces</span>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className='relative flex-1 overflow-hidden'>
        <div className='absolute inset-0 flex'>
          {/* Line numbers with current line highlight */}
          <div className='w-14 select-none overflow-hidden border-r border-gray-200 bg-gradient-to-r from-gray-50 to-white pr-3 pt-4 text-right text-xs text-gray-400'>
            {value.split('\n').map((_, i) => (
              <div
                key={i}
                className={`font-mono leading-5 transition-all duration-200 ${
                  i + 1 === currentLine
                    ? 'origin-right scale-110 font-semibold text-blue-600'
                    : 'hover:text-gray-600'
                }`}>
                {i + 1}
              </div>
            ))}
          </div>

          {/* Code editor with enhanced styling */}
          <div className='relative flex-1 bg-gradient-to-br from-white via-gray-50/30 to-white'>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onScroll={handleScroll}
              onSelect={updateCurrentLine}
              onClick={updateCurrentLine}
              className='absolute inset-0 z-10 h-full w-full resize-none bg-transparent p-4 font-mono text-sm leading-5 text-transparent caret-gray-800 outline-none'
              spellCheck={false}
              autoCapitalize='off'
              autoCorrect='off'
              style={{
                caretColor: '#1f2937',
                fontFamily:
                  'SF Mono, Monaco, Consolas, "Courier New", monospace',
              }}
            />
            <div
              ref={highlightRef}
              className='pointer-events-none absolute inset-0 h-full w-full overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-sm leading-5'
              style={{
                fontFamily:
                  'SF Mono, Monaco, Consolas, "Courier New", monospace',
              }}
              dangerouslySetInnerHTML={{ __html: highlightYAML(value) }}
            />

            {/* Current line highlight */}
            <div
              className='pointer-events-none absolute left-0 right-0 h-5 bg-blue-50/30 transition-all duration-200'
              style={{
                top: `${(currentLine - 1) * 20 + 16}px`,
                display:
                  currentLine > value.split('\n').length ? 'none' : 'block',
              }}
            />
          </div>
        </div>
      </div>

      {/* Enhanced error display */}
      {errors.length > 0 && (
        <div className='animate-slide-up border-t border-red-200 bg-gradient-to-t from-red-50 to-white px-4 py-3'>
          <div className='flex items-start space-x-2'>
            <svg
              className='mt-0.5 h-4 w-4 flex-shrink-0 text-red-500'
              fill='currentColor'
              viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                clipRule='evenodd'
              />
            </svg>
            <div className='flex-1'>
              <div className='mb-1 text-xs font-semibold text-red-700'>
                Validation errors
              </div>
              <div className='space-y-0.5 text-xs text-red-600'>
                {errors.map((error, i) => (
                  <div key={i} className='flex items-start'>
                    <span className='mr-1 text-red-400'>•</span>
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
