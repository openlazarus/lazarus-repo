import { useCallback, useEffect, useState } from 'react'

import { useItems } from '@/hooks/core/use-items'
import { useTabs } from '@/hooks/core/use-tabs'
import { useIsMobile } from '@/hooks/ui/layout/use-media-query'
import { File } from '@/model/file'

export interface DocumentWorkflowState {
  isCreating: boolean
  isEditing: boolean
  currentDocument: File | null
  originalContent: string
  editedContent: string
  showDiff: boolean
}

export interface UseDocumentWorkflowReturn {
  state: DocumentWorkflowState
  createNewDocument: (content?: string) => Promise<File | null>
  openDocumentInTab: (document: File) => Promise<void>
  simulateEdit: (editType: string) => Promise<void>
  resetWorkflow: () => void
}

// Global state for document workflow to share between chat and editor
let globalWorkflowState: DocumentWorkflowState = {
  isCreating: false,
  isEditing: false,
  currentDocument: null,
  originalContent: '',
  editedContent: '',
  showDiff: false,
}

// Subscribers for state changes
const subscribers = new Set<() => void>()

// Function to update global state and notify subscribers
function updateGlobalWorkflowState(newState: Partial<DocumentWorkflowState>) {
  globalWorkflowState = { ...globalWorkflowState, ...newState }
  subscribers.forEach((callback) => callback())
}

// Function to subscribe to state changes
function subscribeToWorkflowState(callback: () => void) {
  subscribers.add(callback)
  return () => {
    subscribers.delete(callback)
  }
}

// Function to get current global state
export function getGlobalWorkflowState(): DocumentWorkflowState {
  return globalWorkflowState
}

/**
 * Hook for orchestrating document creation and editing workflow
 * Coordinates between file creation, tab management, and editing operations
 * Uses global state to share between chat and editor instances
 */
export function useDocumentWorkflow(): UseDocumentWorkflowReturn {
  const { createItem } = useItems()
  const { openFileTab } = useTabs()
  const isMobile = useIsMobile()

  const [state, setState] = useState<DocumentWorkflowState>(globalWorkflowState)

  // Subscribe to global state changes
  useEffect(() => {
    const unsubscribe = subscribeToWorkflowState(() => {
      setState(globalWorkflowState)
    })
    return unsubscribe
  }, [])

  // Create a new document with sample content
  const createNewDocument = useCallback(
    async (content?: string): Promise<File | null> => {
      updateGlobalWorkflowState({ isCreating: true })

      try {
        const sampleContent =
          content ||
          `# Sample Document

Welcome to your new document! This is a demonstration of Lazarus's document editing capabilities.

## Features
- Real-time collaborative editing
- AI-powered content suggestions
- Beautiful markdown formatting
- Version history and diff visualization

## Getting Started
This document was automatically created to demonstrate the editing workflow. You can:

1. Request edits through natural language
2. View changes in a visual diff
3. Accept or reject individual changes
4. Collaborate in real-time

## Code Example
\`\`\`javascript
function greetUser(name) {
  console.log(\`Hello, \${name}! Welcome to Lazarus.\`)
  return true
}
\`\`\`

## Conclusion
Lazarus makes document editing intuitive and powerful. Try requesting an edit to see the diff system in action!`

        const newDocument = await createItem<File>('file', {
          name: 'Sample Document.md',
          fileType: 'document',
          content: sampleContent,
          path: '/documents',
          metadata: {
            createdByWorkflow: true,
            purpose: 'demo',
          },
        })

        updateGlobalWorkflowState({
          isCreating: false,
          currentDocument: newDocument,
          originalContent: sampleContent,
        })

        return newDocument
      } catch (error) {
        console.error('Error creating document:', error)
        updateGlobalWorkflowState({ isCreating: false })
        return null
      }
    },
    [createItem],
  )

  // Open document in tab (only on desktop)
  const openDocumentInTab = useCallback(
    async (document: File) => {
      if (!isMobile && document.id) {
        try {
          await openFileTab(document.id, {
            name: document.name || 'Untitled',
            fileType: document.fileType || 'document',
          })
        } catch (error) {
          console.error('Error opening document in tab:', error)
        }
      }
    },
    [openFileTab, isMobile],
  )

  // Simulate document editing with different types
  const simulateEdit = useCallback(async (editType: string) => {
    if (!globalWorkflowState.currentDocument) return

    updateGlobalWorkflowState({ isEditing: true })

    try {
      let editedContent = globalWorkflowState.originalContent

      switch (editType) {
        case 'edit-title':
          editedContent = globalWorkflowState.originalContent.replace(
            '# Sample Document',
            '# Enhanced Sample Document',
          )
          break

        case 'add-section':
          editedContent = globalWorkflowState.originalContent.replace(
            '## Conclusion',
            `## New Section
This is a brand new section that was added to demonstrate the editing capabilities. It shows how content can be seamlessly inserted into existing documents.

### Subsection
Even subsections can be added with proper hierarchy and formatting.

## Conclusion`,
          )
          break

        case 'fix-grammar':
          editedContent = globalWorkflowState.originalContent
            .replace(
              'This document was automatically created to demonstrate the editing workflow.',
              'This document has been automatically created to demonstrate our comprehensive editing workflow.',
            )
            .replace('Try requesting an edit', 'Try requesting any edit')
            .replace('makes document editing', 'makes document editing both')
          break

        default:
          // Custom edit - make multiple changes
          editedContent = globalWorkflowState.originalContent
            .replace('# Sample Document', '# Professional Document')
            .replace(
              'Welcome to your new document!',
              'Welcome to your professionally crafted document!',
            )
            .replace('return true', 'return false')
      }

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      updateGlobalWorkflowState({
        isEditing: false,
        editedContent,
        showDiff: true,
      })

      console.log('Workflow state updated:', {
        originalContent:
          globalWorkflowState.originalContent.substring(0, 100) + '...',
        editedContent: editedContent.substring(0, 100) + '...',
        showDiff: true,
      })
    } catch (error) {
      console.error('Error simulating edit:', error)
      updateGlobalWorkflowState({ isEditing: false })
    }
  }, [])

  // Reset the workflow state
  const resetWorkflow = useCallback(() => {
    updateGlobalWorkflowState({
      isCreating: false,
      isEditing: false,
      currentDocument: null,
      originalContent: '',
      editedContent: '',
      showDiff: false,
    })
  }, [])

  return {
    state,
    createNewDocument,
    openDocumentInTab,
    simulateEdit,
    resetWorkflow,
  }
}
