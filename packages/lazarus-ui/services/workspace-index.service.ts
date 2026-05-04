/**
 * Workspace Index Service
 *
 * Builds and maintains a searchable index of workspace items for mention autocomplete
 * Supports fuzzy search across files, conversations, and other mentionable items
 */

import Fuse, { type IFuseOptions } from 'fuse.js'

import { Item } from '@/model/item'

export interface IndexedItem {
  id: string
  type: string
  name: string
  icon?: string | React.ReactElement
  updatedAt: string
  metadata?: {
    fileType?: string
    path?: string
    conversationId?: string
    preview?: string
  }
}

export interface SearchResult extends IndexedItem {
  score?: number
  matches?: Array<{
    key: string
    value: string
    indices: number[][]
  }>
}

export class WorkspaceIndexService {
  private index: Fuse<IndexedItem> | null = null
  private items: IndexedItem[] = []
  private lastUpdate: Date | null = null

  // Fuse.js configuration for fuzzy search
  private readonly fuseOptions: IFuseOptions<IndexedItem> = {
    keys: [
      { name: 'name', weight: 0.7 },
      { name: 'type', weight: 0.2 },
      { name: 'metadata.path', weight: 0.1 },
    ],
    threshold: 0.4, // Lower = more strict matching
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 1,
    findAllMatches: true,
  }

  /**
   * Build index from workspace items
   */
  buildIndex(items: Record<string, Item>): void {
    const indexableItems: IndexedItem[] = []

    Object.values(items).forEach((item) => {
      // Only index mentionable types
      if (this.isMentionable(item)) {
        indexableItems.push(this.itemToIndexed(item))
      }
    })

    this.items = indexableItems
    this.index = new Fuse(indexableItems, this.fuseOptions)
    this.lastUpdate = new Date()

    console.log(
      `[WorkspaceIndex] Built index with ${indexableItems.length} items`,
    )
  }

  /**
   * Search index with fuzzy matching
   */
  search(query: string, limit: number = 10): SearchResult[] {
    if (!this.index || !query) {
      return this.getRecent(limit)
    }

    const results = this.index.search(query, { limit })

    return results.map((result) => ({
      ...result.item,
      score: result.score,
      matches: result.matches?.map((m) => ({
        key: m.key || '',
        value: m.value || '',
        indices: (m.indices || []) as unknown as number[][],
      })),
    }))
  }

  /**
   * Get recent items (for showing on @ trigger with no query)
   */
  getRecent(limit: number = 10): IndexedItem[] {
    return [...this.items]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .slice(0, limit)
  }

  /**
   * Get item by ID
   */
  getById(id: string): IndexedItem | null {
    return this.items.find((item) => item.id === id) || null
  }

  /**
   * Get all items of a specific type
   */
  getByType(type: string): IndexedItem[] {
    return this.items.filter((item) => item.type === type)
  }

  /**
   * Check if index needs refresh (older than 1 minute)
   */
  needsRefresh(): boolean {
    if (!this.lastUpdate) return true
    const now = new Date()
    const diff = now.getTime() - this.lastUpdate.getTime()
    return diff > 60000 // 1 minute
  }

  /**
   * Get index stats
   */
  getStats(): {
    totalItems: number
    byType: Record<string, number>
    lastUpdate: Date | null
  } {
    const byType: Record<string, number> = {}

    this.items.forEach((item) => {
      byType[item.type] = (byType[item.type] || 0) + 1
    })

    return {
      totalItems: this.items.length,
      byType,
      lastUpdate: this.lastUpdate,
    }
  }

  /**
   * Clear index
   */
  clear(): void {
    this.index = null
    this.items = []
    this.lastUpdate = null
  }

  // Private helpers

  private isMentionable(item: Item): boolean {
    // Only allow certain types to be mentioned
    const mentionableTypes = [
      'file',
      'conversation',
      'app',
      'link',
      'date-range',
    ]
    return mentionableTypes.includes(item.type)
  }

  private itemToIndexed(item: Item): IndexedItem {
    const indexed: IndexedItem = {
      id: item.id,
      type: item.type,
      name: item.name ?? '',
      icon: item.icon,
      updatedAt: item.updatedAt,
      metadata: {},
    }

    // Add type-specific metadata
    if (item.type === 'file') {
      indexed.metadata = {
        fileType: (item as any).fileType,
        path: (item as any).path,
        preview: (item as any).preview,
      }
    } else if (item.type === 'conversation') {
      indexed.metadata = {
        conversationId: item.id,
        preview: (item as any).preview,
      }
    }

    return indexed
  }
}

// Singleton instance
let workspaceIndexInstance: WorkspaceIndexService | null = null

export function getWorkspaceIndex(): WorkspaceIndexService {
  if (!workspaceIndexInstance) {
    workspaceIndexInstance = new WorkspaceIndexService()
  }
  return workspaceIndexInstance
}
