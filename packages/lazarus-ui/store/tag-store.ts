import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  ElementNode,
} from 'lexical'
import React from 'react'
import { create } from 'zustand'

import { $createMentionNode } from '@/components/ui/message-bar/components/lexical-text-area/nodes/mention-node'
import type { WorkspaceFile } from '@/hooks/features/workspace/types'
import { Item } from '@/model/item'

import { WorkspaceAgent } from './agents-store'

/**
 * Unified tagged item for the message bar
 * This represents any item that can be tagged/mentioned in a chat message
 */
export type TaggedItemType =
  | 'file'
  | 'directory'
  | 'agent'
  | 'source'
  | 'conversation'
  | 'activity'
  | 'app'
  | 'message'
  | 'link'

export interface TaggedItem {
  id: string
  type: TaggedItemType
  name: string
  path?: string // For files/directories
  icon?: string // Optional custom icon path
  fileType?: string // For files: document, code, image, etc.
  appType?: string // For apps
  metadata?: Record<string, unknown>
}

/**
 * Convert a WorkspaceFile to a TaggedItem
 */
export function fileToTaggedItem(file: WorkspaceFile): TaggedItem {
  return {
    id: file.path, // Use path as ID for files
    type: file.type === 'directory' ? 'directory' : 'file',
    name: file.name,
    path: file.path,
    fileType: file.type === 'file' ? detectFileType(file.name) : undefined,
  }
}

/**
 * Convert a WorkspaceAgent to a TaggedItem
 */
export function agentToTaggedItem(agent: WorkspaceAgent): TaggedItem {
  return {
    id: agent.id,
    type: 'agent',
    name: agent.name,
    metadata: {
      description: agent.description,
      enabled: agent.enabled,
    },
  }
}

/**
 * Convert a legacy Item to a TaggedItem
 */
export function itemToTaggedItem(item: Item): TaggedItem {
  // Map old item types to new TaggedItemType
  let type: TaggedItemType = 'file'
  let fileType: string | undefined

  switch (item.type) {
    case 'file':
      type = 'file'
      fileType = (item as any).fileType || detectFileType(item.name || '')
      break
    case 'conversation':
      type = 'conversation'
      break
    case 'app':
      type = 'app'
      break
    case 'message':
      type = 'message'
      break
    case 'link':
      type = 'link'
      break
    case 'source':
      type = 'source'
      break
    default:
      type = 'file'
  }

  return {
    id: item.id,
    type,
    name: item.name || (item as any).title || 'Untitled',
    path: (item as any).path,
    fileType,
    appType: (item as any).app_type,
    icon: item.icon,
    metadata: item.metadata,
  }
}

/**
 * Detect file type from filename extension
 */
function detectFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''

  const typeMap: Record<string, string> = {
    // Documents
    md: 'document',
    txt: 'document',
    doc: 'document',
    docx: 'document',
    // Code
    ts: 'code',
    tsx: 'code',
    js: 'code',
    jsx: 'code',
    py: 'code',
    rs: 'code',
    go: 'code',
    java: 'code',
    // Data
    json: 'code',
    yaml: 'code',
    yml: 'code',
    toml: 'code',
    // Spreadsheets
    csv: 'table',
    xlsx: 'spreadsheet',
    xls: 'spreadsheet',
    // Images
    png: 'image',
    jpg: 'image',
    jpeg: 'image',
    gif: 'image',
    svg: 'image',
    webp: 'image',
    // PDF
    pdf: 'pdf',
    // Database
    db: 'sqlite_database',
    sqlite: 'sqlite_database',
    sqlite3: 'sqlite_database',
  }

  return typeMap[ext] || 'other'
}

interface TagStoreState {
  // Tagged items for the current message
  taggedItems: TaggedItem[]

  // Editor reference for inserting mentions
  editorRef: React.RefObject<any> | null

  // Actions
  addTag: (item: TaggedItem) => void
  addTagFromItem: (item: Item) => void // Add from legacy Item
  addTagFromFile: (file: WorkspaceFile) => void // Add from WorkspaceFile
  addTagFromAgent: (agent: WorkspaceAgent) => void // Add from WorkspaceAgent
  addTagWithMention: (item: TaggedItem) => void // Add tag AND insert mention in editor
  removeTag: (id: string) => void
  clearTags: () => void
  hasTag: (id: string) => boolean

  // Editor management
  setEditorRef: (ref: React.RefObject<any> | null) => void

  // Bulk operations
  setTags: (items: TaggedItem[]) => void
}

/**
 * Tag Store - Manages tagged items for the message bar
 * Uses Zustand for simple, efficient state management
 */
export const useTagStore = create<TagStoreState>()((set, get) => ({
  taggedItems: [],
  editorRef: null,

  addTag: (item) => {
    set((state) => {
      // Avoid duplicates
      if (state.taggedItems.some((t) => t.id === item.id)) {
        return state
      }
      console.log('[TagStore] Adding tag:', item)
      return { taggedItems: [...state.taggedItems, item] }
    })
  },

  addTagFromItem: (item) => {
    const taggedItem = itemToTaggedItem(item)
    get().addTag(taggedItem)
  },

  addTagFromFile: (file) => {
    const taggedItem = fileToTaggedItem(file)
    get().addTag(taggedItem)
  },

  addTagFromAgent: (agent) => {
    const taggedItem = agentToTaggedItem(agent)
    get().addTag(taggedItem)
  },

  // Add tag AND insert mention into the editor
  addTagWithMention: (item) => {
    const state = get()

    // Check for duplicates first
    if (state.taggedItems.some((t) => t.id === item.id)) {
      console.log('[TagStore] Tag already exists:', item.id)
      return
    }

    // Add to store
    set((s) => ({ taggedItems: [...s.taggedItems, item] }))
    console.log('[TagStore] Adding tag with mention:', item)

    // Insert mention into editor if available
    const editor = state.editorRef?.current
    if (editor) {
      editor.update(() => {
        const root = $getRoot()
        const selection = $getSelection()

        // Create compact mention format: @{type:id}
        const structuredMention = `{${item.type}:${item.id}}`
        const mentionNode = $createMentionNode(
          structuredMention,
          `@${item.name}`,
        )

        if ($isRangeSelection(selection)) {
          // Insert at cursor position
          selection.insertNodes([mentionNode, $createTextNode(' ')])
        } else {
          // Append to end of content inside a paragraph node
          const lastChild = root.getLastChild()
          if (lastChild instanceof ElementNode) {
            // Append inside the existing paragraph
            lastChild.append(mentionNode)
            lastChild.append($createTextNode(' '))
          } else {
            // Create a new paragraph to hold the mention
            const paragraph = $createParagraphNode()
            paragraph.append(mentionNode)
            paragraph.append($createTextNode(' '))
            root.append(paragraph)
          }
        }
      })

      // Focus the editor
      setTimeout(() => editor.focus(), 0)
    } else {
      console.warn('[TagStore] No editor ref available for mention insertion')
    }
  },

  removeTag: (id) => {
    const state = get()

    // Find the item before removing so we know its type for the mention match
    const item = state.taggedItems.find((t) => t.id === id)

    set((s) => ({
      taggedItems: s.taggedItems.filter((t) => t.id !== id),
    }))

    // Also remove the corresponding mention node from the editor
    const editor = state.editorRef?.current
    if (editor && item) {
      const mentionPattern = `{${item.type}:${item.id}}`
      editor.update(() => {
        const root = $getRoot()
        const allNodes = root.getAllTextNodes()
        for (const node of allNodes) {
          if (
            node.getType() === 'mention' &&
            (node as any).__mention === mentionPattern
          ) {
            node.remove()
          }
        }
      })
    }
  },

  clearTags: () => {
    set({ taggedItems: [] })
  },

  setEditorRef: (ref) => {
    set({ editorRef: ref })
  },

  hasTag: (id) => {
    return get().taggedItems.some((t) => t.id === id)
  },

  setTags: (items) => {
    set({ taggedItems: items })
  },
}))

/**
 * Hook to get tagged items as an array
 */
export function useTaggedItems(): TaggedItem[] {
  return useTagStore((state) => state.taggedItems)
}

/**
 * Hook to get tag actions
 */
export function useTagActions() {
  const addTag = useTagStore((state) => state.addTag)
  const addTagFromItem = useTagStore((state) => state.addTagFromItem)
  const addTagFromFile = useTagStore((state) => state.addTagFromFile)
  const addTagFromAgent = useTagStore((state) => state.addTagFromAgent)
  const removeTag = useTagStore((state) => state.removeTag)
  const clearTags = useTagStore((state) => state.clearTags)
  const hasTag = useTagStore((state) => state.hasTag)

  return {
    addTag,
    addTagFromItem,
    addTagFromFile,
    addTagFromAgent,
    removeTag,
    clearTags,
    hasTag,
  }
}
