/**
 * Tag model - represents a connection between items
 */
export interface Tag {
  id: string
  sourceId: string // What created the tag (e.g., messageId)
  targetId: string // What was tagged (e.g., fileId)
  createdAt?: string // Optional since SQL has DEFAULT now()
  taggedBy: string
  displayText?: string // How it appears in UI (@file.txt)
  type?: 'message' | 'file' | 'conversation' | 'app' | 'contact'
  metadata?: Record<string, any> // Matches SQL JSONB DEFAULT '{}'
}

/**
 * Create a new Tag with default values
 */
export function createTag(
  sourceId: string,
  targetId: string,
  options: {
    taggedBy: string
    displayText?: string
    type?: 'message' | 'file' | 'conversation' | 'app' | 'contact'
    metadata?: Record<string, any>
  },
): Tag {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2),
    sourceId,
    targetId,
    createdAt: new Date().toISOString(),
    taggedBy: options.taggedBy,
    displayText: options.displayText,
    type: options.type,
    metadata: options.metadata || {},
  }
}

/**
 * Helper to check if a tag connects two specific items
 */
export function isTagBetween(
  tag: Tag,
  sourceId: string,
  targetId: string,
): boolean {
  return tag.sourceId === sourceId && tag.targetId === targetId
}
