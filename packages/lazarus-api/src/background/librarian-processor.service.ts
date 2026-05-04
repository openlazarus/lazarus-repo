/**
 * Librarian Processor Service — background distillation of agent conversations
 * into durable knowledge artifacts.
 *
 * Called fire-and-forget from the workspace agent executor after each
 * substantive conversation. Runs the librarian specialist via the Claude
 * Agent SDK with the memory MCP tools available, so it can `memory_save`
 * artifacts into the workspace layer.
 */

import { getAgentRuntime } from '@domains/agent/runtime'
import * as fs from 'fs/promises'
import * as path from 'path'
import { createMemoryToolsServer } from '@tools/agents/memory-tools'
import { runInExecutionContext } from '@domains/execution/service/execution-context'
import { conversationMetadata } from '@domains/conversation/service/conversation-metadata.service'
import { resolveWorkspacePath } from '@domains/cache/service/workspace-path-cache'
import { createLogger } from '@utils/logger'

const log = createLogger('librarian-processor')

const LIBRARIAN_PROMPT_PATH = path.resolve(
  __dirname,
  '../../prompts/specialists/librarian-specialist.md',
)
const LIBRARIAN_MODEL = 'claude-sonnet-4-5-20250929'
const LIBRARIAN_MAX_TURNS = 25

export interface AnalyzeConversationArgs {
  workspaceId: string
  agentId: string
  userId: string
  conversationId: string
  transcript: string
}

interface QueuedJob extends AnalyzeConversationArgs {
  queuedAt: number
}

export class LibrarianProcessorService {
  private librarianPrompt: string | null = null
  private queue: QueuedJob[] = []
  private processing = false
  private inflightConversationIds = new Set<string>()

  async initialize(): Promise<void> {
    await this.loadPrompt()
    log.info('LibrarianProcessorService initialized')
  }

  /**
   * Enqueue a conversation for distillation. Returns immediately; processing
   * happens asynchronously. Duplicate conversationIds are silently skipped.
   */
  analyzeConversation(args: AnalyzeConversationArgs): void {
    if (this.inflightConversationIds.has(args.conversationId)) {
      log.debug(
        { conversationId: args.conversationId },
        'Librarian job already queued/running, skipping duplicate',
      )
      return
    }

    this.inflightConversationIds.add(args.conversationId)
    this.queue.push({ ...args, queuedAt: Date.now() })
    log.info(
      { conversationId: args.conversationId, agentId: args.agentId, queueSize: this.queue.length },
      'Queued conversation for librarian analysis',
    )

    void this.drain()
  }

  private async drain(): Promise<void> {
    if (this.processing) return
    this.processing = true

    try {
      while (this.queue.length > 0) {
        const job = this.queue.shift()!
        try {
          await this.runJob(job)
        } catch (error) {
          log.error({ err: error, conversationId: job.conversationId }, 'Librarian job failed')
        } finally {
          this.inflightConversationIds.delete(job.conversationId)
        }
      }
    } finally {
      this.processing = false
    }
  }

  private async runJob(job: QueuedJob): Promise<void> {
    const prompt = await this.loadPrompt()
    const workspacePath = await resolveWorkspacePath(job.workspaceId)

    const task = this.buildTask(job)
    const waitedMs = Date.now() - job.queuedAt
    log.info(
      { conversationId: job.conversationId, agentId: job.agentId, waitedMs },
      'Starting librarian analysis',
    )

    const executionContext = {
      agentId: job.agentId,
      workspaceId: job.workspaceId,
      userId: job.userId,
      workspacePath,
    }

    let turns = 0
    let toolUses = 0

    await runInExecutionContext(executionContext, async () => {
      try {
        const runtime = getAgentRuntime()
        for await (const message of runtime.run({
          prompt: task,
          context: {
            workspaceId: job.workspaceId,
            agentId: job.agentId,
            runtime: 'claude-sdk',
            title: 'Librarian analysis',
            triggeredBy: 'librarian',
          },
          options: {
            model: LIBRARIAN_MODEL,
            systemPrompt: prompt,
            maxTurns: LIBRARIAN_MAX_TURNS,
            cwd: workspacePath,
            mcpServers: { 'memory-tools': createMemoryToolsServer() },
            allowedTools: [
              'mcp__memory-tools__memory_save',
              'mcp__memory-tools__memory_search',
              'mcp__memory-tools__memory_read',
              'mcp__memory-tools__memory_update',
              'mcp__memory-tools__memory_list_tags',
            ],
            permissionMode: 'bypassPermissions' as const,
          },
        })) {
          if (message.type === 'assistant') {
            turns++
            const content = message.message?.content as unknown
            if (Array.isArray(content)) {
              for (const block of content as { type?: string }[]) {
                if (block?.type === 'tool_use') toolUses++
              }
            }
          }
        }
      } catch (error) {
        log.error({ err: error, conversationId: job.conversationId }, 'Librarian SDK query failed')
        throw error
      }
    })

    await conversationMetadata.markAsAnalyzed(
      job.conversationId,
      [],
      [],
      job.userId,
      job.workspaceId,
    )

    log.info(
      {
        conversationId: job.conversationId,
        agentId: job.agentId,
        turns,
        toolUses,
        durationMs: Date.now() - job.queuedAt,
      },
      'Librarian analysis complete',
    )
  }

  private buildTask(job: QueuedJob): string {
    return [
      `Analyze the following conversation between a user and agent "${job.agentId}".`,
      `Extract durable knowledge and save it using the memory_* tools.`,
      ``,
      `Guidelines:`,
      `- Use memory_list_tags first to see existing tag vocabulary and reuse tags where possible.`,
      `- Use memory_search to check if related artifacts already exist before creating new ones.`,
      `- Prefer memory_update over creating duplicate artifacts.`,
      `- Default scope to "workspace" for shared facts (project decisions, domain knowledge, events).`,
      `- Use scope "agent" only for things specific to this agent's behavior or per-agent learnings (e.g., user preferences this agent has observed).`,
      `- Skip trivia, greetings, and ephemeral chat. Only save memories that have lasting value.`,
      `- Link related artifacts with [[wikilinks]] by title.`,
      ``,
      `--- CONVERSATION ---`,
      job.transcript,
      `--- END CONVERSATION ---`,
    ].join('\n')
  }

  private async loadPrompt(): Promise<string> {
    if (this.librarianPrompt !== null) return this.librarianPrompt
    this.librarianPrompt = await fs.readFile(LIBRARIAN_PROMPT_PATH, 'utf-8')
    return this.librarianPrompt
  }
}

export const librarianProcessor = new LibrarianProcessorService()
