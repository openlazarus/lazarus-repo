'use client'

import { $getRoot, LexicalCommand } from 'lexical'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { DeleteIcon } from '@/components/ui/icons/trash'
import { useDismissKeyboard } from '@/hooks/ui/interaction/use-dismiss-keyboard'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'

import { useChatStore } from '@/store/chat-store'
import { useTaggedItems, useTagStore } from '@/store/tag-store'

import { AskButton } from './components/ask-button'
import { AttachmentPill } from './components/attachment-list'
import { LexicalEditor } from './components/lexical-text-area/lexical-editor'
import {
  CLEAR_EDITOR_COMMAND,
  SUBMIT_EDITOR_COMMAND,
} from './components/lexical-text-area/plugins/message-bar-plugin'
import { TagButton } from './components/tag-button'
import { TagContainer } from './components/tag-container'
import {
  MessageBarProvider,
  MessageBarProviderProps,
  useMessageBar,
} from './message-bar-provider'

// Clear button component for text area - memoized to prevent re-renders
const ClearButton = memo(
  ({
    onClick,
    size = 'default',
    variant = 'desktop',
    isDark = false,
  }: {
    onClick: () => void
    size?: 'small' | 'default'
    variant?: 'mobile' | 'desktop'
    isDark?: boolean
  }) => {
    return (
      <button
        onClick={onClick}
        className={cn(
          'flex-shrink-0 font-medium transition-opacity hover:opacity-80 active:opacity-60',
          size === 'small' ? 'text-sm' : 'text-base',
          isDark ? 'text-white/60' : 'text-[#8E8E93]',
        )}
        aria-label='Clear'>
        Clear
      </button>
    )
  },
)

ClearButton.displayName = 'ClearButton'

// Animation presets
const lzAnimations = {
  // Ultra-smooth transitions
  ease: [0.32, 0.72, 0, 1] as any,

  // Enhanced spring physics
  springSoft: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
    mass: 0.8,
  },

  springMedium: {
    type: 'spring' as const,
    stiffness: 350,
    damping: 26,
    mass: 0.5,
  },

  springFirm: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 28,
    mass: 0.7,
  },
}

// The main MessageBar component wrapper
export type MessageBarProps = Omit<MessageBarProviderProps, 'children'>

// Inline implementation of what used to be in InputArea
const MessageBarInput = () => {
  const {
    variant,
    inputText,
    startRecording,
    stopRecording,
    isRecording,
    recordingDuration,
    transcription,
    sendRecording,
    cancelRecording,
    editorRef,
    handleInputChange,
    setInputText,
    autoFocus,
    handleSubmit: submitFromContext,
    isSending,
    attachments,
    removeAttachment,
    handleFilesAdded,
    fileInputRef,
    attachmentError,
    setAttachmentError,
    isHighlighted,
  } = useMessageBar()

  // Get cancel function from chat store
  const cancelAllStreams = useChatStore((state) => state.cancelAllStreams)

  // Direct subscription to streaming state from chat store (bypasses prop chain)
  const isAnyStreaming = useChatStore((state) => {
    for (const conv of state.conversations.values()) {
      if (conv.isStreaming) return true
    }
    return false
  })

  // Use Zustand store directly for reactive tag updates
  const taggedItems = useTaggedItems()
  const setEditorRef = useTagStore((state) => state.setEditorRef)

  const { isDark } = useTheme()

  const containerRef = useRef<HTMLDivElement>(null)
  const messageBarWrapperRef = useRef<HTMLDivElement>(null)
  const localEditorRef = useRef<any>(null)
  const [isMultiline, setIsMultiline] = useState(false)
  const [textHeight, setTextHeight] = useState(0)
  const [showControls, setShowControls] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)
  const dragCounter = useRef(0)

  // Register editor ref with the tag store for external mention insertion
  useEffect(() => {
    setEditorRef(localEditorRef)
    return () => setEditorRef(null)
  }, [setEditorRef])

  // Use the dismiss keyboard hook
  const dismissKeyboard = useDismissKeyboard()

  // Detect when files are being dragged from outside the window
  useEffect(() => {
    const handleWindowDragEnter = (e: DragEvent) => {
      // Check if the drag contains files
      if (e.dataTransfer?.types?.includes('Files')) {
        dragCounter.current++
        setIsDragActive(true)
      }
    }

    const handleWindowDragLeave = (e: DragEvent) => {
      dragCounter.current--
      if (dragCounter.current === 0) {
        setIsDragActive(false)
      }
    }

    const handleWindowDragOver = (e: DragEvent) => {
      // Prevent default to allow drop
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault()
      }
    }

    const handleWindowDrop = (e: DragEvent) => {
      dragCounter.current = 0
      setIsDragActive(false)
    }

    // Add listeners to window
    window.addEventListener('dragenter', handleWindowDragEnter)
    window.addEventListener('dragleave', handleWindowDragLeave)
    window.addEventListener('dragover', handleWindowDragOver)
    window.addEventListener('drop', handleWindowDrop)

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter)
      window.removeEventListener('dragleave', handleWindowDragLeave)
      window.removeEventListener('dragover', handleWindowDragOver)
      window.removeEventListener('drop', handleWindowDrop)
    }
  }, [])

  // Check if we're on a mobile device
  const isMobileDevice =
    typeof navigator !== 'undefined' &&
    (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

  // Enhanced dismissal for mobile that includes a small delay to ensure submission completes
  const dismissKeyboardOnSubmit = useCallback(() => {
    if (variant === 'mobile' && isMobileDevice) {
      // Add a small delay to ensure the submission goes through first
      setTimeout(() => {
        dismissKeyboard()
      }, 100)
    }
  }, [variant, dismissKeyboard, isMobileDevice])

  // Define standard single-line height based on variant (includes editor padding)
  // Updated to account for 16px font size to prevent iOS zoom
  const singleLineHeight = variant === 'mobile' ? 56 : 52

  // Separate effect to handle empty content immediately
  useEffect(() => {
    if (!inputText.trim() && (isMultiline || textHeight !== singleLineHeight)) {
      setIsMultiline(false)
      setTextHeight(singleLineHeight)

      if (containerRef.current) {
        containerRef.current.style.height = `${singleLineHeight}px`
        containerRef.current.scrollTop = 0
      }
    }
  }, [inputText, singleLineHeight, isMultiline, textHeight])

  // Enhanced controls visibility logic
  useEffect(() => {
    // Show controls only when there's text
    const hasText = !!inputText.trim()

    // If there's text, show controls immediately
    // If empty, delay hiding to allow for animation
    if (hasText) {
      setShowControls(true)
    } else {
      // Small delay to allow for exit animation
      const timer = setTimeout(() => {
        setShowControls(false)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [inputText])

  // Detect multiline text based on content height and empty content
  useEffect(() => {
    // Debounce height calculations to improve performance
    const debounceTimer = setTimeout(() => {
      if (containerRef.current) {
        // Force height reset when input is empty
        if (!inputText.trim()) {
          setTextHeight(singleLineHeight)
          setIsMultiline(false)

          // Force style update directly on the container for immediate effect
          requestAnimationFrame(() => {
            if (containerRef.current) {
              containerRef.current.style.height = `${singleLineHeight}px`
              containerRef.current.scrollTop = 0

              // Reset editor input height
              const editorInput =
                containerRef.current.querySelector('.editor-input')
              if (editorInput instanceof HTMLElement) {
                editorInput.style.height = 'auto'
              }
            }
          })
          return
        }

        // Count actual line breaks in the text
        const lineBreaks = (inputText.match(/\n/g) || []).length
        const hasMultipleLines = lineBreaks > 0

        // Get the editor element for accurate measurement
        const editorElement =
          containerRef.current.querySelector('.editor-input')
        if (!editorElement) return

        // Temporarily set container to auto height to allow measurement
        const originalHeight = containerRef.current.style.height
        containerRef.current.style.height = 'auto'

        // Measure the editor element's actual height
        const editorHeight = (editorElement as HTMLElement).scrollHeight

        // Get the actual height of the editor content
        const actualHeight = editorHeight

        // Restore original height
        containerRef.current.style.height = originalHeight

        // Determine if we should be in multiline mode
        const shouldBeMultiline =
          hasMultipleLines || actualHeight > singleLineHeight + 5

        // Update state only if needed
        if (shouldBeMultiline !== isMultiline) {
          setIsMultiline(shouldBeMultiline)
        }

        // Set the appropriate height
        if (shouldBeMultiline) {
          setTextHeight(actualHeight)
        } else {
          setTextHeight(singleLineHeight)
        }
      }
    }, 30) // Reduced debounce for more responsive feel

    return () => clearTimeout(debounceTimer)
  }, [inputText, variant, singleLineHeight])

  // Maximum height limits optimized for different devices
  const maxEditorHeight = variant === 'mobile' ? 200 : 300

  // Add scrollbar styling via useEffect
  useEffect(() => {
    // Add custom scrollbar styling
    const styleEl = document.createElement('style')
    styleEl.textContent = `
      .message-bar-scrollable {
        scrollbar-width: thin;
        scrollbar-color: rgba(0,0,0,0.2) transparent;
      }
      .message-bar-scrollable::-webkit-scrollbar {
        width: 4px;
      }
      .message-bar-scrollable::-webkit-scrollbar-track {
        background: transparent;
      }
      .message-bar-scrollable::-webkit-scrollbar-thumb {
        background: rgba(0,0,0,0.2);
        border-radius: 4px;
      }
    `
    document.head.appendChild(styleEl)

    return () => {
      styleEl.remove()
    }
  }, [])

  // Check if there's text in the input
  const hasText = !!inputText.trim()

  // Toggle recording when voice button is clicked - memoized to prevent re-renders
  const handleVoiceButtonClick = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      // Focus the editor before starting recording
      if (
        editorRef &&
        typeof editorRef === 'object' &&
        (editorRef as any).current
      ) {
        const editor = (editorRef as any).current
        // Ensure editor has focus before starting speech recognition
        setTimeout(() => {
          editor.focus()
          startRecording()
        }, 10)
      } else {
        startRecording()
      }
    }
  }, [isRecording, stopRecording, startRecording, editorRef])

  // Shared submit handler - memoized to prevent re-renders
  const submitMessage = useCallback(() => {
    if (
      hasText &&
      editorRef &&
      typeof editorRef === 'object' &&
      (editorRef as any).current
    ) {
      const editor = (editorRef as any).current
      editor.dispatchCommand(SUBMIT_EDITOR_COMMAND, undefined)

      // Dismiss keyboard on mobile after submission
      dismissKeyboardOnSubmit()
    } else if (hasText) {
      submitFromContext()

      // Dismiss keyboard on mobile after submission
      dismissKeyboardOnSubmit()
    }
  }, [hasText, editorRef, submitFromContext, dismissKeyboardOnSubmit])

  // Clear message handler - memoized to prevent re-renders
  const clearMessage = useCallback(() => {
    if (
      editorRef &&
      typeof editorRef === 'object' &&
      (editorRef as any).current
    ) {
      const editor = (editorRef as any).current
      editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined)
      setInputText('')

      // Also dismiss keyboard on mobile when clearing
      if (variant === 'mobile' && isMobileDevice) {
        dismissKeyboard()
      }
    }
  }, [editorRef, setInputText, dismissKeyboard, variant, isMobileDevice])

  // Drag and drop handlers for message bar
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current = 0
      setIsDragActive(false)

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        handleFilesAdded(files)
      }
    },
    [handleFilesAdded],
  )

  // Handle file input click
  const handleFileButtonClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [fileInputRef])

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFilesAdded(files)
      }
      // Reset input value to allow selecting the same file again
      e.target.value = ''
    },
    [handleFilesAdded],
  )

  return (
    <div className='relative' ref={messageBarWrapperRef}>
      {/* Transcription display - appears above the input when available */}
      {transcription && (
        <m.div
          className={cn(
            'mb-3 rounded-2xl border px-4 py-3',
            isDark
              ? 'border-white/20 bg-gradient-to-r from-white/10 to-white/5'
              : 'border-gray-200/50 bg-gradient-to-r from-gray-50/80 to-gray-100/80',
          )}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={lzAnimations.springMedium}>
          <p
            className={cn(
              'text-sm leading-relaxed',
              isDark ? 'text-white/90' : 'text-gray-700',
            )}>
            "{transcription}"
          </p>
          <div className='mt-2 flex items-center gap-2 text-xs text-blue-600'>
            <m.div
              className='h-1.5 w-1.5 rounded-full bg-blue-600'
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span>Auto-sending...</span>
          </div>
        </m.div>
      )}

      {/* Integrated message bar design - hide when recording */}
      {!isRecording && (
        <m.div
          className={cn(
            'relative flex w-full flex-col rounded-xl',
            isDark ? 'bg-white/[0.02]' : 'bg-white',
            isDark ? 'border border-white/10' : 'border border-gray-200',
          )}
          initial={false}
          animate={{
            boxShadow: isDragActive
              ? `0 0 0 2px hsl(var(--lazarus-blue) / 0.6), 0 0 20px 0 hsl(var(--lazarus-blue) / 0.3)`
              : isHighlighted
                ? `0 0 0 2px hsl(var(--lazarus-blue) / 0.5), 0 0 12px 0 hsl(var(--lazarus-blue) / 0.2)`
                : `0 0 0 0px hsl(var(--lazarus-blue) / 0), 0 0 0px 0 hsl(var(--lazarus-blue) / 0)`,
          }}
          transition={{
            duration: 0.2,
            ease: [0.2, 0, 0, 1],
          }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type='file'
            multiple
            onChange={handleFileInputChange}
            className='hidden'
            aria-label='Attach files'
          />

          {/* Compact drop indicator — slides in above text editor */}
          <AnimatePresence>
            {isDragActive && (
              <m.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 36, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                  opacity: { duration: 0.15 },
                }}
                className='overflow-hidden'>
                <div
                  className='mx-3 mt-2 flex h-[28px] items-center gap-2 rounded-lg border border-dashed px-3'
                  style={{
                    borderColor: 'hsl(var(--lazarus-blue) / 0.5)',
                    backgroundColor: isDark
                      ? 'hsl(var(--lazarus-blue) / 0.08)'
                      : 'hsl(var(--lazarus-blue) / 0.04)',
                  }}>
                  {/* Paperclip icon — matches the Attach button */}
                  <svg
                    className='h-3.5 w-3.5 flex-shrink-0'
                    style={{ color: 'hsl(var(--lazarus-blue))' }}
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13'
                    />
                  </svg>
                  <span
                    className='text-xs font-medium'
                    style={{ color: 'hsl(var(--lazarus-blue))' }}>
                    Drop to attach
                  </span>
                </div>
              </m.div>
            )}
          </AnimatePresence>

          {/* Top row with tag button, tags, and attachments in one line */}
          <div className='flex items-start p-3 pb-1'>
            <TagButton
              onClick={() => {
                // The TagButton component handles its own menu internally
              }}
              size='small'
              variant={variant}
              isDark={isDark}
            />
            {(taggedItems.length > 0 || attachments.length > 0) && (
              <div className='ml-2 min-w-0 flex-1'>
                <TagContainer>
                  {attachments.map((att) => (
                    <AttachmentPill
                      key={att.id}
                      attachment={att}
                      onRemove={removeAttachment}
                    />
                  ))}
                </TagContainer>
              </div>
            )}
          </div>

          {/* Attachment error message */}
          {attachmentError && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className='mx-3 mb-2 rounded-lg px-3 py-2 text-xs'
              style={{
                backgroundColor: 'hsl(var(--destructive) / 0.1)',
                color: 'hsl(var(--destructive))',
              }}>
              {attachmentError}
              <button
                onClick={() => setAttachmentError('')}
                className='ml-2 underline'
                aria-label='Dismiss error'>
                Dismiss
              </button>
            </m.div>
          )}

          {/* Main input area container */}
          <m.div
            className={cn(
              'relative w-full overflow-hidden',
              textHeight > maxEditorHeight ? 'message-bar-scrollable' : '',
            )}
            ref={containerRef}
            animate={{
              height: textHeight,
            }}
            transition={{
              type: 'tween',
              duration: 0.15,
              ease: 'easeOut',
            }}
            style={{
              maxHeight: maxEditorHeight,
              overflowY: textHeight > maxEditorHeight ? 'auto' : 'hidden',
              minHeight: singleLineHeight,
            }}>
            {/* Multiline textarea input */}
            <div className='relative z-10 w-full'>
              <LexicalEditor
                variant={variant}
                placeholder='Message...'
                handleEditorChange={(editorState) => {
                  // Use a more efficient method to get text content
                  editorState.read(() => {
                    const root = $getRoot()
                    const textContent = root.getTextContent()
                    handleInputChange(textContent)
                  })
                }}
                onFocus={() => {}}
                onBlur={() => {}}
                setEditorRef={(editor) => {
                  // Set both the context ref and local ref for tag store
                  localEditorRef.current = editor
                  if (editorRef && typeof editorRef === 'object') {
                    ;(editorRef as any).current = editor

                    // Add special handler for clearing to force immediate height reset
                    const originalDispatchCommand = editor.dispatchCommand
                    editor.dispatchCommand = function (
                      command: LexicalCommand<unknown>,
                      payload: unknown,
                    ) {
                      if (
                        command === CLEAR_EDITOR_COMMAND ||
                        (command === SUBMIT_EDITOR_COMMAND && !inputText.trim())
                      ) {
                        // Force immediate height reset after clearing
                        setTimeout(() => {
                          if (containerRef.current) {
                            containerRef.current.style.height = `${singleLineHeight}px`
                            setTextHeight(singleLineHeight)
                            setIsMultiline(false)

                            // Find the editor input and reset its height
                            const editorInput =
                              containerRef.current.querySelector(
                                '.editor-input',
                              )
                            if (
                              editorInput &&
                              editorInput instanceof HTMLElement
                            ) {
                              editorInput.style.height = 'auto'
                            }
                          }
                        }, 0)
                      }

                      // Call the original method
                      return originalDispatchCommand.call(
                        editor,
                        command,
                        payload,
                      )
                    }
                  }
                }}
                autoFocus={autoFocus}
                handleSubmit={() => {
                  submitFromContext()

                  // Dismiss keyboard on mobile after submission
                  dismissKeyboardOnSubmit()
                }}
                onContentEmpty={() => {
                  // Force reset height when content is completely empty
                  setTextHeight(singleLineHeight) // Set to base height
                  setIsMultiline(false)

                  // Reset the container scroll position
                  if (containerRef.current) {
                    containerRef.current.scrollTop = 0
                  }
                }}
              />
            </div>
          </m.div>

          {/* Bottom controls area with Attach, Clear and Ask buttons - always visible */}
          <div className='relative flex w-full items-center justify-between p-3 pt-1'>
            {/* Left side controls */}
            <div className='flex items-center gap-1.5'>
              {/* Attach button */}
              <button
                onClick={handleFileButtonClick}
                className={cn(
                  'inline-flex items-center gap-1.5 transition-opacity hover:opacity-80 active:opacity-60',
                  'text-xs font-medium',
                  isDark ? 'text-white/60' : 'text-[#8E8E93]',
                )}
                aria-label='Attach files'>
                <svg
                  className='h-3.5 w-3.5'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13'
                  />
                </svg>
                <span>Attach</span>
              </button>

              {/* Clear button with trash icon - only show when there's text */}
              {hasText && (
                <button
                  onClick={clearMessage}
                  className={cn(
                    'inline-flex items-center gap-1.5 transition-opacity hover:opacity-80 active:opacity-60',
                    'text-xs font-medium',
                    isDark ? 'text-white/60' : 'text-[#8E8E93]',
                  )}
                  aria-label='Clear message'>
                  <span className='relative' style={{ top: '-1px' }}>
                    <DeleteIcon size={14} />
                  </span>
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Ask button - always visible */}
            <m.div
              whileTap={{
                scale: 0.95,
                transition: { duration: 0.1, ease: lzAnimations.ease },
              }}>
              <AskButton
                onClick={submitMessage}
                onStop={cancelAllStreams}
                size='small'
                variant={variant}
                isSending={isSending || isAnyStreaming}
              />
            </m.div>
          </div>
        </m.div>
      )}
    </div>
  )
}

const MessageBarContent = () => {
  const { containerRef } = useMessageBar()

  return (
    <div ref={containerRef} className='w-full pb-2'>
      <m.div
        key='input-area'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}>
        <MessageBarInput />
      </m.div>
    </div>
  )
}

MessageBarContent.displayName = 'MessageBarContent'

// Main component with forwarded ref
export const MessageBar = forwardRef<
  { startRecording: () => void; stopRecording: () => void },
  MessageBarProps
>((props, ref) => {
  const [isRecording, setIsRecording] = useState(false)

  // Implement the recording methods
  const startRecording = () => {
    setIsRecording(true)
  }

  const stopRecording = () => {
    setIsRecording(false)
  }

  // Expose methods via ref
  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref({ startRecording, stopRecording })
      } else {
        ref.current = { startRecording, stopRecording }
      }
    }
  }, [ref])

  return (
    <MessageBarProvider
      {...props}
      onRecordingStateChange={(recording) => setIsRecording(recording)}>
      <div className='w-full'>
        <MessageBarContent />
      </div>
    </MessageBarProvider>
  )
})

MessageBar.displayName = 'MessageBar'
