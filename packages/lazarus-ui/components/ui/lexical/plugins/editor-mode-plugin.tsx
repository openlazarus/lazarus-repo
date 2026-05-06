'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect } from 'react'

interface EditorModePluginProps {
  mode: 'code' | 'csv' | 'document' | 'markdown' | 'default'
}

export function EditorModePlugin({ mode }: EditorModePluginProps) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const rootElement = editor.getRootElement()
    if (!rootElement) return

    // Find the editor container
    const editorContainer = rootElement.closest('.lexical-editor-container')
    if (!editorContainer) return

    // Remove all mode classes
    editorContainer.classList.remove(
      'code-editor-mode',
      'csv-editor-mode',
      'document-mode',
      'markdown-mode',
    )

    // Add the appropriate mode class
    switch (mode) {
      case 'code':
        editorContainer.classList.add('code-editor-mode')
        break
      case 'csv':
        editorContainer.classList.add('csv-editor-mode')
        break
      case 'document':
        editorContainer.classList.add('document-mode')
        break
      case 'markdown':
        editorContainer.classList.add('markdown-mode')
        break
      default:
        // No specific mode class for default
        break
    }

    // Cleanup on unmount
    return () => {
      editorContainer.classList.remove(
        'code-editor-mode',
        'csv-editor-mode',
        'document-mode',
        'markdown-mode',
      )
    }
  }, [editor, mode])

  return null
}
