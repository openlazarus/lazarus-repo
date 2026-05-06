import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  COMMAND_PRIORITY_HIGH,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  LexicalCommand,
  createCommand,
} from 'lexical'
import { useCallback, useEffect, useRef, useState } from 'react'

// Command to add message to history
export const ADD_TO_HISTORY_COMMAND: LexicalCommand<string> = createCommand(
  'ADD_TO_HISTORY_COMMAND',
)

// Maximum number of messages to store in history
const MAX_HISTORY_SIZE = 50

export type HistoryPluginProps = {
  // Optional callback when history changes
  onHistoryChange?: (history: string[]) => void
}

// Plugin to manage message history with arrow key navigation
export function HistoryPlugin({ onHistoryChange }: HistoryPluginProps = {}) {
  const [editor] = useLexicalComposerContext()
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const currentTextRef = useRef<string>('')

  // Add a message to history
  const addToHistory = useCallback(
    (message: string) => {
      if (!message.trim()) return

      setHistory((prev) => {
        // Don't add duplicates of the most recent message
        if (prev[prev.length - 1] === message) {
          return prev
        }

        // Add message and trim to max size
        const newHistory = [...prev, message].slice(-MAX_HISTORY_SIZE)

        // Notify listener if provided
        if (onHistoryChange) {
          onHistoryChange(newHistory)
        }

        return newHistory
      })

      // Reset history index for next navigation
      setHistoryIndex(-1)
      currentTextRef.current = ''
    },
    [onHistoryChange],
  )

  // Set editor content to a specific message
  const setEditorContent = useCallback(
    (content: string) => {
      editor.update(() => {
        const root = $getRoot()
        root.clear()

        if (content) {
          const paragraph = $createParagraphNode()
          const textNode = $createTextNode(content)
          paragraph.append(textNode)
          root.append(paragraph)
        } else {
          root.append($createParagraphNode())
        }
      })
    },
    [editor],
  )

  // Navigate history up (older messages)
  const navigateHistoryUp = useCallback(() => {
    const editorState = editor.getEditorState()
    const currentText = editorState.read(() => $getRoot().getTextContent())

    // Only navigate if editor is empty or we're already navigating history
    if (currentText.trim() && historyIndex === -1) return false

    if (history.length === 0) return false

    // Save current text if starting navigation
    if (historyIndex === -1) {
      currentTextRef.current = currentText
    }

    // Calculate new index
    const newIndex =
      historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1)

    if (newIndex !== historyIndex) {
      setHistoryIndex(newIndex)
      setEditorContent(history[newIndex])
      return true
    }

    return false
  }, [editor, history, historyIndex, setEditorContent])

  // Navigate history down (newer messages)
  const navigateHistoryDown = useCallback(() => {
    // Only navigate if we're in history navigation mode
    if (historyIndex === -1) return false

    // Calculate new index
    const newIndex = Math.min(history.length - 1, historyIndex + 1)

    if (newIndex !== historyIndex) {
      setHistoryIndex(newIndex)

      // If we've reached the end, restore original text
      if (
        newIndex === history.length - 1 &&
        historyIndex === history.length - 1
      ) {
        setHistoryIndex(-1)
        setEditorContent(currentTextRef.current)
      } else {
        setEditorContent(history[newIndex])
      }

      return true
    } else if (historyIndex === history.length - 1) {
      // If at the last item and pressing down, exit history mode
      setHistoryIndex(-1)
      setEditorContent(currentTextRef.current)
      return true
    }

    return false
  }, [history, historyIndex, setEditorContent])

  // Register commands
  useEffect(() => {
    // Register add to history command
    const addHistoryDisposer = editor.registerCommand(
      ADD_TO_HISTORY_COMMAND,
      (message: string) => {
        addToHistory(message)
        return true
      },
      COMMAND_PRIORITY_HIGH,
    )

    // Register arrow up command
    const arrowUpDisposer = editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      (event) => {
        if (navigateHistoryUp()) {
          event?.preventDefault()
          return true
        }
        return false
      },
      COMMAND_PRIORITY_HIGH,
    )

    // Register arrow down command
    const arrowDownDisposer = editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      (event) => {
        if (navigateHistoryDown()) {
          event?.preventDefault()
          return true
        }
        return false
      },
      COMMAND_PRIORITY_HIGH,
    )

    // Listen for text changes to reset history navigation
    const updateListener = editor.registerUpdateListener(({ editorState }) => {
      // Only reset if user is typing (not from history navigation)
      if (historyIndex !== -1) {
        editorState.read(() => {
          const currentText = $getRoot().getTextContent()
          const historyText = history[historyIndex] || ''

          // If text changed from what's in history, exit history mode
          if (currentText !== historyText) {
            setHistoryIndex(-1)
            currentTextRef.current = ''
          }
        })
      }
    })

    return () => {
      addHistoryDisposer()
      arrowUpDisposer()
      arrowDownDisposer()
      updateListener()
    }
  }, [
    editor,
    addToHistory,
    navigateHistoryUp,
    navigateHistoryDown,
    history,
    historyIndex,
  ])

  // Persist history to localStorage (optional)
  useEffect(() => {
    // Load history from localStorage on mount
    const savedHistory = localStorage.getItem('lazarus:message-bar-history')
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory)
        if (Array.isArray(parsed)) {
          setHistory(parsed.slice(-MAX_HISTORY_SIZE))
        }
      } catch (e) {
        console.error('Failed to load message history:', e)
      }
    }
  }, [])

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem(
        'lazarus:message-bar-history',
        JSON.stringify(history),
      )
    }
  }, [history])

  return null
}
