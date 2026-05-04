import { Request, Response } from 'express'
import { conversationMetadata } from '@domains/conversation/service/conversation-metadata.service'
import * as fs from 'fs/promises'
import Anthropic from '@anthropic-ai/sdk'
import { resolveClaudeSessionJsonlPath } from '@domains/conversation/service/workspace-transcript-path'
import { BadRequestError, NotFoundError } from '@errors/api-errors'
import { createLogger } from '@utils/logger'
const log = createLogger('conversations')

class ConversationsController {
  async list(req: Request, res: Response) {
    const { workspaceId } = req.query
    const userId = req.user!.id

    if (!workspaceId) {
      throw new BadRequestError('workspaceId is required')
    }

    const conversations = await conversationMetadata.listConversations(
      workspaceId as string,
      userId,
    )

    res.json({ conversations, count: conversations.length })
  }

  async getById(req: Request, res: Response) {
    const id = req.params.id!
    const userId = req.user!.id
    const workspaceId = req.workspaceId as string

    const conversation = await conversationMetadata.getConversation(id, userId, workspaceId)

    if (!conversation) {
      throw new NotFoundError('Conversation', id)
    }

    res.json({ conversation })
  }

  async update(req: Request, res: Response) {
    const id = req.params.id!
    const updates = req.body
    const userId = req.user!.id
    const workspaceId = req.workspaceId as string

    await conversationMetadata.updateConversation(id, updates, userId, workspaceId)

    const conversation = await conversationMetadata.getConversation(id, userId, workspaceId)

    res.json({ conversation })
  }

  async delete(req: Request, res: Response) {
    const id = req.params.id!
    const userId = req.user!.id
    const workspaceId = req.workspaceId as string

    await conversationMetadata.deleteConversation(id, userId, workspaceId)

    res.json({ success: true })
  }

  async getBySession(req: Request, res: Response) {
    const sessionId = req.params.sessionId!
    const userId = req.user!.id
    const workspaceId = req.workspaceId as string

    const conversation = await conversationMetadata.findBySessionId(sessionId, userId, workspaceId)

    if (!conversation) {
      throw new NotFoundError('Conversation not found for session')
    }

    res.json({ conversation })
  }

  async getMessages(req: Request, res: Response) {
    const id = req.params.id!
    const userId = req.user!.id
    const workspaceId = req.workspaceId as string

    const conversation = await conversationMetadata.getConversation(id, userId, workspaceId)

    if (!conversation) {
      throw new NotFoundError('Conversation', id)
    }

    const effectiveWorkspaceId = conversation.workspaceId || workspaceId

    const transcriptPath = await resolveClaudeSessionJsonlPath(
      effectiveWorkspaceId,
      conversation.sessionId,
    )

    log.info({ data: transcriptPath }, 'Looking for transcript at')

    try {
      const content = await fs.readFile(transcriptPath, 'utf-8')
      const lines = content
        .trim()
        .split('\n')
        .filter((line) => line.trim())

      let firstUserMessageSeen = false

      const messages = lines
        .map((line) => {
          try {
            const entry = JSON.parse(line)

            if (entry.type !== 'user' && entry.type !== 'assistant') {
              return null
            }

            let content = ''
            let toolCalls = []
            const variant = null

            if (entry.type === 'user') {
              if (entry.toolUseResult) {
                return {
                  id: entry.uuid,
                  role: 'assistant',
                  timestamp: entry.timestamp,
                  variant: {
                    type: 'background-action',
                    title: entry.toolUseResult.type === 'create' ? 'Write' : 'Tool',
                    status: 'success',
                    description: entry.toolUseResult.filePath || 'Tool executed',
                    expandable: true,
                    details:
                      typeof entry.message.content === 'string'
                        ? entry.message.content
                        : JSON.stringify(entry.message.content, null, 2),
                  },
                  metadata: {
                    toolResult: entry.toolUseResult,
                  },
                }
              } else {
                const rawContent =
                  typeof entry.message.content === 'string' ? entry.message.content : ''

                if (!firstUserMessageSeen && entry.parentUuid === null) {
                  firstUserMessageSeen = true
                  const marker = '\n\nUser Message: '
                  const markerIndex = rawContent.indexOf(marker)
                  if (markerIndex !== -1) {
                    content = rawContent.substring(markerIndex + marker.length).trim()
                  } else {
                    content = rawContent
                  }
                } else {
                  content = rawContent
                }
              }
            } else if (entry.type === 'assistant') {
              const textContent = entry.message.content?.find((c: any) => c.type === 'text')
              content = textContent?.text || ''

              const toolUses =
                entry.message.content?.filter((c: any) => c.type === 'tool_use') || []
              toolCalls = toolUses.map((tool: any) => ({
                id: tool.id,
                name: tool.name,
                arguments: tool.input,
                status: 'completed',
                timestamp: entry.timestamp,
              }))
            }

            return {
              id: entry.uuid,
              role: entry.type === 'user' ? 'user' : 'assistant',
              content,
              timestamp: entry.timestamp,
              ...(toolCalls.length > 0 ? { toolCalls } : {}),
              ...(variant != null ? { variant } : {}),
            }
          } catch (e) {
            log.error({ err: e }, 'Failed to parse line')
            return null
          }
        })
        .filter(Boolean)

      res.json({ messages })
    } catch (fileError) {
      log.error({ err: transcriptPath }, 'Failed to read transcript at')
      res.json({ messages: [] })
    }
  }

  async generateTitle(req: Request, res: Response) {
    const id = req.params.id!
    const userId = req.user!.id
    const workspaceId = req.workspaceId as string

    log.info({ id, userId, workspaceId }, 'generateTitle: looking up conversation')
    const conversation = await conversationMetadata.getConversation(id, userId, workspaceId)
    log.info({ id, found: !!conversation }, 'generateTitle: lookup result')

    if (!conversation) {
      throw new NotFoundError('Conversation', id)
    }

    const effectiveWorkspaceId = conversation.workspaceId || workspaceId

    const transcriptPath = await resolveClaudeSessionJsonlPath(
      effectiveWorkspaceId,
      conversation.sessionId,
    )

    log.info({ data: transcriptPath }, 'Looking for transcript at')

    try {
      const transcriptContent = await fs.readFile(transcriptPath, 'utf-8')
      const lines = transcriptContent.trim().split('\n').slice(0, 10)

      const userMessages = lines
        .map((line) => {
          try {
            const entry = JSON.parse(line)
            if (entry.type === 'user' && entry.message?.content) {
              const content = entry.message.content
              if (typeof content === 'string') {
                const marker = '\n\nUser Message: '
                const markerIndex = content.indexOf(marker)
                if (markerIndex !== -1) {
                  return content.substring(markerIndex + marker.length).trim()
                }
                return content
              } else if (Array.isArray(content)) {
                return content
                  .filter((block: any) => block.type === 'text')
                  .map((block: any) => block.text)
                  .join(' ')
              }
            }
            return ''
          } catch {
            return ''
          }
        })
        .filter(Boolean)
        .join(' ')
        .substring(0, 500)

      log.info({ data: userMessages.substring(0, 100) }, 'Extracted user messages for title')

      if (!userMessages) {
        throw new BadRequestError('No user messages found in conversation')
      }

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      })

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 50,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: `Generate a concise, descriptive title (3-6 words max) for this conversation. Only respond with the title, nothing else:\n\n"${userMessages}"`,
          },
        ],
      })

      const content = response.content[0]
      if (!content || content.type !== 'text') {
        throw new Error('Unexpected response type from Claude')
      }

      let generatedTitle = content.text.trim()

      generatedTitle = generatedTitle.replace(/^["']|["']$/g, '')

      await conversationMetadata.updateConversation(
        id,
        { title: generatedTitle },
        userId,
        effectiveWorkspaceId,
      )

      const updatedConversation = await conversationMetadata.getConversation(
        id,
        userId,
        effectiveWorkspaceId,
      )

      res.json({ conversation: updatedConversation, title: generatedTitle })
    } catch (fileError) {
      if (fileError instanceof BadRequestError) {
        throw fileError
      }
      // Transcript missing (likely SDK rotated session_id on resume).
      // Return current title instead of 404 so the UI doesn't break.
      log.warn(
        { transcriptPath, conversationId: id },
        'Transcript missing — returning current title without regeneration',
      )
      res.json({
        conversation,
        title: conversation.title || 'Conversation',
        regenerated: false,
      })
    }
  }
}

export const conversationsController = new ConversationsController()
