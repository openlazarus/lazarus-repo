/**
 * Context Builder Service
 *
 * Builds context for Claude API from mentioned items
 * Loads file contents and conversation history
 */

import fs from 'fs/promises'
import path from 'path'

import type {
  ContextBuildResult,
  ContextItem,
  MentionReference,
} from '@domains/conversation/types/conversation.types'
import { createLogger } from '@utils/logger'
const log = createLogger('context-builder')

type MentionLoadOptions = {
  userId?: string
  workspaceId?: string
  storagePath?: string
}

type MentionHandlerResult =
  | { kind: 'ok'; item: ContextItem }
  | { kind: 'missing'; notFoundMessage: string }

const MENTION_TYPE_HANDLERS: Record<
  string,
  (mention: MentionReference, options: MentionLoadOptions) => Promise<MentionHandlerResult>
> = {
  file: async (mention, options) => {
    const fileContext = await loadFileContext(mention.id, options)
    if (fileContext) {
      return { kind: 'ok', item: fileContext }
    }
    return { kind: 'missing', notFoundMessage: 'File not found' }
  },
  conversation: async (mention, options) => {
    const conversationContext = await loadConversationContext(mention.id, options)
    if (conversationContext) {
      return { kind: 'ok', item: conversationContext }
    }
    return { kind: 'missing', notFoundMessage: 'Conversation not found' }
  },
}

/**
 * Build context from mention references
 */
export async function buildContextFromMentions(
  mentions: MentionReference[],
  options: {
    userId?: string
    workspaceId?: string
    storagePath?: string
  } = {},
): Promise<ContextBuildResult> {
  const items: ContextItem[] = []
  const errors: Array<{ type: string; id: string; error: string }> = []

  const { userId, workspaceId, storagePath = '/mnt/sdc/storage' } = options

  const loadOptions: MentionLoadOptions = { userId, workspaceId, storagePath }

  for (const mention of mentions) {
    try {
      const handler = MENTION_TYPE_HANDLERS[mention.type]
      if (handler) {
        const result = await handler(mention, loadOptions)
        if (result.kind === 'ok') {
          items.push(result.item)
        } else {
          errors.push({
            type: mention.type,
            id: mention.id,
            error: result.notFoundMessage,
          })
        }
      } else {
        log.warn(`Unsupported mention type: ${mention.type}`)
        errors.push({
          type: mention.type,
          id: mention.id,
          error: `Unsupported type: ${mention.type}`,
        })
      }
    } catch (error) {
      log.error({ err: error, type: mention.type, id: mention.id }, 'Error loading mention')
      errors.push({
        type: mention.type,
        id: mention.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return { items, errors }
}

/**
 * Load file content as context
 */
async function loadFileContext(
  fileId: string,
  options: {
    userId?: string
    workspaceId?: string
    storagePath?: string
  },
): Promise<ContextItem | null> {
  const { workspaceId, storagePath = '/mnt/sdc/storage' } = options

  try {
    // Build potential file paths
    const potentialPaths = []

    if (workspaceId) {
      potentialPaths.push(path.join(storagePath, 'workspaces', workspaceId, 'files', fileId))
    }

    // Try default workspace
    potentialPaths.push(path.join(storagePath, 'workspaces', 'default', 'files', fileId))

    // Try to find the file
    let filePath: string | null = null
    let fileStats: any = null

    for (const potentialPath of potentialPaths) {
      try {
        fileStats = await fs.stat(potentialPath)
        if (fileStats.isFile()) {
          filePath = potentialPath
          break
        }
      } catch (error) {
        // File doesn't exist at this path, try next
        continue
      }
    }

    if (!filePath) {
      log.warn(`File not found: ${fileId}`)
      return null
    }

    // Read file content
    const content = await fs.readFile(filePath, 'utf-8')

    return {
      type: 'file',
      source: path.basename(filePath),
      content,
      metadata: {
        fileId,
        filePath,
        size: fileStats.size,
      },
    }
  } catch (error) {
    log.error({ err: error }, `Error loading file ${fileId}:`)
    return null
  }
}

/**
 * Load conversation history as context
 */
async function loadConversationContext(
  conversationId: string,
  options: {
    userId?: string
    workspaceId?: string
    storagePath?: string
  },
): Promise<ContextItem | null> {
  const { workspaceId, storagePath = '/mnt/sdc/storage' } = options

  try {
    // Build potential conversation metadata paths
    const potentialPaths = []

    if (workspaceId) {
      potentialPaths.push(
        path.join(
          storagePath,
          'workspaces',
          workspaceId,
          '.meta',
          'conversations',
          `${conversationId}.json`,
        ),
      )
    }

    // Try to find the conversation metadata
    let conversationPath: string | null = null
    let conversationData: any = null

    for (const potentialPath of potentialPaths) {
      try {
        const content = await fs.readFile(potentialPath, 'utf-8')
        conversationData = JSON.parse(content)
        conversationPath = potentialPath
        break
      } catch (error) {
        // Conversation doesn't exist at this path, try next
        continue
      }
    }

    if (!conversationPath || !conversationData) {
      log.warn(`Conversation not found: ${conversationId}`)
      return null
    }

    // Load session transcript if available
    const sessionId = conversationData.sessionId
    if (sessionId && workspaceId) {
      const transcriptPath = path.join(
        storagePath,
        'workspaces',
        workspaceId,
        'sessions',
        `${sessionId}.transcript`,
      )

      try {
        const transcriptContent = await fs.readFile(transcriptPath, 'utf-8')

        // Parse transcript (newline-delimited JSON)
        const messages = transcriptContent
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => {
            try {
              return JSON.parse(line)
            } catch {
              return null
            }
          })
          .filter((msg) => msg !== null)

        // Format as readable conversation history
        const conversationText = messages
          .map((msg: any) => {
            if (msg.role === 'user') {
              return `User: ${msg.content}`
            } else if (msg.role === 'assistant') {
              return `Assistant: ${msg.content}`
            }
            return null
          })
          .filter((line: string | null) => line !== null)
          .join('\n\n')

        return {
          type: 'conversation',
          source: conversationData.title || conversationId,
          content: conversationText,
          metadata: {
            conversationId,
            sessionId,
            messageCount: messages.length,
            title: conversationData.title,
          },
        }
      } catch (error) {
        log.error({ err: error, conversationId }, 'Error loading transcript')
        // Fall back to just conversation metadata
        return {
          type: 'conversation',
          source: conversationData.title || conversationId,
          content: `Conversation: ${conversationData.title || conversationId}\nMessages: ${conversationData.messageCount || 0}`,
          metadata: {
            conversationId,
            title: conversationData.title,
          },
        }
      }
    }

    return null
  } catch (error) {
    log.error({ err: error }, `Error loading conversation ${conversationId}:`)
    return null
  }
}

/**
 * Format context items for Claude API
 */
export function formatContextForClaude(contextItems: ContextItem[]): string {
  if (contextItems.length === 0) {
    return ''
  }

  const sections = contextItems.map((item) => {
    const header = `--- ${item.type.toUpperCase()}: ${item.source} ---`
    const footer = `--- END ${item.type.toUpperCase()} ---`
    return `${header}\n${item.content}\n${footer}`
  })

  return sections.join('\n\n')
}
