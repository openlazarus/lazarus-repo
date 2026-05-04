'use client'

import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
} from 'lexical'

import { useAppEvents } from '@/hooks/core/use-app-events'
import { useChat } from '@/hooks/core/use-chat'
import { Item } from '@/model/item'
import { useUIState } from '@/state/ui-state'
import { itemToTaggedItem, TaggedItem, useTagStore } from '@/store/tag-store'

import { $createMentionNode } from './components/lexical-text-area/nodes/mention-node'
import { Attachment, useAttachments } from './hooks/use-attachments'
import { useTextInput } from './hooks/use-text-input'

// Define the context type
export interface MessageBarContextType {
  // Input state
  inputText: string
  setInputText: (text: string) => void
  handleInputChange: (text: string) => void

  // Mention insertion
  insertMention: (item: Item) => void

  // Recording state
  isRecording: boolean
  recordingDuration: number
  transcription: string
  startRecording: () => void
  stopRecording: () => void
  sendRecording: () => void
  cancelRecording: () => void

  // Tagged items state (using new Zustand store)
  taggedItems: TaggedItem[]
  removeTaggedItem: (id: string) => void

  // Attachments state
  attachments: Attachment[]
  addAttachment: (attachment: Attachment) => void
  removeAttachment: (id: string) => void
  clearAttachments: () => void
  handleFilesAdded: (files: FileList | File[] | null) => Promise<void>
  attachmentError: string
  setAttachmentError: (error: string) => void

  // Message sending state
  isSending: boolean
  handleSubmit: () => Promise<void>

  // Conversation management
  startNewConversation: () => Promise<any>

  // UI state
  variant: 'mobile' | 'desktop'
  fixedPosition: boolean
  autoFocus: boolean
  isHighlighted: boolean

  // References
  editorRef: React.RefObject<any>
  containerRef: React.RefObject<HTMLDivElement | null>
  fileInputRef: React.RefObject<HTMLInputElement | null>
}

// Create the context with a default value
const MessageBarContext = createContext<MessageBarContextType | undefined>(
  undefined,
)

// Provider props type
export type MessageBarProviderProps = {
  children: React.ReactNode
  variant?: 'mobile' | 'desktop'
  showHelp?: boolean
  autoFocus?: boolean
  initialText?: string
  messageBarId?: string
  onSubmit?: (
    text: string,
    taggedItems: TaggedItem[],
    attachments?: Attachment[],
  ) => void
  onTextChange?: (text: string) => void
  onFocus?: () => void
  onBlur?: () => void
  onRecordingStateChange?: (isRecording: boolean) => void
  onExpansionChange?: (isExpanded: boolean) => void
  isStreaming?: boolean // External streaming state from ChatView/parent
}

// Export the provider component
export const MessageBarProvider = forwardRef<
  { startRecording: () => void; stopRecording: () => void },
  MessageBarProviderProps
>(
  (
    {
      children,
      variant = 'desktop',
      showHelp: _showHelp = false,
      autoFocus = false,
      initialText = '',
      messageBarId: _messageBarId = 'message-bar',
      onSubmit,
      onTextChange = () => {},
      onFocus: _onFocus = () => {},
      onBlur: _onBlur = () => {},
      onRecordingStateChange = () => {},
      onExpansionChange: _onExpansionChange = () => {},
      isStreaming: externalIsStreaming = false,
    },
    ref,
  ) => {
    // References
    const containerRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const editorRef = useRef<any>(null)

    // Use chat functionality
    const { sendMessage, sendingMessage, createConversation } = useChat()
    const { activeConversationId, setActiveConversationId } = useUIState()

    // Use new Zustand tag store
    const taggedItems = useTagStore((state) => state.taggedItems)
    const addTag = useTagStore((state) => state.addTag)
    const removeTag = useTagStore((state) => state.removeTag)
    const clearTags = useTagStore((state) => state.clearTags)

    // Use our custom hooks
    const { inputText, setInputText, handleInputChange } = useTextInput({
      initialText,
      onTextChange,
    })

    // Use attachments hook
    const {
      attachments,
      addAttachment,
      removeAttachment,
      clearAttachments,
      handleFilesAdded,
      error: attachmentError,
      setError: setAttachmentError,
    } = useAttachments({
      maxFiles: 10,
      maxSize: 10 * 1024 * 1024, // 10MB
    })

    // Simple voice recording state
    const [isRecording, setIsRecording] = useState(false)
    const [recordingDuration, setRecordingDuration] = useState(0)
    const [transcription, setTranscription] = useState('')

    // Highlight state for visual feedback
    const [isHighlighted, setIsHighlighted] = useState(false)

    // Remove a tagged item from the new Zustand store
    const removeTaggedItem = useCallback(
      (id: string) => {
        removeTag(id)
      },
      [removeTag],
    )

    // Insert a mention into the Lexical editor
    const insertMention = useCallback(
      (item: Item) => {
        const editor = editorRef.current
        if (!editor) {
          console.warn('[MessageBar] No editor ref available for insertMention')
          return
        }

        // Add to tag store
        const taggedItem = itemToTaggedItem(item)
        addTag(taggedItem)

        // Get display name
        const itemName = item.name || (item as any).title || 'Item'

        // Insert mention node into editor
        editor.update(() => {
          const root = $getRoot()
          const selection = $getSelection()

          // Create compact mention format: @{type:id}
          const structuredMention = `{${item.type}:${item.id}}`
          const mentionNode = $createMentionNode(
            structuredMention,
            `@${itemName}`,
          )

          if ($isRangeSelection(selection)) {
            // Insert at cursor position
            selection.insertNodes([mentionNode, $createTextNode(' ')])
          } else {
            // Append to end of content
            const lastChild = root.getLastChild()
            if (lastChild) {
              lastChild.insertAfter(mentionNode)
              mentionNode.insertAfter($createTextNode(' '))
            } else {
              root.append(mentionNode)
              root.append($createTextNode(' '))
            }
          }
        })

        // Focus the editor
        setTimeout(() => editor.focus(), 0)
      },
      [editorRef, addTag],
    )

    // Handle submission with chat integration
    const handleSubmit = useCallback(async () => {
      const messageText = inputText.trim()

      if (!messageText) {
        return
      }

      try {
        // Use taggedItems from new Zustand store
        const itemsToSend = taggedItems

        console.log('[MessageBar] Submitting with tagged items:', {
          count: itemsToSend.length,
          items: itemsToSend.map((i) => ({
            id: i.id,
            name: i.name,
            type: i.type,
          })),
        })

        // If onSubmit is provided, use it exclusively (ChatView integration)
        if (onSubmit) {
          // Capture attachments before clearing
          const pendingAttachments = attachments.length
            ? [...attachments]
            : undefined

          // Clear the input and attachments
          setInputText('')
          clearAttachments()

          // Clear tags from new Zustand store
          clearTags()

          // Call the provided onSubmit callback with attachments
          onSubmit(messageText, itemsToSend, pendingAttachments)
        } else {
          // Otherwise, use the built-in chat functionality (legacy/standalone mode)
          const taggedItemIds = itemsToSend.map((item) => item.id)
          let conversationId = activeConversationId

          // Create conversation if none exists
          if (!conversationId) {
            const newConversation = await createConversation()
            conversationId = newConversation.id
            setActiveConversationId(conversationId)
          }

          // Send the message using useChat
          await sendMessage(messageText, taggedItemIds, conversationId)

          // Clear the input and attachments
          setInputText('')
          clearAttachments()

          // Clear tags from new Zustand store
          clearTags()
        }
      } catch (error) {
        console.error('Failed to send message:', error)
        // Keep the input text so user can retry
      }
    }, [
      inputText,
      taggedItems,
      activeConversationId,
      createConversation,
      setActiveConversationId,
      sendMessage,
      setInputText,
      clearAttachments,
      clearTags,
      onSubmit,
    ])

    // Clear tags when conversation changes (new conversation started)
    const prevConversationId = useRef<string | null>(null)
    useEffect(() => {
      // Only clear tags if conversation actually changed (not initial load)
      if (
        prevConversationId.current !== null &&
        prevConversationId.current !== activeConversationId
      ) {
        clearTags()
        console.log('[MessageBar] Cleared tags due to conversation change')
      }
      prevConversationId.current = activeConversationId
    }, [activeConversationId, clearTags])

    // Listen for files dropped on the chat area
    useAppEvents<{ chatFilesDropped: { files: File[] } }>({
      chatFilesDropped: ({ files }) => handleFilesAdded(files),
    })

    // Listen for prefillChatInput events from other components
    useEffect(() => {
      const handlePrefillChat = (
        event: CustomEvent<{
          text: string
          focus?: boolean
          highlight?: boolean
        }>,
      ) => {
        const { text, focus, highlight } = event.detail
        if (text) {
          setInputText(text)
          // Update the lexical editor content
          const editor = editorRef.current
          if (editor) {
            editor.update(() => {
              const root = $getRoot()
              root.clear()
              const paragraph = $createParagraphNode()
              paragraph.append($createTextNode(text))
              root.append(paragraph)
              // Move cursor to end of text
              root.selectEnd()
            })
          }
        }
        if (focus && editorRef.current) {
          setTimeout(() => editorRef.current?.focus(), 100)
        }
        if (highlight) {
          setIsHighlighted(true)
          // Auto-remove highlight after animation completes
          setTimeout(() => setIsHighlighted(false), 2000)
        }
      }

      window.addEventListener(
        'prefillChatInput',
        handlePrefillChat as EventListener,
      )
      return () => {
        window.removeEventListener(
          'prefillChatInput',
          handlePrefillChat as EventListener,
        )
      }
    }, [setInputText])

    // Function to explicitly start a new conversation (could be called from UI)
    const startNewConversation = useCallback(async () => {
      try {
        const newConversation = await createConversation()
        setActiveConversationId(newConversation.id)
        // Tags will be cleared by the effect above
        setInputText('')
        return newConversation
      } catch (error) {
        console.error('Failed to start new conversation:', error)
        throw error
      }
    }, [createConversation, setActiveConversationId, setInputText])

    // Mock recording functions
    const startRecording = useCallback(() => {
      setIsRecording(true)
      setRecordingDuration(0)
      setTranscription('')
      onRecordingStateChange(true)

      // Start live transcription simulation immediately when recording starts
      const mockTranscriptions = [
        'Hello, this is a test message',
        'Can you help me with this task?',
        'I need to schedule a meeting for tomorrow',
        "What's the weather like today?",
        'Please send me the latest report',
      ]
      const randomTranscription =
        mockTranscriptions[
          Math.floor(Math.random() * mockTranscriptions.length)
        ]
      const words = randomTranscription.split(' ')

      let currentText = ''
      let wordIndex = 0

      const addWord = () => {
        if (wordIndex < words.length) {
          currentText += (wordIndex > 0 ? ' ' : '') + words[wordIndex]
          setTranscription(currentText)
          wordIndex++

          // Random delay between words (300-800ms) to simulate speaking
          const delay = Math.random() * 500 + 300
          setTimeout(addWord, delay)
        }
        // Don't auto-submit here - wait for user to stop recording
      }

      // Start transcription after a short delay
      setTimeout(addWord, 800)
    }, [onRecordingStateChange])

    const stopRecording = useCallback(() => {
      setIsRecording(false)
      onRecordingStateChange(false)

      // When recording stops, set the transcribed text to input and auto-submit
      if (transcription) {
        setInputText(transcription)
        setTimeout(() => {
          handleSubmit()
          setTranscription('')
        }, 2000)
      }
    }, [onRecordingStateChange, transcription, setInputText, handleSubmit])

    const sendRecording = useCallback(() => {
      if (transcription) {
        setInputText(transcription)
        handleSubmit()
        setTranscription('')
      }
    }, [transcription, setInputText, handleSubmit])

    const cancelRecording = useCallback(() => {
      setIsRecording(false)
      setRecordingDuration(0)
      setTranscription('')
      onRecordingStateChange(false)
    }, [onRecordingStateChange])

    // Expose recording methods via ref
    useImperativeHandle(ref, () => ({
      startRecording,
      stopRecording,
    }))

    // Create the context value
    const contextValue = useMemo(
      () => ({
        // Input state
        inputText,
        setInputText,
        handleInputChange,

        // Mention insertion
        insertMention,

        // Recording state
        isRecording,
        recordingDuration,
        transcription,
        startRecording,
        stopRecording,
        sendRecording,
        cancelRecording,

        // Tagged items state
        taggedItems,
        removeTaggedItem,

        // Attachments state
        attachments,
        addAttachment,
        removeAttachment,
        clearAttachments,
        handleFilesAdded,
        attachmentError,
        setAttachmentError,

        // Message sending state - combine local sending with external streaming
        isSending: sendingMessage || externalIsStreaming,

        // Conversation management
        startNewConversation,

        // UI state
        variant,
        fixedPosition: false,
        autoFocus,
        isHighlighted,

        // References
        editorRef,
        containerRef,
        fileInputRef,

        // Internal submit handler
        handleSubmit,
      }),
      [
        inputText,
        setInputText,
        handleInputChange,
        insertMention,
        isRecording,
        recordingDuration,
        transcription,
        startRecording,
        stopRecording,
        sendRecording,
        cancelRecording,
        taggedItems,
        removeTaggedItem,
        attachments,
        addAttachment,
        removeAttachment,
        clearAttachments,
        handleFilesAdded,
        attachmentError,
        setAttachmentError,
        sendingMessage,
        externalIsStreaming,
        variant,
        autoFocus,
        isHighlighted,
        handleSubmit,
        startNewConversation,
      ],
    )

    return (
      <MessageBarContext.Provider value={contextValue}>
        {children}
      </MessageBarContext.Provider>
    )
  },
)

MessageBarProvider.displayName = 'MessageBarProvider'

// Export a custom hook for using the context
export const useMessageBar = () => {
  const context = useContext(MessageBarContext)

  if (context === undefined) {
    throw new Error('useMessageBar must be used within a MessageBarProvider')
  }

  return context
}
