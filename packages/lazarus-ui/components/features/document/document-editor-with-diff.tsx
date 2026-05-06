'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import React, { useCallback, useEffect, useMemo } from 'react'

import { BaseEditorLayout } from '@/components/features/editors/base-editor-layout'
import { LexicalEditor as LexicalEditorComponent } from '@/components/ui/lexical/lexical-editor'
import {
  $acceptDiffChangeGroup,
  $rejectDiffChangeGroup,
  DiffPlugin,
} from '@/components/ui/lexical/plugins/diff-plugin'
import {
  useDiffActions,
  useDocumentEdit,
} from '@/hooks/features/document/use-document-edit'

interface DocumentEditorWithDiffProps {
  content: string
  onChange?: (content: string) => void
  className?: string
  lastModified?: Date
}

// Component to handle individual diff actions using Lexical context
const IndividualDiffActionsHandler: React.FC<{
  onChangeAction: (changeId: string, action: 'accept' | 'reject') => void
}> = ({ onChangeAction }) => {
  const [editor] = useLexicalComposerContext()

  // Create a version of the action handler that applies to the editor
  const handleEditorChangeAction = useCallback(
    (changeId: string, action: 'accept' | 'reject') => {
      // Extract changeIndex from changeId format "change-{index}"
      const changeIndex = parseInt(changeId.replace('change-', ''), 10)

      // Find the diff type for this change
      const diffElement = document.querySelector(
        `[data-change-index="${changeIndex}"]`,
      )
      const diffType = diffElement?.classList.contains('diff-added')
        ? 'added'
        : 'removed'

      editor.update(() => {
        if (action === 'accept') {
          $acceptDiffChangeGroup(changeIndex, diffType)
        } else {
          $rejectDiffChangeGroup(changeIndex, diffType)
        }
      })

      // Also call the original action handler
      onChangeAction(changeId, action)
    },
    [editor, onChangeAction],
  )

  // Update the DiffPlugin to use our editor-aware handler
  useEffect(() => {
    const handleDiffClick = (event: Event) => {
      const customEvent = event as CustomEvent
      const {
        changeIndex: _changeIndex,
        diffType,
        changeId,
        action,
      } = customEvent.detail

      if (changeId && diffType !== 'unchanged' && action) {
        handleEditorChangeAction(changeId, action)
      }
    }

    const editorElement = editor.getRootElement()
    if (editorElement) {
      editorElement.addEventListener('diff-change-click', handleDiffClick)
      return () => {
        editorElement.removeEventListener('diff-change-click', handleDiffClick)
      }
    }
  }, [editor, handleEditorChangeAction])

  return null
}

export const DocumentEditorWithDiff: React.FC<DocumentEditorWithDiffProps> = ({
  content,
  onChange,
  className,
  lastModified = new Date(),
}) => {
  const {
    originalContent,
    editedContent,
    showDiff,
    isEditing,
    acceptChange,
    rejectChange,
  } = useDocumentEdit()

  const diffActions = useDiffActions()

  // Handle content change from editor
  const handleEditorChange = useCallback(
    (newContent: string) => {
      onChange?.(newContent)
    },
    [onChange],
  )

  // Handle individual change actions
  const handleChangeAction = useCallback(
    (changeId: string, action: 'accept' | 'reject') => {
      if (action === 'accept') {
        acceptChange(changeId)
      } else {
        rejectChange(changeId)
      }
    },
    [acceptChange, rejectChange],
  )

  // Add keyboard shortcuts for accept/reject
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        if (event.key === 'y') {
          event.preventDefault()
          // Find focused diff node and accept it
          const focusedElement = document.querySelector('.diff-focused')
          if (focusedElement) {
            const changeIndex = focusedElement.getAttribute('data-change-index')
            if (changeIndex) {
              // Trigger the same action as clicking the accept button
              const event = new CustomEvent('diff-change-click', {
                bubbles: true,
                detail: {
                  changeIndex: parseInt(changeIndex),
                  diffType: focusedElement.classList.contains('diff-added')
                    ? 'added'
                    : 'removed',
                  changeId: `change-${changeIndex}`,
                  action: 'accept',
                },
              })
              focusedElement.dispatchEvent(event)
            }
          }
        } else if (event.key === 'n') {
          event.preventDefault()
          // Find focused diff node and reject it
          const focusedElement = document.querySelector('.diff-focused')
          if (focusedElement) {
            const changeIndex = focusedElement.getAttribute('data-change-index')
            if (changeIndex) {
              // Trigger the same action as clicking the reject button
              const event = new CustomEvent('diff-change-click', {
                bubbles: true,
                detail: {
                  changeIndex: parseInt(changeIndex),
                  diffType: focusedElement.classList.contains('diff-added')
                    ? 'added'
                    : 'removed',
                  changeId: `change-${changeIndex}`,
                  action: 'reject',
                },
              })
              focusedElement.dispatchEvent(event)
            }
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Determine if we should show diff mode (seamless)
  const shouldShowDiff = showDiff && originalContent && editedContent

  // Get display content
  const displayContent = useMemo(() => {
    return content || originalContent
  }, [content, originalContent])

  // Prepare plugins for diff mode
  const editorPlugins = useMemo(() => {
    if (shouldShowDiff) {
      return [
        <DiffPlugin
          key='diff-plugin'
          originalContent={originalContent}
          editedContent={editedContent}
          showDiff={true}
          onChangeAction={() => {}} // We handle this in IndividualDiffActionsHandler
          diffActions={diffActions}
        />,
      ]
    }
    return []
  }, [shouldShowDiff, originalContent, editedContent, diffActions])

  return (
    <BaseEditorLayout
      className={className}
      lastModified={lastModified}
      isEditing={isEditing}
      editingStatus='Lazarus editing'>
      <div className='h-full bg-white'>
        <LexicalEditorComponent
          content={displayContent}
          onChange={handleEditorChange}
          placeholder='Start writing your document...'
          editable={!shouldShowDiff} // Make read-only in diff mode
          plugins={[
            ...editorPlugins,
            <IndividualDiffActionsHandler
              key='individual-diff-actions'
              onChangeAction={handleChangeAction}
            />,
          ]}
        />
      </div>
    </BaseEditorLayout>
  )
}
