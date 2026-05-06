import * as Diff from 'diff'
import { createContext, useCallback, useEffect, useMemo, useState } from 'react'

import { useDocumentWorkflow } from './use-document-workflow'

export interface DiffChange {
  id: string
  type: 'add' | 'remove' | 'unchanged'
  content: string
  status: 'pending' | 'accepted' | 'rejected'
}

export interface UseDocumentEditReturn {
  originalContent: string
  editedContent: string
  diffChanges: DiffChange[]
  showDiff: boolean
  isEditing: boolean
  acceptChange: (changeId: string) => void
  rejectChange: (changeId: string) => void
  acceptAllChanges: () => void
  rejectAllChanges: () => void
  toggleDiffView: () => void
  updateContent: (content: string) => void
}

// Context for diff actions
interface DiffActionsContextType {
  acceptAllRequested: boolean
  rejectAllRequested: boolean
  triggerAcceptAll: () => void
  triggerRejectAll: () => void
  clearActions: () => void
}

const DiffActionsContext = createContext<DiffActionsContextType | null>(null)

// Global state for diff actions
let globalDiffActions = {
  acceptAllRequested: false,
  rejectAllRequested: false,
}

const diffActionSubscribers = new Set<() => void>()

function updateGlobalDiffActions(newState: Partial<typeof globalDiffActions>) {
  globalDiffActions = { ...globalDiffActions, ...newState }
  diffActionSubscribers.forEach((callback) => callback())
}

// Export functions for chat to trigger actions
export function triggerAcceptAllChanges() {
  console.log('Triggering accept all changes')
  updateGlobalDiffActions({ acceptAllRequested: true })
}

export function triggerRejectAllChanges() {
  console.log('Triggering reject all changes')
  updateGlobalDiffActions({ rejectAllRequested: true })
}

export function clearDiffActions() {
  updateGlobalDiffActions({
    acceptAllRequested: false,
    rejectAllRequested: false,
  })
}

// Hook for editor to listen to diff actions
export function useDiffActions() {
  const [diffActions, setDiffActions] = useState(globalDiffActions)

  useEffect(() => {
    const handleUpdate = () => {
      setDiffActions({ ...globalDiffActions })
    }

    diffActionSubscribers.add(handleUpdate)
    return () => {
      diffActionSubscribers.delete(handleUpdate)
    }
  }, [])

  return diffActions
}

/**
 * Hook for managing document editing with diff functionality
 * Integrates with the document workflow and provides diff visualization
 */
export function useDocumentEdit(): UseDocumentEditReturn {
  const documentWorkflow = useDocumentWorkflow()
  const [diffChanges, setDiffChanges] = useState<DiffChange[]>([])
  const [showDiffView, setShowDiffView] = useState(false)

  // Generate diff changes from the workflow state
  const generatedDiffChanges = useMemo(() => {
    if (
      !documentWorkflow.state.originalContent ||
      !documentWorkflow.state.editedContent
    ) {
      return []
    }

    const diff = Diff.diffLines(
      documentWorkflow.state.originalContent,
      documentWorkflow.state.editedContent,
    )

    return diff.map((change, index) => ({
      id: `change-${index}`,
      type: change.added
        ? ('add' as const)
        : change.removed
          ? ('remove' as const)
          : ('unchanged' as const),
      content: change.value,
      status: 'pending' as const,
    }))
  }, [
    documentWorkflow.state.originalContent,
    documentWorkflow.state.editedContent,
  ])

  // Update local diff changes when workflow changes
  useMemo(() => {
    setDiffChanges(generatedDiffChanges)
  }, [generatedDiffChanges])

  // Accept a specific change
  const acceptChange = useCallback((changeId: string) => {
    console.log('useDocumentEdit: Accepting change', changeId)
    setDiffChanges((prev) =>
      prev.map((change) =>
        change.id === changeId ? { ...change, status: 'accepted' } : change,
      ),
    )
  }, [])

  // Reject a specific change
  const rejectChange = useCallback((changeId: string) => {
    console.log('useDocumentEdit: Rejecting change', changeId)
    setDiffChanges((prev) =>
      prev.map((change) =>
        change.id === changeId ? { ...change, status: 'rejected' } : change,
      ),
    )
  }, [])

  // Accept all pending changes
  const acceptAllChanges = useCallback(() => {
    console.log('useDocumentEdit: Accepting all changes')
    setDiffChanges((prev) =>
      prev.map((change) =>
        change.status === 'pending'
          ? { ...change, status: 'accepted' }
          : change,
      ),
    )
  }, [])

  // Reject all pending changes
  const rejectAllChanges = useCallback(() => {
    console.log('useDocumentEdit: Rejecting all changes')
    setDiffChanges((prev) =>
      prev.map((change) =>
        change.status === 'pending'
          ? { ...change, status: 'rejected' }
          : change,
      ),
    )
  }, [])

  // Toggle diff view
  const toggleDiffView = useCallback(() => {
    setShowDiffView((prev) => !prev)
  }, [])

  // Update content (for manual editing)
  const updateContent = useCallback((content: string) => {
    // This would update the document content
    // For now, we'll just log it since we're in demo mode
    console.log('Content updated:', content)
  }, [])

  // Determine what content to show
  const finalContent = useMemo(() => {
    if (!documentWorkflow.state.showDiff) {
      return documentWorkflow.state.originalContent
    }

    // Apply accepted/rejected changes to determine final content
    let result = ''
    for (const change of diffChanges) {
      if (change.type === 'unchanged') {
        result += change.content
      } else if (change.type === 'add' && change.status !== 'rejected') {
        result += change.content
      } else if (change.type === 'remove' && change.status === 'rejected') {
        result += change.content
      }
      // Skip removed content that's accepted and added content that's rejected
    }
    return result
  }, [
    diffChanges,
    documentWorkflow.state.originalContent,
    documentWorkflow.state.showDiff,
  ])

  return {
    originalContent: documentWorkflow.state.originalContent,
    editedContent: documentWorkflow.state.editedContent,
    diffChanges,
    showDiff: documentWorkflow.state.showDiff || showDiffView,
    isEditing: documentWorkflow.state.isEditing,
    acceptChange,
    rejectChange,
    acceptAllChanges,
    rejectAllChanges,
    toggleDiffView,
    updateContent,
  }
}
