import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $createParagraphNode,
  $getRoot,
  COMMAND_PRIORITY_EDITOR,
  LexicalCommand,
  createCommand,
} from 'lexical'
import { useCallback, useEffect } from 'react'

import { ADD_TO_HISTORY_COMMAND } from './history-plugin'

// Command to clear the editor
export const CLEAR_EDITOR_COMMAND: LexicalCommand<void> = createCommand(
  'CLEAR_EDITOR_COMMAND',
)

// Command to submit the editor content
export const SUBMIT_EDITOR_COMMAND: LexicalCommand<void> = createCommand(
  'SUBMIT_EDITOR_COMMAND',
)

// Command to notify when content is completely empty
export const CONTENT_EMPTY_COMMAND: LexicalCommand<void> = createCommand(
  'CONTENT_EMPTY_COMMAND',
)

export type MessageBarPluginProps = {
  setEditorRef?: (editor: any) => void
  autoFocus?: boolean
  variant?: 'mobile' | 'desktop'
  handleSubmit?: (text: string) => void
  onContentEmpty?: () => void
}

// Plugin to manage MessageBar functionality
export function MessageBarPlugin({
  setEditorRef,
  autoFocus = false,
  variant: _variant = 'desktop',
  handleSubmit,
  onContentEmpty,
}: MessageBarPluginProps) {
  const [editor] = useLexicalComposerContext()

  // Get text content from editor for submission
  const submitEditorContent = useCallback(() => {
    if (typeof handleSubmit !== 'function') return

    const editorState = editor.getEditorState()
    const text = editorState.read(() => {
      return $getRoot().getTextContent()
    })

    if (text.trim()) {
      // Add to history before submitting
      editor.dispatchCommand(ADD_TO_HISTORY_COMMAND, text)

      handleSubmit(text)

      // Clear the editor after submitting
      editor.update(() => {
        const root = $getRoot()
        root.clear()
        root.append($createParagraphNode())

        // Notify that content is empty after submission
        if (onContentEmpty) {
          onContentEmpty()
        }
      })
    }
  }, [editor, handleSubmit, onContentEmpty])

  // Clear the editor content
  const clearEditorContent = useCallback(() => {
    editor.update(() => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode())
      editor.focus()

      // Notify that content is empty after clearing
      if (onContentEmpty) {
        onContentEmpty()
      }
    })
  }, [editor, onContentEmpty])

  // Check if content is empty and notify if needed
  const checkIfEmpty = useCallback(() => {
    const editorState = editor.getEditorState()
    const isEmpty = editorState.read(() => {
      const root = $getRoot()
      const text = root.getTextContent()
      return text.trim() === ''
    })

    if (isEmpty && onContentEmpty) {
      onContentEmpty()
    }
  }, [editor, onContentEmpty])

  // Register editor ref
  useEffect(() => {
    if (setEditorRef) {
      setEditorRef(editor)
    }
  }, [editor, setEditorRef])

  // Auto focus on mount if needed
  useEffect(() => {
    if (autoFocus) {
      editor.focus()
    }
  }, [editor, autoFocus])

  // Register command handlers
  useEffect(() => {
    // Register clear command
    const clearDisposer = editor.registerCommand(
      CLEAR_EDITOR_COMMAND,
      () => {
        clearEditorContent()
        return true
      },
      COMMAND_PRIORITY_EDITOR,
    )

    // Register submit command
    const submitDisposer = editor.registerCommand(
      SUBMIT_EDITOR_COMMAND,
      () => {
        submitEditorContent()
        return true
      },
      COMMAND_PRIORITY_EDITOR,
    )

    // Register content empty command
    const emptyDisposer = editor.registerCommand(
      CONTENT_EMPTY_COMMAND,
      () => {
        checkIfEmpty()
        return true
      },
      COMMAND_PRIORITY_EDITOR,
    )

    // Listen for updates to check for empty content
    const updateListener = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot()
        const text = root.getTextContent()
        if (text.trim() === '' && onContentEmpty) {
          onContentEmpty()
        }
      })
    })

    return () => {
      clearDisposer()
      submitDisposer()
      emptyDisposer()
      updateListener()
    }
  }, [
    editor,
    clearEditorContent,
    submitEditorContent,
    checkIfEmpty,
    onContentEmpty,
  ])

  return null
}
