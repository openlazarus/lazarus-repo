'use client'

import React, { useCallback, useEffect, useState } from 'react'

import { FlowCanvas, FlowEditor, parseFlowDocument } from '@/components/ui/flow'
import { useMindmap } from '@/hooks/features/mindmap/use-mindmap'

import { BaseEditorLayout } from './base-editor-layout'

interface MindmapEditorProps {
  content: string
  onChange?: (content: string) => void
  className?: string
  lastModified?: Date
  theme?: 'light' | 'dark'
}

export const MindmapEditor: React.FC<MindmapEditorProps> = ({
  content,
  onChange,
  className,
  lastModified = new Date(),
  theme = 'light',
}) => {
  const mindmap = useMindmap()
  const [localContent, setLocalContent] = useState(content)
  const [showSourceEditor, setShowSourceEditor] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize with content only once
  useEffect(() => {
    if (content && !isInitialized) {
      setLocalContent(content)
      mindmap.updateMarkdown(content)
      setIsInitialized(true)
    }
  }, [content, isInitialized, mindmap.updateMarkdown])

  // Sync edited content from mindmap hook (but avoid infinite loops)
  useEffect(() => {
    if (mindmap.editedContent && mindmap.editedContent !== localContent) {
      setLocalContent(mindmap.editedContent)
      onChange?.(mindmap.editedContent)
    }
  }, [mindmap.editedContent, localContent, mindmap, onChange])

  // Handle content change from Flow editor
  const handleContentChange = useCallback(
    (newContent: string) => {
      setLocalContent(newContent)

      // Validate content
      try {
        parseFlowDocument(newContent)
        setErrors([])
      } catch (error) {
        setErrors([
          error instanceof Error ? error.message : 'Invalid Flow document',
        ])
      }

      // Update mindmap and parent (debounced to avoid too many calls)
      const timeoutId = setTimeout(() => {
        mindmap.updateMarkdown(newContent)
        onChange?.(newContent)
      }, 300)

      return () => clearTimeout(timeoutId)
    },
    [mindmap.updateMarkdown, onChange],
  )

  // Handle node position updates from canvas
  const handleNodeUpdate = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      mindmap.updateNodePosition(nodeId, position)
    },
    [mindmap.updateNodePosition, mindmap],
  )

  return (
    <BaseEditorLayout
      className={className}
      lastModified={lastModified}
      headerActions={
        <div className='flex items-center gap-4'>
          {/* Source editor toggle */}
          <div className='flex items-center gap-2'>
            <button
              onClick={() => setShowSourceEditor(!showSourceEditor)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                showSourceEditor
                  ? theme === 'dark'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } `}>
              {showSourceEditor ? 'Hide Source' : 'Show Source'}
            </button>
          </div>

          {/* Status indicators */}
          <div className='flex items-center gap-2'>
            {errors.length > 0 ? (
              <div className='flex items-center gap-1'>
                <div className='h-2 w-2 rounded-full bg-red-500' />
                <span
                  className={`text-[10px] font-medium ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                  {errors.length} Error{errors.length !== 1 ? 's' : ''}
                </span>
              </div>
            ) : mindmap.parsedData ? (
              <div className='flex items-center gap-1'>
                <div className='h-2 w-2 rounded-full bg-green-500' />
                <span
                  className={`text-[10px] font-medium ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                  Valid Flow
                </span>
              </div>
            ) : null}

            {mindmap.isEditing && (
              <div className='flex items-center gap-1'>
                <div className='h-2 w-2 animate-pulse rounded-full bg-blue-500' />
                <span
                  className={`text-[10px] font-medium ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                  Processing
                </span>
              </div>
            )}
          </div>
        </div>
      }>
      <div
        className={`relative h-full w-full ${theme === 'dark' ? '111112' : 'bg-gray-50'}`}>
        {/* Main Visual Preview - Always visible */}
        <div className='h-full w-full'>
          {errors.length > 0 ? (
            <div
              className={`flex h-full items-center justify-center p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
              <div
                className={`max-w-md rounded-lg border p-6 ${theme === 'dark' ? 'border-red-800 bg-red-900/20' : 'border-red-200 bg-red-50'}`}>
                <h3
                  className={`mb-3 text-sm font-medium ${theme === 'dark' ? 'text-red-400' : 'text-red-800'}`}>
                  Validation Errors
                </h3>
                <ul
                  className={`space-y-1 text-sm ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
                <button
                  onClick={() => setShowSourceEditor(true)}
                  className={`mt-4 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-red-800 text-red-200 hover:bg-red-700'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }`}>
                  Edit Source
                </button>
              </div>
            </div>
          ) : mindmap.parsedData ? (
            <FlowCanvas
              data={mindmap.parsedData}
              onNodeUpdate={handleNodeUpdate}
            />
          ) : (
            <div
              className={`flex h-full items-center justify-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              <div className='text-center'>
                <p className='mb-4'>No valid Flow document to display</p>
                <button
                  onClick={() => setShowSourceEditor(true)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  Create Flow Document
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Source Editor Overlay - Only when requested */}
        {showSourceEditor && (
          <div className='absolute inset-0 z-10 flex flex-col'>
            {/* Visual Preview (reduced size) */}
            <div className='h-1/2 border-b border-gray-300'>
              {errors.length > 0 ? (
                <div
                  className={`flex h-full items-center justify-center p-4 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                  <div className='text-center'>
                    <div
                      className={`text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                      {errors.length} validation error
                      {errors.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              ) : mindmap.parsedData ? (
                <FlowCanvas
                  data={mindmap.parsedData}
                  onNodeUpdate={handleNodeUpdate}
                />
              ) : (
                <div
                  className={`flex h-full items-center justify-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  No valid Flow document
                </div>
              )}
            </div>

            {/* Source Editor */}
            <div
              className={`flex h-1/2 flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
              <div
                className={`flex items-center justify-between border-b px-4 py-2 text-xs font-medium ${theme === 'dark' ? 'border-gray-700 bg-gray-800 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                <span>Flow YAML Editor</span>
                <button
                  onClick={() => setShowSourceEditor(false)}
                  className={`rounded px-2 py-1 text-xs hover:bg-gray-200 dark:hover:bg-gray-700 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  ✕
                </button>
              </div>
              <div className='flex-1 overflow-hidden'>
                <FlowEditor
                  value={localContent}
                  onChange={handleContentChange}
                  errors={errors}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </BaseEditorLayout>
  )
}
