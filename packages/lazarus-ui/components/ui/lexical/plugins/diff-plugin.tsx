import { $convertFromMarkdownString } from '@lexical/markdown'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import * as Diff from 'diff'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $nodesOfType,
  LexicalEditor,
} from 'lexical'
import { useEffect } from 'react'

import { COMPLETE_TRANSFORMERS } from '../markdown-transformers'
import { $createDiffTextNode, DiffTextNode } from '../nodes/diff-text-node'

export interface DiffPluginProps {
  originalContent: string
  editedContent: string
  showDiff: boolean
  onChangeAction?: (changeId: string, action: 'accept' | 'reject') => void
  diffActions?: { acceptAllRequested: boolean; rejectAllRequested: boolean }
}

/**
 * Creates the diff state by first parsing markdown then applying inline diffs
 */
// Commented out - not currently used
/*
function createInlineDiffState(
  editor: LexicalEditor,
  originalContent: string,
  editedContent: string,
) {
  editor.update(() => {
    const root = $getRoot()
    root.clear()

    // First, parse the original content as markdown to get proper structure
    $convertFromMarkdownString(originalContent, COMPLETE_TRANSFORMERS)

    // Now apply word-level diffs to replace text nodes where needed
    const diffResult = Diff.diffWords(originalContent, editedContent)

    // Get all text nodes from the parsed markdown
    const allTextNodes = root.getAllTextNodes()

    // Track our position in the original content
    let contentPosition = 0
    let changeIndex = 0

    diffResult.forEach((change) => {
      if (!change.added && !change.removed) {
        // Unchanged content - advance position
        contentPosition += change.value.length
      } else if (change.added) {
        // Find the text node at this position and insert the addition
        const targetNode = findTextNodeAtPosition(allTextNodes, contentPosition)
        if (targetNode) {
          const diffNode = $createDiffTextNode(
            'added',
            changeIndex++,
            change.value,
          )
          targetNode.insertAfter(diffNode)
        }
      } else if (change.removed) {
        // Find the text node containing this content and replace with removal
        const targetNode = findTextNodeWithContent(
          allTextNodes,
          change.value,
          contentPosition,
        )
        if (targetNode) {
          const diffNode = $createDiffTextNode(
            'removed',
            changeIndex++,
            change.value,
          )
          // Replace the content in the text node
          const nodeText = targetNode.getTextContent()
          const beforeText = nodeText.substring(
            0,
            nodeText.indexOf(change.value),
          )
          const afterText = nodeText.substring(
            nodeText.indexOf(change.value) + change.value.length,
          )

          if (beforeText) {
            const beforeNode = $createTextNode(beforeText)
            targetNode.insertBefore(beforeNode)
          }

          targetNode.insertBefore(diffNode)

          if (afterText) {
            const afterNode = $createTextNode(afterText)
            targetNode.insertBefore(afterNode)
          }

          targetNode.remove()
        }
        contentPosition += change.value.length
      }
    })
  })
}

// Helper function to find text node at specific position
function findTextNodeAtPosition(
  textNodes: TextNode[],
  position: number,
): TextNode | null {
  let currentPos = 0
  for (const node of textNodes) {
    const nodeLength = node.getTextContent().length
    if (currentPos + nodeLength >= position) {
      return node
    }
    currentPos += nodeLength
  }
  return textNodes[textNodes.length - 1] || null
}

// Helper function to find text node containing specific content
function findTextNodeWithContent(
  textNodes: TextNode[],
  content: string,
  _nearPosition: number,
): TextNode | null {
  for (const node of textNodes) {
    if (node.getTextContent().includes(content)) {
      return node
    }
  }
  return null
}
*/

/**
 * Simplified approach - just show the diff as separate blocks
 */
function createSimpleDiffState(
  editor: LexicalEditor,
  diffResult: Diff.Change[],
) {
  editor.update(() => {
    const root = $getRoot()
    root.clear()

    diffResult.forEach((part, index) => {
      if (!part.value.trim()) return

      const paragraph = $createParagraphNode()

      if (part.added) {
        const node = $createDiffTextNode('added', index, part.value.trim())
        paragraph.append(node)
      } else if (part.removed) {
        const node = $createDiffTextNode('removed', index, part.value.trim())
        paragraph.append(node)
      } else {
        const node = $createTextNode(part.value.trim())
        paragraph.append(node)
      }

      root.append(paragraph)
    })

    if (root.getChildrenSize() === 0) {
      const paragraph = $createParagraphNode()
      root.append(paragraph)
    }
  })
}

export function DiffPlugin({
  originalContent,
  editedContent,
  showDiff,
  onChangeAction,
  diffActions,
}: DiffPluginProps) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!showDiff || !originalContent || !editedContent) {
      // Show original content with proper markdown parsing
      editor.update(() => {
        const root = $getRoot()
        root.clear()

        if (originalContent) {
          $convertFromMarkdownString(originalContent, COMPLETE_TRANSFORMERS)
        }

        if (root.getChildrenSize() === 0) {
          const paragraph = $createParagraphNode()
          root.append(paragraph)
        }
      })
      return
    }

    // Use simple diff for now - inline diff is complex
    const diffResult = Diff.diffLines(originalContent, editedContent)
    createSimpleDiffState(editor, diffResult)
  }, [editor, originalContent, editedContent, showDiff])

  // Handle diff actions (accept all / reject all)
  useEffect(() => {
    if (!diffActions || !showDiff) return

    if (diffActions.acceptAllRequested) {
      // Applying accept all changes to editor
      editor.update(() => {
        $acceptAllChanges()
      })
      // Import and call clearDiffActions
      import('@/hooks/features/document/use-document-edit').then(
        ({ clearDiffActions }) => {
          clearDiffActions()
        },
      )
    } else if (diffActions.rejectAllRequested) {
      // Applying reject all changes to editor
      editor.update(() => {
        $rejectAllChanges()
      })
      // Import and call clearDiffActions
      import('@/hooks/features/document/use-document-edit').then(
        ({ clearDiffActions }) => {
          clearDiffActions()
        },
      )
    }
  }, [diffActions, editor, showDiff])

  // Enhanced click handler for group-based interactions
  useEffect(() => {
    const handleDiffGroupAction = (event: Event) => {
      const customEvent = event as CustomEvent
      const {
        changeIndex,
        action,
        diffType,
        isGroupAction: _isGroupAction,
        shouldCreateHistoryEntry,
      } = customEvent.detail

      // Diff group action

      if (action === 'accept') {
        // Create a separate history entry for the accept action
        editor.update(
          () => {
            $acceptDiffChangeGroup(changeIndex, diffType)
          },
          { discrete: shouldCreateHistoryEntry },
        )
      } else if (action === 'reject') {
        // Create a separate history entry for the reject action
        editor.update(
          () => {
            $rejectDiffChangeGroup(changeIndex, diffType)
          },
          { discrete: shouldCreateHistoryEntry },
        )
      }

      if (onChangeAction) {
        onChangeAction(`change-${changeIndex}`, action)
      }
    }

    // Listen for the new group action events
    document.addEventListener('diff-group-action', handleDiffGroupAction)

    return () => {
      document.removeEventListener('diff-group-action', handleDiffGroupAction)
    }
  }, [editor, onChangeAction])

  return null
}

// Helper function to accept a diff change group (handles related deletion+insertion pairs)
export function $acceptDiffChangeGroup(
  changeIndex: number,
  diffType: string,
): void {
  const diffNodes = $nodesOfType(DiffTextNode)

  if (diffType === 'added') {
    // When accepting an insertion, also accept any related deletion
    diffNodes.forEach((diffNode) => {
      const nodeIndex = diffNode.getChangeIndex()

      if (
        nodeIndex === changeIndex ||
        Math.abs(nodeIndex - changeIndex) === 1
      ) {
        if (diffNode.getDiffType() === 'added') {
          // Convert added node to regular text
          const textNode = $createTextNode(diffNode.getTextContent())
          textNode.setFormat(diffNode.getFormat())
          textNode.setStyle(diffNode.getStyle())
          diffNode.replace(textNode)
        } else if (diffNode.getDiffType() === 'removed') {
          // Remove related deletion
          diffNode.remove()
        }
      }
    })
  } else if (diffType === 'removed') {
    // When accepting a deletion, also handle any related insertion
    diffNodes.forEach((diffNode) => {
      const nodeIndex = diffNode.getChangeIndex()

      if (
        nodeIndex === changeIndex ||
        Math.abs(nodeIndex - changeIndex) === 1
      ) {
        if (diffNode.getDiffType() === 'removed') {
          // Remove the deleted text
          diffNode.remove()
        } else if (diffNode.getDiffType() === 'added') {
          // Convert related insertion to regular text
          const textNode = $createTextNode(diffNode.getTextContent())
          textNode.setFormat(diffNode.getFormat())
          textNode.setStyle(diffNode.getStyle())
          diffNode.replace(textNode)
        }
      }
    })
  }
}

// Helper function to reject a diff change group (handles related deletion+insertion pairs)
export function $rejectDiffChangeGroup(
  changeIndex: number,
  diffType: string,
): void {
  const diffNodes = $nodesOfType(DiffTextNode)

  if (diffType === 'added') {
    // When rejecting an insertion, also reject any related deletion (keep original)
    diffNodes.forEach((diffNode) => {
      const nodeIndex = diffNode.getChangeIndex()

      if (
        nodeIndex === changeIndex ||
        Math.abs(nodeIndex - changeIndex) === 1
      ) {
        if (diffNode.getDiffType() === 'added') {
          // Remove the insertion
          diffNode.remove()
        } else if (diffNode.getDiffType() === 'removed') {
          // Keep original text (convert deletion back to regular text)
          const textNode = $createTextNode(diffNode.getTextContent())
          textNode.setFormat(diffNode.getFormat())
          textNode.setStyle(diffNode.getStyle())
          diffNode.replace(textNode)
        }
      }
    })
  } else if (diffType === 'removed') {
    // When rejecting a deletion, also reject any related insertion
    diffNodes.forEach((diffNode) => {
      const nodeIndex = diffNode.getChangeIndex()

      if (
        nodeIndex === changeIndex ||
        Math.abs(nodeIndex - changeIndex) === 1
      ) {
        if (diffNode.getDiffType() === 'removed') {
          // Keep original text (convert deletion back to regular text)
          const textNode = $createTextNode(diffNode.getTextContent())
          textNode.setFormat(diffNode.getFormat())
          textNode.setStyle(diffNode.getStyle())
          diffNode.replace(textNode)
        } else if (diffNode.getDiffType() === 'added') {
          // Remove related insertion
          diffNode.remove()
        }
      }
    })
  }
}

export function $acceptAllChanges(): void {
  const diffNodes = $nodesOfType(DiffTextNode)
  diffNodes.forEach((diffNode) => {
    if (diffNode.getDiffType() === 'added') {
      diffNode.setDiffType('unchanged')
    } else if (diffNode.getDiffType() === 'removed') {
      diffNode.remove()
    }
  })
}

export function $rejectAllChanges(): void {
  const diffNodes = $nodesOfType(DiffTextNode)
  diffNodes.forEach((diffNode) => {
    if (diffNode.getDiffType() === 'added') {
      diffNode.remove()
    } else if (diffNode.getDiffType() === 'removed') {
      diffNode.setDiffType('unchanged')
    }
  })
}
