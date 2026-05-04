/**
 * Agent Chat Tools — In-process agent-to-agent communication.
 *
 * Two tools:
 * - ask_agent:     Lightweight conversational query (single API call, no tools/MCP)
 * - delegate_task: Synchronous execution of target agent in the same process
 *
 * Neither tool spawns a new process or goes through the execution queue.
 * ask_agent is a single API call (~5MB). delegate_task runs the full agent SDK
 * loop in the calling process — cascade depth (max 3) is the safeguard.
 */

import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { MAX_TURNS } from '@infrastructure/config/max-turns'
import * as fs from 'fs/promises'
import * as path from 'path'
import { getExecutionContext } from '@domains/execution/service/execution-context'
import { WorkspaceAgentService } from '@domains/agent/service/workspace-agent.service'
import { WorkspaceAgentExecutor } from '@domains/agent/service/workspace-agent-executor'
import { EXECUTION_LIMITS } from '@infrastructure/config/execution-limits'
import { eventBus } from '@realtime'
import { createLogger } from '@utils/logger'

const log = createLogger('agent-chat-tools')

// ── Shared utilities ────────────────────────────────────────────────

const anthropic = new Anthropic()
const agentService = new WorkspaceAgentService()

function getAgentContext() {
  const ctx = getExecutionContext()
  if (!ctx.agentId || !ctx.workspaceId || !ctx.userId) {
    throw new Error(
      `Agent context not available: AGENT_ID=${ctx.agentId}, WORKSPACE_ID=${ctx.workspaceId}`,
    )
  }
  return ctx
}

async function readAgentMemory(workspacePath: string, agentId: string): Promise<string> {
  const memoryDir = path.join(workspacePath, '.agents', agentId, 'memory')
  try {
    const files = await fs.readdir(memoryDir)
    const contents: string[] = []
    for (const file of files.slice(0, 5)) {
      try {
        const content = await fs.readFile(path.join(memoryDir, file), 'utf-8')
        contents.push(`--- ${file} ---\n${content.substring(0, 2000)}`)
      } catch {
        /* skip unreadable files */
      }
    }
    return contents.join('\n\n')
  } catch {
    return ''
  }
}

function formatResponse(data: Record<string, unknown>): {
  content: { type: 'text'; text: string }[]
} {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

// ── Tool definitions ────────────────────────────────────────────────

const askAgent = tool(
  'ask_agent',
  "Ask another agent a question. This makes a lightweight API call using the target agent's persona — NO new process is spawned, NO tools are available to the target agent. Use this for questions, status updates, and coordination. For tasks that require tools (database, files, browser), use delegate_task instead.",
  {
    agentId: z.string().describe('ID of the agent to ask (e.g., "logistics", "project-manager")'),
    message: z.string().describe('The question or message to send to the agent'),
    context: z
      .string()
      .optional()
      .describe(
        'Optional additional context to include (e.g., relevant data, previous conversation summary)',
      ),
  },
  async (args) => {
    const callerCtx = getAgentContext()

    if (args.agentId === callerCtx.agentId) {
      return formatResponse({
        success: false,
        error: 'Cannot ask yourself. Use your own knowledge instead.',
      })
    }

    const targetAgent = await agentService.getAgent(
      callerCtx.workspaceId,
      callerCtx.userId,
      args.agentId,
    )
    if (!targetAgent) {
      return formatResponse({
        success: false,
        error: `Agent "${args.agentId}" not found in this workspace.`,
      })
    }

    if (!targetAgent.enabled) {
      return formatResponse({ success: false, error: `Agent "${args.agentId}" is disabled.` })
    }

    const memory = await readAgentMemory(callerCtx.workspacePath, args.agentId)

    const systemPrompt = [
      targetAgent.systemPrompt,
      memory ? `\n\nYour memory/context:\n${memory}` : '',
      '\n\nYou are responding to a question from another agent in your workspace. Be concise and direct.',
    ].join('')

    const userMessage = args.context
      ? `${args.message}\n\nAdditional context:\n${args.context}`
      : args.message

    // Suspend caller's inactivity timer while waiting for the API call
    callerCtx.suspendInactivityTimer?.()
    try {
      log.info(
        {
          fromAgentId: callerCtx.agentId,
          toAgentId: args.agentId,
          messagePreview: args.message.substring(0, 80),
        },
        'ask_agent request',
      )

      const response = await anthropic.messages.create({
        model: EXECUTION_LIMITS.askAgentModel,
        max_tokens: EXECUTION_LIMITS.askAgentMaxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      })

      const responseText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n')

      log.info(
        { toAgentId: args.agentId, outputTokens: response.usage.output_tokens },
        'ask_agent response received',
      )

      return formatResponse({
        success: true,
        agentId: args.agentId,
        agentName: targetAgent.name,
        response: responseText,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      })
    } catch (error) {
      log.error({ err: error, toAgentId: args.agentId }, 'ask_agent failed')
      return formatResponse({
        success: false,
        error: `Failed to get response from ${args.agentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    } finally {
      callerCtx.resumeInactivityTimer?.()
    }
  },
)

const delegateTask = tool(
  'delegate_task',
  'Delegate a task to another agent that requires tools (database queries, file operations, browser, etc.). The target agent runs synchronously in this process — you will block until it finishes and receive the result directly. Use ask_agent instead if you just need a quick conversational answer without tools.',
  {
    agentId: z
      .string()
      .describe('ID of the agent to delegate to (e.g., "logistics", "sqlite-specialist")'),
    task: z.string().describe('Detailed description of the task to perform'),
  },
  async (args) => {
    const callerCtx = getAgentContext()

    if (args.agentId === callerCtx.agentId) {
      return formatResponse({ success: false, error: 'Cannot delegate a task to yourself.' })
    }

    // Cascade depth check
    const currentDepth = callerCtx.cascadeDepth ?? 0
    if (currentDepth >= EXECUTION_LIMITS.maxCascadeDepth) {
      return formatResponse({
        success: false,
        error: `Max cascade depth (${EXECUTION_LIMITS.maxCascadeDepth}) reached. Cannot delegate further. Use ask_agent for a lightweight query instead.`,
      })
    }

    const targetAgent = await agentService.getAgent(
      callerCtx.workspaceId,
      callerCtx.userId,
      args.agentId,
    )
    if (!targetAgent) {
      return formatResponse({
        success: false,
        error: `Agent "${args.agentId}" not found in this workspace.`,
      })
    }

    if (!targetAgent.enabled) {
      return formatResponse({ success: false, error: `Agent "${args.agentId}" is disabled.` })
    }

    // Track whether the caller's timer is currently suspended due to child approval
    let callerTimerSuspended = false

    // Listen for the child agent's approval state changes to propagate up
    const onAgentStateChanged = (payload: any) => {
      if (payload.agentId !== args.agentId || payload.workspaceId !== callerCtx.workspaceId) return

      if (payload.newStatus === 'awaiting_approval' && !callerTimerSuspended) {
        callerTimerSuspended = true
        callerCtx.suspendInactivityTimer?.()
        callerCtx.setExecutionStatus?.('awaiting_approval')
        log.info(
          { childAgentId: args.agentId, callerAgentId: callerCtx.agentId },
          'delegate_task: child awaiting approval, suspended caller timer',
        )
      } else if (
        payload.previousStatus === 'awaiting_approval' &&
        payload.newStatus === 'executing' &&
        callerTimerSuspended
      ) {
        callerTimerSuspended = false
        callerCtx.resumeInactivityTimer?.()
        callerCtx.setExecutionStatus?.('running')
        log.info(
          { childAgentId: args.agentId, callerAgentId: callerCtx.agentId },
          'delegate_task: child approval resolved, resumed caller timer',
        )
      }
    }

    eventBus.on('agent:state-changed', onAgentStateChanged)

    try {
      log.info(
        {
          fromAgentId: callerCtx.agentId,
          toAgentId: args.agentId,
          depth: currentDepth + 1,
          maxDepth: EXECUTION_LIMITS.maxCascadeDepth,
          taskPreview: args.task.substring(0, 80),
        },
        'delegate_task started',
      )

      // Suspend caller's timers during delegation (child has its own 20/15-min budgets).
      // Both the inactivity AND total-execution timers are paused so a sequence of
      // long delegations doesn't bleed wall-clock time from the parent's budget.
      callerCtx.suspendInactivityTimer?.()
      callerCtx.suspendExecutionTimer?.()

      const executor = new WorkspaceAgentExecutor()

      const result = await executor.executeAgent({
        agentId: args.agentId,
        workspaceId: callerCtx.workspaceId,
        userId: callerCtx.userId,
        task: args.task,
        maxTurns: MAX_TURNS.agentChat,
        cascadeDepth: currentDepth + 1,
      })

      // Extract text from result
      // SDK messages have .type ('assistant', 'tool_progress', 'result', 'system')
      // Assistant messages nest the API response at .message (with .role and .content)
      const resultMessages = result.messages || []
      const lastAssistantMsg = [...resultMessages]
        .reverse()
        .find((m: any) => m.type === 'assistant')
      const content = lastAssistantMsg?.message?.content
      let responseText = ''
      if (content) {
        if (typeof content === 'string') {
          responseText = content
        } else if (Array.isArray(content)) {
          responseText = content
            .filter((b: any) => b.type === 'text')
            .map((b: any) => b.text)
            .join('\n')
        }
      }

      log.info(
        {
          toAgentId: args.agentId,
          depth: currentDepth + 1,
          responseTextLength: responseText.length,
          messageCount: resultMessages.length,
        },
        'delegate_task completed',
      )

      return formatResponse({
        success: true,
        agentId: args.agentId,
        agentName: targetAgent.name,
        result: responseText || 'Task completed (no text output)',
      })
    } catch (error) {
      log.error({ err: error, toAgentId: args.agentId }, 'delegate_task failed')
      return formatResponse({
        success: false,
        error: `Failed to execute ${args.agentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    } finally {
      // Always clean up the listener
      eventBus.removeListener('agent:state-changed', onAgentStateChanged)

      // Resume caller timer if still suspended (child died/aborted mid-approval)
      if (callerTimerSuspended) {
        callerCtx.setExecutionStatus?.('running')
      }
      callerCtx.resumeInactivityTimer?.()
      callerCtx.resumeExecutionTimer?.()
    }
  },
)

// ── MCP Server ──────────────────────────────────────────────────────

export const agentChatTools = [askAgent, delegateTask]

export const agentChatToolsServer = createSdkMcpServer({
  name: 'agent-chat-tools',
  version: '1.0.0',
  tools: agentChatTools,
})

export function createAgentChatToolsServer() {
  return createSdkMcpServer({ name: 'agent-chat-tools', version: '1.0.0', tools: agentChatTools })
}
