import { getAgentRuntime } from '@domains/agent/runtime'
import {
  recordApprovalRequestedOnRun,
  recordApprovalResolvedOnRun,
} from '@observability/run-span-registry'
import { WorkspaceAgentService } from '@domains/agent/service/workspace-agent.service'
import type { WorkspaceAgentConfig } from '@domains/agent/types/agent.types'
import { WorkspaceManager } from '@domains/workspace/service/workspace-manager'
import { MCPWorkspaceManager } from '@domains/workspace/service/mcp-workspace-manager'
import { browserSessionManager } from '@tools/agents'
import { consumeTaskResult } from '@tools/agents/task-result-tools'
import { createToolServers } from '@tools/mcp-tool-server-factory'
import { wrapWithLazarusIdentity } from '@infrastructure/config/system-prompts'
import { MAX_TURNS } from '@infrastructure/config/max-turns'
import { realtime, executionCache } from '@realtime'
import { sdkMessagesToConversation } from '@domains/knowledge/service/sdk-messages-to-conversation'
import {
  getDisallowedTools,
  getAskFirstTools,
  getToolPermissionLevel,
} from '@guardrails/guardrail-tool-mapping'
import {
  assessRiskLevel,
  generateHumanReadableDescription,
} from '@domains/permission/service/risk-assessment'
import { buildChannelPermissionContext } from '@domains/permission/service/channel-permission-bridge'
import type {
  ChannelContext,
  ChannelPermissionProvider,
} from '../../permission/types/permission.types'
import { BackgroundPermissionManager } from '@domains/permission/service/background-permission-manager'
import { approvalService } from '@domains/permission/service/approval.service'
import { WorkspaceSandbox } from '@domains/permission/service/sandbox'
import { createSandboxHook } from '@domains/permission/service/sandbox-hook'
import { createTruncateToolResultsHook } from '@domains/permission/service/truncate-tool-results-hook'
import * as crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import { runInExecutionContext } from '@domains/execution/service/execution-context'
import { executionAbortRegistry } from './execution-abort-registry'
import type { IWorkspaceAgentExecutor } from './workspace-agent-executor.interface'
import { withExecutionTag } from '@infrastructure/config/mcp-env'
import { filterServerSecrets } from '@infrastructure/config/sdk-subprocess-env'
import { buildMemoryBlock } from '@domains/knowledge/service/memory-prompt-builder'
import {
  formatTranscript,
  conversationHasSubstance,
} from '@domains/knowledge/service/transcript-formatter'
import { librarianProcessor } from '@background/librarian-processor.service'
import { createLogger } from '@utils/logger'
const log = createLogger('workspace-agent-executor')

interface AgentInfo {
  id: string
  name: string
  description: string
  email: string
}

/**
 * Extract text from a tool_result content block.
 * Content can be a plain string or an array of { type: 'text', text: '...' } blocks.
 */
function extractTextFromToolResult(content: unknown): string | null {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return (
      content
        .filter((c: any) => c.type === 'text' && typeof c.text === 'string')
        .map((c: any) => c.text)
        .join('') || null
    )
  }
  return null
}

/**
 * Scan tool_result blocks for errors — both SDK-level (is_error) and
 * application-level (MCP tools returning { success: false, error: '...' }).
 */
function extractToolErrors(contentBlocks: unknown): string[] {
  if (!Array.isArray(contentBlocks)) return []

  const errors: string[] = []
  for (const block of contentBlocks) {
    if ((block as any).type !== 'tool_result') continue

    if ((block as any).is_error) {
      const text =
        extractTextFromToolResult((block as any).content) ?? JSON.stringify((block as any).content)
      errors.push(`Tool error: ${text}`)
      continue
    }

    const text = extractTextFromToolResult((block as any).content)
    if (!text) continue

    try {
      const parsed = JSON.parse(text)
      if (parsed?.success === false && parsed?.error) {
        errors.push(parsed.error)
      }
    } catch {
      /* not JSON */
    }
  }
  return errors
}

/**
 * Executes workspace-based agents (stored as files)
 */
export class WorkspaceAgentExecutor implements IWorkspaceAgentExecutor {
  private agentService: WorkspaceAgentService
  private workspaceManager: WorkspaceManager
  private mcpWorkspaceManager: MCPWorkspaceManager

  constructor() {
    this.agentService = new WorkspaceAgentService()
    this.workspaceManager = new WorkspaceManager()
    this.mcpWorkspaceManager = new MCPWorkspaceManager()
  }

  /**
   * Get custom tool servers for an agent.
   * Creates fresh MCP server instances per execution to avoid the
   * shared-transport concurrency bug (McpServer.connect overwrites this._transport).
   */
  private getCustomToolsForAgent(agent: WorkspaceAgentConfig): Record<string, any> {
    const includeV0 = agent.id === 'lazarus'
    const customServers = createToolServers({ includeV0 })

    log.info(`Loaded custom tools: ${Object.keys(customServers).join(', ')}`)
    return customServers
  }

  /**
   * Interpolate environment variables in MCP config
   * Replaces ${VAR_NAME} with actual environment variable values
   */
  private interpolateEnvVars(obj: any): any {
    if (typeof obj === 'string') {
      // Replace ${VAR_NAME} with process.env.VAR_NAME
      return obj.replace(/\$\{([^}]+)\}/g, (_, varName) => {
        const value = process.env[varName]
        if (!value) {
          log.warn(`Warning: Environment variable ${varName} is not set`)
        }
        return value || ''
      })
    } else if (Array.isArray(obj)) {
      return obj.map((item) => this.interpolateEnvVars(item))
    } else if (obj && typeof obj === 'object') {
      const result: any = {}
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateEnvVars(value)
      }
      return result
    }
    return obj
  }

  /**
   * Execute an agent task using workspace file-based agent config
   */
  async executeAgent(request: {
    agentId: string
    workspaceId: string
    userId: string
    task: string
    maxTurns?: number
    onMessage?: (message: any) => void
    executionId?: string // Optional - if provided, execution already registered (e.g., by TriggerManager)
    // Platform integration fields for better activity logging
    platformSource?: 'discord' | 'slack' | 'email' | 'chat' | 'whatsapp'
    conversationTitle?: string // Pre-generated or will be generated
    /** Raw inbound user message that triggered this run (used as the activity title). */
    userMessage?: string
    platformMetadata?: {
      channelId?: string
      channelName?: string
      threadId?: string
      guildId?: string
      guildName?: string
      userName?: string
      userId?: string
      // WhatsApp-specific (for permission channel)
      phoneNumberId?: string
      senderPhone?: string
    }
    existingActivityLogId?: string // Optional - if provided, reuses existing activity log instead of creating a new one
    cascadeDepth?: number // Tracks delegation depth for delegate_task (max 3)
  }): Promise<{ result: any; messages: any[] }> {
    // Get agent configuration from workspace file
    const agent = await this.agentService.getAgent(
      request.workspaceId,
      request.userId,
      request.agentId,
    )

    if (!agent) {
      throw new Error(`Agent ${request.agentId} not found in workspace ${request.workspaceId}`)
    }

    // Get workspace
    const workspace = await this.workspaceManager.getWorkspace(request.workspaceId, request.userId)

    if (!workspace) {
      throw new Error(`Workspace ${request.workspaceId} not found`)
    }

    // Register execution in cache if not already registered (manual execution)
    const executionId = request.executionId || uuidv4()
    // Determine execution type: platform integrations (discord, slack, email, whatsapp) are triggers
    const triggerPlatforms = ['discord', 'slack', 'email', 'whatsapp']
    const isTriggerExecution =
      !!request.executionId ||
      (!!request.platformSource && triggerPlatforms.includes(request.platformSource))
    const isManualExecution = !isTriggerExecution

    // Activity persistence is owned by the OTel span processor. The logId
    // produced by the agent.run span (trace_id) is discovered after the run starts;
    // early references below only use `logId` as an opaque correlation hint.
    const logId: string | undefined = request.existingActivityLogId

    // Create execution tracker (will be used later for updates)
    let executionTracker

    if (isManualExecution) {
      executionTracker = realtime.trackExecution({
        id: executionId,
        type: 'manual',
        agentId: request.agentId,
        userId: request.userId,
        workspaceId: request.workspaceId,
        status: 'running',
        metadata: {
          title: agent.name,
          description: request.task.substring(0, 100),
          logId, // Link to activity log
        },
      })
    } else {
      // For trigger executions, the tracker was already created by trigger-manager.
      // Just update with the logId — do NOT re-register via trackExecution(),
      // which would overwrite the title/description metadata and broadcast a duplicate agent:started.
      const existing = executionCache.get(executionId)
      if (existing) {
        executionCache.update(executionId, {
          status: 'running',
          metadata: { logId },
        })
        // Get a tracker handle for the existing execution
        executionTracker = executionCache.getTracker(executionId)
      } else {
        // Fallback: register if somehow the trigger-manager entry is missing
        executionTracker = realtime.trackExecution({
          id: executionId,
          type: 'trigger',
          agentId: request.agentId,
          userId: request.userId,
          workspaceId: request.workspaceId,
          status: 'running',
          metadata: { title: agent.name, description: request.task.substring(0, 100), logId },
        })
      }
    }

    // The user's prompt is captured as a span event by RuntimeTracer; no need to record it here.

    // Build system prompt with workspace context
    const systemPrompt = await this.buildSystemPrompt(agent, workspace, request.task)

    // Get MCP configuration
    const mcpConfig = await this.getMCPConfig(agent, workspace)

    // Interpolate environment variables in MCP config
    const interpolatedMcpConfig = this.interpolateEnvVars(mcpConfig)

    // Get custom tools for system agents
    const customTools = this.getCustomToolsForAgent(agent)

    // Merge custom tools with workspace MCPs
    const allMcpServers = {
      ...customTools, // Custom in-process tools
      ...interpolatedMcpConfig.mcpServers, // External MCP servers
    }

    // Compute guardrail restrictions
    const guardrails = agent.guardrails || []
    const disallowedTools = getDisallowedTools(guardrails)
    const askFirstTools = getAskFirstTools(guardrails)

    if (disallowedTools.length > 0) {
      log.info(
        `Guardrails: ${disallowedTools.length} tools disallowed: ${disallowedTools.join(', ')}`,
      )
    }
    if (askFirstTools.size > 0) {
      log.info(
        `Guardrails: ${askFirstTools.size} tools require approval (will create persistent approvals): ${[...askFirstTools].join(', ')}`,
      )
    }

    // Build channel permission context for ask_first tools in background execution.
    // Priority 1: Agent's configured permissionChannel (works for scheduled triggers too)
    // Priority 2: Originating channel (WhatsApp/Discord/etc. that triggered the agent)
    let channelProvider: ChannelPermissionProvider | null = null
    let channelCtx: ChannelContext | null = null

    const permBundle = buildChannelPermissionContext(
      agent.permissionChannel,
      request.platformSource,
      request.platformMetadata,
    )
    if (permBundle) {
      channelProvider = permBundle.provider
      channelCtx = permBundle.context
      log.info(
        `Channel permission available via ${channelCtx.platform} — ask_first tools will request approval`,
      )
    }

    log.info(`Executing agent ${agent.id} in workspace ${workspace.id}`)
    log.info(`System prompt length: ${systemPrompt.length}`)
    log.info(`MCP servers: ${Object.keys(allMcpServers || {}).join(', ')}`)

    // Get agent's personal directory path - all agents stored in .agents/ directory
    const actualWorkspacePath = workspace.path
    const agentPath = `${workspace.path}/.agents/${agent.id}`

    // Create workspace sandbox to restrict file access
    const sandbox = new WorkspaceSandbox(actualWorkspacePath, workspace.additionalPaths)

    log.info(
      `Executing with agent context: AGENT_ID=${request.agentId}, WORKSPACE_ID=${request.workspaceId}, USER_ID=${request.userId}`,
    )
    log.info(`Workspace path: ${actualWorkspacePath}`)
    log.info(`Agent path: ${agentPath}`)
    log.info(`Sandbox enabled with ${sandbox ? 'workspace path restrictions' : 'no restrictions'}`)

    // Execute agent using Claude Code SDK
    const messages: any[] = []
    let result: any = null
    let messageCount = 0
    let toolCallCount = 0
    let lastTurnToolErrors: string[] = []

    // Log the model being used for debugging
    log.info(`Using model: ${agent.modelConfig.model}`)
    log.info({ data: JSON.stringify(agent.modelConfig) }, `Agent modelConfig:`)

    // Execution timeout: 20 minutes max per execution
    const EXECUTION_TIMEOUT_MS = 20 * 60 * 1000
    // Inactivity timeout: 15 minutes with no new SDK messages → abort
    const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000

    const abortController = new AbortController()
    executionAbortRegistry.register(executionId, abortController)

    let abortReason: string | undefined
    let lastPendingTool: { name: string; startedAt: number } | undefined
    let pendingToolWarningInterval: NodeJS.Timeout | undefined

    const getPendingToolInfo = () => {
      if (!lastPendingTool) return ''
      const elapsed = Math.round((Date.now() - lastPendingTool.startedAt) / 1000)
      return ` (tool "${lastPendingTool.name}" called ${elapsed}s ago, no result returned)`
    }

    const abortWithReason = (reason: string) => {
      abortReason = reason
      log.error(`${reason} — aborting agent ${request.agentId}`)
      abortController.abort(new Error(reason))
    }

    // Total execution timer is suspendable: while a child delegation runs, the
    // parent's wall-clock budget pauses (the child has its own budget). We track
    // remaining time so resume can re-arm with the unused portion.
    let executionTimer: NodeJS.Timeout | undefined
    let executionTimerStartedAt: number | undefined
    let executionTimerRemainingMs = EXECUTION_TIMEOUT_MS

    const startExecutionTimer = (): void => {
      executionTimerStartedAt = Date.now()
      executionTimer = setTimeout(() => {
        abortWithReason(
          `Execution timed out after ${EXECUTION_TIMEOUT_MS / 60000} minutes${getPendingToolInfo()}`,
        )
      }, executionTimerRemainingMs)
    }

    const suspendExecutionTimer = (): void => {
      if (!executionTimer || executionTimerStartedAt === undefined) return
      const elapsed = Date.now() - executionTimerStartedAt
      executionTimerRemainingMs = Math.max(0, executionTimerRemainingMs - elapsed)
      clearTimeout(executionTimer)
      executionTimer = undefined
      executionTimerStartedAt = undefined
      log.info(
        `Execution timer SUSPENDED for ${request.agentId} (${Math.round(executionTimerRemainingMs / 1000)}s remaining)`,
      )
    }

    const resumeExecutionTimer = (): void => {
      if (executionTimer) return
      startExecutionTimer()
      log.info(
        `Execution timer RESUMED for ${request.agentId} (${Math.round(executionTimerRemainingMs / 1000)}s remaining)`,
      )
    }

    startExecutionTimer()

    let inactivityTimer: NodeJS.Timeout | undefined
    const resetInactivityTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(() => {
        abortWithReason(
          `Execution timed out: no activity for ${INACTIVITY_TIMEOUT_MS / 60000} minutes${getPendingToolInfo()}`,
        )
      }, INACTIVITY_TIMEOUT_MS)
    }

    // Execution context for in-process tool servers (replaces process.env mutation).
    // Constructed after timer definitions so callbacks can close over inactivityTimer/resetInactivityTimer.
    const executionContext = {
      agentId: request.agentId,
      workspaceId: request.workspaceId,
      userId: request.userId,
      workspacePath: actualWorkspacePath,
      executionId,
      browserExecutionTs: Date.now().toString(),
      cascadeDepth: request.cascadeDepth ?? 0,
      platformSource: request.platformSource,
      platformMetadata: request.platformMetadata,
      // Callbacks for child executions (delegate_task/ask_agent) to suspend/resume this agent's timers
      suspendInactivityTimer: () => {
        if (inactivityTimer) clearTimeout(inactivityTimer)
        log.info(`Inactivity timer SUSPENDED for ${request.agentId} (child awaiting approval)`)
      },
      resumeInactivityTimer: () => {
        resetInactivityTimer()
        log.info(`Inactivity timer RESUMED for ${request.agentId}`)
      },
      suspendExecutionTimer,
      resumeExecutionTimer,
      setExecutionStatus: (status: 'awaiting_approval' | 'running') => {
        if (executionTracker) {
          executionTracker.update({ status } as any)
        }
        realtime.emit('agent:state-changed', {
          agentId: request.agentId,
          previousStatus: status === 'awaiting_approval' ? 'executing' : 'awaiting_approval',
          newStatus: status === 'awaiting_approval' ? 'awaiting_approval' : 'executing',
          workspaceId: request.workspaceId,
          metadata: { taskId: executionId, reason: 'delegated_agent_approval' },
        })
      },
    }

    // Wrap the entire execution in an AsyncLocalStorage context so in-process
    // tool servers (email-tools, browser-tools, etc.) read the correct agent/workspace
    // values even when multiple executions run concurrently.
    return await runInExecutionContext(executionContext, async () => {
      try {
        resetInactivityTimer() // Start inactivity timer before entering the loop
        const runtimeKind = agent.runtime ?? 'claude-sdk'
        const runtime = getAgentRuntime(runtimeKind)
        // Title preference order:
        //   1. Raw inbound user message (truncated) — best for Discord/Slack/email/WA
        //      so the activity entry shows what the user actually said.
        //   2. AI-generated conversationTitle (legacy fallback for chat).
        //   3. First 80 chars of the constructed task (last resort).
        const titleSource = request.userMessage ?? request.conversationTitle ?? request.task
        const runContext = {
          workspaceId: request.workspaceId,
          agentId: request.agentId,
          executionId,
          runtime: runtimeKind,
          title: titleSource.substring(0, 80),
          triggeredBy: isManualExecution ? 'manual' : 'schedule',
          platformSource: request.platformSource ?? null,
          userPrompt: request.userMessage ?? request.task,
        }
        for await (const message of runtime.run({
          prompt: systemPrompt, // Simple string works with MCP
          context: runContext,
          options: {
            abortController, // Abort on timeout or inactivity — breaks the SDK out of hung MCP calls
            mcpServers: allMcpServers, // Include both custom tools and workspace MCPs
            maxTurns: request.maxTurns || MAX_TURNS.executor,
            cwd: actualWorkspacePath, // Use actual workspace path (may be legacy path)
            model: agent.modelConfig.model,
            // Note: temperature, maxTokens, topP are not supported by Claude Agent SDK
            // These would need to be handled differently if model config is needed
            // Use 'default' mode so the SDK calls our canUseTool callback for every tool.
            // Our callback never returns 'ask' (only 'allow' or 'deny'), so it won't hang
            // waiting for interactive input. Guardrails create persistent approvals for
            // ask_first tools which the user resolves via the web dashboard.
            permissionMode: 'default' as const,
            settingSources: ['user', 'project'], // Global skills ($HOME/.claude/skills/) + workspace-scoped skills ({cwd}/.claude/skills/)
            // Sandbox: restrict Bash commands to workspace directory.
            // autoAllowBashIfSandboxed is false so Bash goes through our canUseTool
            // callback for guardrail enforcement (ask_first creates persistent approvals).
            sandbox: {
              enabled: true,
              autoAllowBashIfSandboxed: false,
              allowUnsandboxedCommands: false,
            },
            // Hooks: restrict file-path tools to workspace directory + enforce guardrails.
            // NOTE: canUseTool is NOT called by the SDK query() API — guardrails MUST be
            // enforced via PreToolUse hooks which DO fire for every tool invocation.
            hooks: {
              PreToolUse: [
                {
                  hooks: [
                    createSandboxHook(sandbox),
                    // Guardrail hook: enforce ask_first, never_allowed, and safety checks
                    (async (hookInput: any) => {
                      const toolName = hookInput.tool_name
                      const input = hookInput.tool_input || {}

                      // Helper: always create a persistent UI approval, and also notify via channel if available.
                      // The approval can be resolved from either the web dashboard or the channel — whichever comes first.
                      const requestChannelPermission = async (
                        toolName: string,
                        input: Record<string, unknown>,
                        source: string,
                      ) => {
                        const bgPermManager = BackgroundPermissionManager.getInstance()
                        const description = generateHumanReadableDescription(toolName, input)
                        const riskResult = assessRiskLevel(toolName, input)
                        const requestId = `bgperm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`

                        log.info(
                          `Creating persistent approval for ${toolName} (${source}) [${requestId}]`,
                        )

                        // Snapshot the conversation so the UI can show activity trace
                        const activityTrace = messages.map((m: any) => ({
                          type: m.type,
                          content:
                            m.type === 'assistant'
                              ? m.message?.content
                              : m.type === 'result'
                                ? m.content
                                : undefined,
                          toolName: m.type === 'result' ? m.tool_name : undefined,
                          timestamp: new Date().toISOString(),
                        }))

                        // Update execution status to awaiting_approval
                        if (executionTracker) {
                          executionTracker.update({ status: 'awaiting_approval' } as any)
                        }
                        realtime.emit('agent:state-changed', {
                          agentId: request.agentId,
                          previousStatus: 'executing',
                          newStatus: 'awaiting_approval',
                          workspaceId: request.workspaceId,
                          metadata: { toolName, description, requestId, taskId: executionId },
                        })

                        // Suspend inactivity timer while waiting for approval
                        if (inactivityTimer) clearTimeout(inactivityTimer)

                        // Register the persistent approval (writes to DB + emits WebSocket event)
                        // The promise resolves when ANY source (web UI, WhatsApp, Discord, Slack) resolves it
                        recordApprovalRequestedOnRun(executionId, {
                          requestId,
                          toolName,
                          riskLevel: riskResult.level || 'medium',
                          description,
                        })
                        const approvalPromise = new Promise<boolean>((resolve) => {
                          bgPermManager.registerPersistent({
                            requestId,
                            workspaceId: request.workspaceId,
                            agentId: request.agentId,
                            agentName: agent.name,
                            executionId,
                            toolName,
                            toolInput: input,
                            description,
                            riskLevel: riskResult.level || 'medium',
                            activityTrace,
                            resolve,
                          })
                        })

                        // Also notify via channel (WhatsApp/Discord/Slack) if configured — fire and forget.
                        // The channel provider will call bgPermManager.resolve() when the user responds,
                        // which resolves the same promise above.
                        if (channelProvider && channelCtx) {
                          log.info(
                            `Also notifying via ${channelCtx.platform} for approval ${requestId}`,
                          )
                          channelProvider
                            .requestPermission(
                              {
                                requestId,
                                toolName,
                                parameters: input,
                                description,
                                riskLevel: riskResult.level || 'medium',
                                agentId: request.agentId,
                                workspaceId: request.workspaceId,
                              },
                              channelCtx,
                              0, // No timeout — the persistent approval handles the wait
                            )
                            .then((channelApproved: boolean) => {
                              // If the channel responds before the web UI, resolve the persistent approval
                              bgPermManager.resolve(
                                requestId,
                                channelApproved,
                                `channel:${channelCtx!.platform}`,
                              )
                            })
                            .catch((err: any) => {
                              log.error(
                                { err: err },
                                `Channel notification failed for ${requestId}:`,
                              )
                              // Channel failure doesn't block — user can still approve via web UI
                            })
                        }

                        const approved = await approvalPromise
                        recordApprovalResolvedOnRun(executionId, requestId, approved, 'composite')

                        // Resume inactivity timer after approval resolves
                        resetInactivityTimer()

                        // Restore execution status to running
                        if (executionTracker) {
                          executionTracker.update({ status: 'running' } as any)
                        }
                        realtime.emit('agent:state-changed', {
                          agentId: request.agentId,
                          previousStatus: 'awaiting_approval',
                          newStatus: 'executing',
                          workspaceId: request.workspaceId,
                          metadata: { taskId: executionId },
                        })

                        if (approved) {
                          log.info(`Approval APPROVED: ${requestId} (tool: ${toolName})`)
                          return { behavior: 'allow' as const, updatedInput: input }
                        }
                        log.info(`Approval DENIED: ${requestId} (tool: ${toolName})`)
                        return { behavior: 'deny' as const, message: 'Permission denied by user.' }
                      }

                      const hookAllow = () => ({
                        hookSpecificOutput: {
                          hookEventName: 'PreToolUse' as const,
                          permissionDecision: 'allow' as const,
                        },
                      })
                      const hookDeny = (reason: string) => ({
                        hookSpecificOutput: {
                          hookEventName: 'PreToolUse' as const,
                          permissionDecision: 'deny' as const,
                          permissionDecisionReason: reason,
                        },
                      })

                      // Check ask_first tools — create persistent approval and wait
                      if (askFirstTools.has(toolName)) {
                        const result = await requestChannelPermission(toolName, input, 'ask_first')
                        return result.behavior === 'allow'
                          ? hookAllow()
                          : hookDeny(result.message || 'Permission denied')
                      }

                      // Dynamic classification for tools not in the static map
                      if (guardrails.length > 0) {
                        const level = getToolPermissionLevel(toolName, guardrails)
                        if (level === 'never_allowed') {
                          log.info(`Guardrail denied (never_allowed, dynamic): ${toolName}`)
                          return hookDeny(
                            `This action is not allowed. The "${toolName}" tool is blocked by this agent's guardrails.`,
                          )
                        }
                        if (level === 'ask_first') {
                          const result = await requestChannelPermission(
                            toolName,
                            input,
                            'ask_first dynamic',
                          )
                          return result.behavior === 'allow'
                            ? hookAllow()
                            : hookDeny(result.message || 'Permission denied')
                        }
                      }

                      // Critical safety check — always block destructive commands even in background
                      const safetyCheck = assessRiskLevel(toolName, input)
                      if (safetyCheck.autoDeny) {
                        log.info(
                          `Safety check denied: ${toolName} - ${safetyCheck.factors.join(', ')}`,
                        )
                        return hookDeny(`Blocked: ${safetyCheck.factors.join(', ')}`)
                      }

                      return hookAllow()
                    }) as any,
                  ],
                },
              ],
              PostToolUse: [{ hooks: [createTruncateToolResultsHook(log) as any] }],
            },
            // Guardrails: hide never_allowed tools from the model entirely
            ...(disallowedTools.length > 0 ? { disallowedTools } : {}),
            env: withExecutionTag(
              {
                ...filterServerSecrets(process.env),
                ENABLE_TOOL_SEARCH: 'auto:5',
                PWD: actualWorkspacePath,
                HOME: process.env.HOME || '/mnt/sdc',
                WORKSPACE_PATH: actualWorkspacePath,
                MCP_REMOTE_CONFIG_DIR: `${actualWorkspacePath}/.mcp-auth`,
                LAZARUS_WORKSPACE_ID: request.workspaceId,
                LAZARUS_AGENT_ID: request.agentId,
                LAZARUS_USER_ID: request.userId,
                STORAGE_BASE_PATH: process.env.STORAGE_BASE_PATH || './storage',
              },
              executionId,
            ),
          },
        })) {
          // Reset inactivity timer on every message from the SDK
          resetInactivityTimer()

          messages.push(message)
          messageCount++

          // Track progress based on message type
          let step: string | undefined
          let toolName: string | undefined
          let progressMessage: string | undefined

          if (message.type === 'assistant') {
            step = 'responding'
            progressMessage = 'Processing response...'

            // Extract content from assistant message
            const assistantMessage = message.message
            if (assistantMessage?.content) {
              for (const block of assistantMessage.content) {
                if (block.type === 'tool_use') {
                  toolCallCount++
                  toolName = block.name
                  progressMessage = `Using tool: ${block.name}`

                  // Track pending tool for timeout diagnostics
                  lastPendingTool = { name: block.name, startedAt: Date.now() }
                  if (!pendingToolWarningInterval) {
                    pendingToolWarningInterval = setInterval(() => {
                      if (lastPendingTool) {
                        const elapsed = Math.round((Date.now() - lastPendingTool.startedAt) / 1000)
                        log.warn(
                          `Still waiting for tool "${lastPendingTool.name}" — ${elapsed}s elapsed (agent ${request.agentId})`,
                        )
                      }
                    }, 60_000)
                  }

                  // Tool call is captured as a child agent.tool_call span by RuntimeTracer.
                }
              }
            }
            // Token usage is captured on the run span by RuntimeTracer via the SDK result.
          } else if (message.type === 'tool_progress') {
            step = 'tool_use'
            toolName = message.tool_name
            progressMessage = `Running tool: ${message.tool_name}`
          } else if (message.type === 'result') {
            step = 'responding'
            progressMessage = 'Completed'
            result = message
            // The SDK result message is the authoritative signal that the conversation
            // is finished. Break immediately so we don't hang waiting for the async
            // iterator to close (which triggers the inactivity timeout).
            log.info(`Result received — subtype=${(message as any).subtype}, breaking loop`)
            break
          } else if (message.type === 'system') {
            // System messages (init, compact_boundary, etc.)
            if ((message as any).subtype === 'init') {
              const initMsg = message as any
              const skills = initMsg.skills || []
              log.info(`SDK init - skills loaded: [${skills.join(', ')}] (${skills.length} total)`)
            }
          }

          // Track tool errors from the most recent turn only — earlier errors
          // may have been recovered from by the agent, so only the final turn matters.
          if (message.type === 'user') {
            // Tool result arrived — clear pending tool tracking
            lastPendingTool = undefined
            if (pendingToolWarningInterval) {
              clearInterval(pendingToolWarningInterval)
              pendingToolWarningInterval = undefined
            }

            const contentBlocks = (message as any).message?.content
            const toolResultErrors = extractToolErrors(contentBlocks)
            if (toolResultErrors.length > 0) {
              lastTurnToolErrors = toolResultErrors
              log.info(`Tool errors detected in user message: ${JSON.stringify(toolResultErrors)}`)
            } else {
              lastTurnToolErrors = []
            }
            // Debug: log tool_result blocks to diagnose false positives
            if (Array.isArray(contentBlocks)) {
              for (const block of contentBlocks) {
                if ((block as any).type === 'tool_result') {
                  const text = extractTextFromToolResult((block as any).content)
                  log.info(
                    `tool_result: is_error=${(block as any).is_error}, content_preview=${text?.substring(0, 200) || 'null'}`,
                  )
                }
              }
            }
          }

          // Calculate rough progress percentage (cap at 95% until final)
          const estimatedProgress = Math.min(
            95,
            Math.floor((messageCount / ((request.maxTurns || MAX_TURNS.executor) * 0.5)) * 100),
          )

          // Update execution cache with progress using fluent API
          if (step) {
            executionTracker.progress(estimatedProgress).update({
              step,
              toolName,
              message: progressMessage,
              toolCallCount,
              messageCount,
            })
          }

          // Call onMessage callback if provided
          if (request.onMessage) {
            request.onMessage(message)
          }

          log.info(`Message type: ${message.type}, Progress: ${estimatedProgress}%`)
        }

        // Determine final status: only SDK-level errors (crash, timeout, max turns)
        // mark as failed. Tool-level errors are NOT reliable — the agent may retry
        // and succeed. Everything that completes the SDK loop = "completed".
        const declaredResult = consumeTaskResult(executionId) // Clean up in-memory map
        const sdkSubtype = (result as any)?.subtype
        const hasSdkError = !!sdkSubtype && sdkSubtype !== 'success'

        let isFailed: boolean
        let errorSummary: string

        const EXECUTOR_ERROR_MESSAGES: Record<string, string> = {
          error_max_turns: 'Agent reached the maximum turn limit ({limit} turns)',
          error_tool_execution: 'A tool call failed during execution',
          error_model: 'The AI model returned an error',
          cancelled: 'Cancelled by user',
        }

        if (hasSdkError) {
          isFailed = true
          const template = sdkSubtype ? EXECUTOR_ERROR_MESSAGES[sdkSubtype] : undefined
          errorSummary = template
            ? template.replace('{limit}', String(request.maxTurns || MAX_TURNS.executor))
            : `SDK error: ${sdkSubtype || result?.result || 'Unknown'}`
          log.info(`SDK error: ${errorSummary}`)
        } else {
          isFailed = false
          errorSummary = ''
          log.info(`SDK loop completed — marking as completed`)
        }

        if (declaredResult) {
          log.info(`Agent declared task_result: ${declaredResult.status} (ignored for status)`)
        }

        log.info(`Final status: isFailed=${isFailed}, sdk.subtype=${(result as any)?.subtype}`)

        if (isFailed) {
          executionTracker.fail(errorSummary, {
            progress: 100,
            toolCallCount,
            messageCount,
            toolErrors: lastTurnToolErrors,
          })

          return { result, messages, toolErrors: lastTurnToolErrors }
        }

        // No errors — mark as completed (broadcasts to workspace members).
        // Activity persistence is owned by the OTel span processor writing to agent_runs.
        executionTracker.complete({
          progress: 100,
          toolCallCount,
          messageCount,
          completed: true,
        })

        this.triggerLibrarianIfSubstantive(
          request.workspaceId,
          request.agentId,
          request.userId,
          executionId,
          sdkMessagesToConversation(messages),
        )

        return { result, messages }
      } catch (error) {
        // Replace misleading SDK abort message with our descriptive reason
        const isSDKAbort = error instanceof Error && error.message.includes('aborted by user')
        const effectiveAbortReason = abortReason || executionAbortRegistry.getReason(executionId)
        const errorMessage =
          isSDKAbort && effectiveAbortReason
            ? effectiveAbortReason
            : error instanceof Error
              ? error.message
              : 'Unknown error'

        const isCancellation = isSDKAbort && !!effectiveAbortReason
        log.error({ err: errorMessage }, 'Execution error')

        // Span processor marks the agent.run span as failed/cancelled on end.
        if (isCancellation) {
          executionTracker.cancel(errorMessage)
        } else {
          executionTracker.fail(errorMessage, {
            toolCallCount,
            messageCount,
          })
        }

        throw new Error(errorMessage)
      } finally {
        // Clear execution timeout, inactivity, and pending-tool warning timers
        if (executionTimer) clearTimeout(executionTimer)
        if (inactivityTimer) clearTimeout(inactivityTimer)
        if (pendingToolWarningInterval) clearInterval(pendingToolWarningInterval)
        executionAbortRegistry.remove(executionId)

        // Clean up any browser sessions spawned during this execution
        try {
          await browserSessionManager.cleanupAllSessions()
        } catch (e) {
          log.error({ err: e }, 'Browser session cleanup error')
        }

        // Expire any pending approvals for this execution (agent died or completed)
        try {
          const expiredCount = await approvalService.expireByExecution(executionId)
          if (expiredCount > 0) {
            log.info(`Expired ${expiredCount} pending approval(s) for execution ${executionId}`)
          }
        } catch (approvalErr) {
          log.error({ err: approvalErr }, 'Approval cleanup error')
        }

        // Clean up orphaned MCP processes from this execution
        try {
          const killedCount = this.cleanupOrphanedMCPProcesses(executionId)
          if (killedCount > 0) {
            log.info(
              `Cleaned up ${killedCount} orphaned MCP processes for execution ${executionId}`,
            )
          }
        } catch (cleanupErr) {
          log.error({ err: cleanupErr }, 'MCP process cleanup error')
        }

        // No need to restore process.env — AsyncLocalStorage scopes context automatically
      }
    }) // end runInExecutionContext
  }

  /**
   * Clean up orphaned MCP processes spawned during a specific execution.
   * Reads /proc/{pid}/environ to verify the process belongs to this execution
   * before killing, ensuring workspace isolation.
   */
  private cleanupOrphanedMCPProcesses(executionId: string): number {
    const backendPid = process.pid
    const backendPpid = process.ppid

    let candidatePids: number[] = []
    try {
      const pgrepOutput = execSync('pgrep -u lazarus -f "node|npm"', {
        encoding: 'utf-8',
        timeout: 5000,
      })
      candidatePids = pgrepOutput
        .trim()
        .split('\n')
        .map((p) => parseInt(p, 10))
        .filter((p) => !isNaN(p))
    } catch {
      // pgrep returns exit code 1 when no processes match
      return 0
    }

    let killedCount = 0
    for (const pid of candidatePids) {
      if (pid === backendPid || pid === backendPpid) continue

      try {
        const environ = fsSync.readFileSync(`/proc/${pid}/environ`, 'utf-8')
        if (!environ.includes(`LAZARUS_EXECUTION_ID=${executionId}`)) continue

        try {
          process.kill(pid, 'SIGTERM')
          killedCount++
        } catch (killErr: any) {
          if (killErr.code !== 'ESRCH') {
            log.warn({ data: killErr.message }, `Failed to kill PID ${pid}:`)
          }
        }
      } catch (err) {
        log.debug({ err }, "Can't read /proc/{pid}/environ — skip")
      }
    }

    return killedCount
  }

  /**
   * Build system prompt for agent execution
   */

  private triggerLibrarianIfSubstantive(
    workspaceId: string,
    agentId: string,
    userId: string,
    executionId: string,
    conversationMessages: any[],
  ): void {
    if (!conversationHasSubstance(conversationMessages, 1, 200)) return

    const transcript = formatTranscript(conversationMessages)
    if (!transcript || transcript.length < 200) return

    try {
      librarianProcessor.analyzeConversation({
        workspaceId,
        agentId,
        userId,
        conversationId: executionId,
        transcript,
      })
    } catch (error) {
      log.warn({ err: error, executionId }, 'Failed to enqueue librarian analysis')
    }
  }

  private async buildSystemPrompt(
    agent: WorkspaceAgentConfig,
    workspace: any,
    task: string,
  ): Promise<string> {
    let prompt = wrapWithLazarusIdentity(agent.systemPrompt)

    // Add workspace context
    prompt += `\n\n## Workspace Context\nYou are working in workspace: ${workspace.name}\n`
    prompt += `Description: ${workspace.description || 'No description'}\n`
    prompt += `Path: ${workspace.path}\n`

    // Get workspace slug for email addresses
    const workspaceSlug = workspace.slug || workspace.id

    // Add communication context with available agents
    prompt += `\n## Communication\n`
    prompt += `Your email: ${agent.id}@${workspaceSlug}.lazarusconnect.com\n\n`

    // Load and list available workspace agents
    const workspaceAgents = await this.loadWorkspaceAgents(workspace.path, workspaceSlug, agent.id)
    if (workspaceAgents.length > 0) {
      prompt += `### Available Agents in This Workspace\n`
      prompt += `Use \`ask_agent\` for quick questions or \`delegate_task\` for tasks requiring tools.\n\n`
      for (const otherAgent of workspaceAgents) {
        prompt += `- **${otherAgent.name}** (ID: \`${otherAgent.id}\`)\n`
        prompt += `  ${otherAgent.description}\n\n`
      }
    }

    prompt += `### Agent Communication Tools\n`
    prompt += `- ask_agent: Ask another agent a question (lightweight, no tools)\n`
    prompt += `- delegate_task: Delegate a task to another agent (synchronous, with tools)\n\n`
    prompt += `### Email Tools (external email only)\n`
    prompt += `- email_send: Send email to external addresses\n`
    prompt += `- email_list: Read your inbox\n`
    prompt += `- email_read: Read a specific message\n`
    prompt += `- email_reply: Reply to a message\n`

    // Add agent personal files context
    if (agent.personalFiles) {
      prompt += `\n## Your Personal Files\n`
      prompt += `You have a personal directory at: /agents/${agent.id}/\n`

      if (agent.personalFiles.scriptsDir) {
        prompt += `- Scripts directory: ${agent.personalFiles.scriptsDir}\n`
      }
      if (agent.personalFiles.promptsDir) {
        prompt += `- Prompts directory: ${agent.personalFiles.promptsDir}\n`
      }
      if (agent.personalFiles.dataDir) {
        prompt += `- Data directory: ${agent.personalFiles.dataDir}\n`
      }
    }

    const memoryBlock = await buildMemoryBlock(workspace.id, agent.id)
    if (memoryBlock) {
      prompt += memoryBlock
    }

    prompt += `

## Current Task
${task}
`

    return prompt
  }

  /**
   * Get MCP configuration for agent
   */
  private async getMCPConfig(agent: WorkspaceAgentConfig, workspace: any): Promise<any> {
    const mcpConfig: any = { mcpServers: {} }

    // Get workspace MCP configuration
    const workspaceMcpConfig = await this.mcpWorkspaceManager.buildWorkspaceMCPConfig(workspace)

    // If agent has specific MCP servers defined, use those
    if (agent.mcpServers) {
      for (const [key, server] of Object.entries(agent.mcpServers)) {
        if (server.enabled !== false) {
          mcpConfig.mcpServers[key] = {
            command: server.command,
            args: server.args || [],
            env: server.env || {},
          }
        }
      }
    }

    // Add workspace MCP servers if agent allows MCP tool
    if (agent.allowedTools.includes('mcp') || agent.allowedTools.includes('*')) {
      // Filter workspace MCPs based on activeMCPs if specified
      const workspaceServers = workspaceMcpConfig.mcpServers || {}

      if (agent.activeMCPs && agent.activeMCPs.length > 0) {
        // Only include specified MCPs
        for (const mcpName of agent.activeMCPs) {
          if (workspaceServers[mcpName]) {
            mcpConfig.mcpServers[mcpName] = workspaceServers[mcpName]
          }
        }
      } else {
        // Include all workspace MCPs
        Object.assign(mcpConfig.mcpServers, workspaceServers)
      }
    }

    return mcpConfig
  }

  /**
   * Load all agents in a workspace with their info
   */
  private async loadWorkspaceAgents(
    workspacePath: string,
    workspaceSlug: string,
    excludeAgentId?: string,
  ): Promise<AgentInfo[]> {
    const agents: AgentInfo[] = []
    const agentsDir = path.join(workspacePath, '.agents')

    try {
      const entries = await fs.readdir(agentsDir, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        if (excludeAgentId && entry.name === excludeAgentId) continue

        try {
          const configPath = path.join(agentsDir, entry.name, 'config.agent.json')
          const configContent = await fs.readFile(configPath, 'utf-8')
          const config = JSON.parse(configContent)

          if (config.enabled !== false) {
            agents.push({
              id: config.id || entry.name,
              name: config.name || entry.name,
              description: config.description || 'No description',
              email: `${entry.name}@${workspaceSlug}.lazarusconnect.com`,
            })
          }
        } catch (e) {
          log.debug({ err: e }, 'Skip agents without valid config')
        }
      }
    } catch (e) {
      log.debug({ err: e }, 'No agents directory')
    }

    return agents
  }

  // NOTE: executeAgentStream is dead code — interactive chat uses chat.ts which
  // calls the SDK's query() directly with its own SSE permission handling.
  // Commented out to avoid confusion with the actual executeAgent() above.
  /*
  async *executeAgentStream(request: {
    agentId: string;
    workspaceId: string;
    userId: string;
    task: string;
    maxTurns?: number;
  }): AsyncGenerator<any, void, unknown> {
    // Get agent configuration
    const agent = await this.agentService.getAgent(
      request.workspaceId,
      request.userId,
      request.agentId
    );

    if (!agent) {
      throw new Error(`Agent ${request.agentId} not found in workspace ${request.workspaceId}`);
    }

    // Get workspace
    const workspace = await this.workspaceManager.getWorkspace(
      request.workspaceId,
      request.userId
    );

    if (!workspace) {
      throw new Error(`Workspace ${request.workspaceId} not found`);
    }

    // Build system prompt
    const systemPrompt = await this.buildSystemPrompt(agent, workspace, request.task);

    // Get MCP configuration
    const mcpConfig = await this.getMCPConfig(agent, workspace);
    const interpolatedMcpConfig = this.interpolateEnvVars(mcpConfig);

    // Get custom tools for system agents
    const customTools = this.getCustomToolsForAgent(agent);

    // Merge custom tools with workspace MCPs
    const allMcpServers = {
      ...customTools,
      ...interpolatedMcpConfig.mcpServers
    };

    // Compute guardrail restrictions
    const streamGuardrails = agent.guardrails || [];
    const streamDisallowedTools = getDisallowedTools(streamGuardrails);
    const streamAskFirstTools = getAskFirstTools(streamGuardrails);

    // Execution context for in-process tool servers (replaces process.env mutation)
    const streamContext = {
      agentId: request.agentId,
      workspaceId: request.workspaceId,
      userId: request.userId,
      workspacePath: workspace.path,
      browserExecutionTs: Date.now().toString(),
    };

    // Create workspace sandbox to restrict file access
    const streamSandbox = new WorkspaceSandbox(workspace.path, workspace.additionalPaths);

    log.info(`Stream - Agent context: AGENT_ID=${request.agentId}, WORKSPACE_ID=${request.workspaceId}, USER_ID=${request.userId}`);
    log.info(`Stream - Sandbox enabled`);

    // Note: runInExecutionContext doesn't work with async generators (yield can't cross context boundaries).
    // For streaming, we still need process.env as fallback. Streaming is typically single-user interactive
    // sessions, not concurrent background triggers, so the race condition is unlikely here.
    // TODO: Refactor streaming to use a different pattern if concurrent streaming becomes needed.
    const previousEnv = {
      AGENT_ID: process.env.AGENT_ID,
      WORKSPACE_ID: process.env.WORKSPACE_ID,
      USER_ID: process.env.USER_ID,
      WORKSPACE_PATH: process.env.WORKSPACE_PATH,
      BROWSER_EXECUTION_TS: process.env.BROWSER_EXECUTION_TS,
    };

    process.env.AGENT_ID = request.agentId;
    process.env.WORKSPACE_ID = request.workspaceId;
    process.env.USER_ID = request.userId;
    process.env.WORKSPACE_PATH = workspace.path;
    process.env.BROWSER_EXECUTION_TS = Date.now().toString();

    try {
      // Stream execution
      for await (const message of query({
        prompt: systemPrompt,
        options: {
          mcpServers: allMcpServers,
          maxTurns: request.maxTurns || MAX_TURNS.executor,
          cwd: workspace.path,
          model: agent.modelConfig.model,
          permissionMode: 'default' as const,
          // Sandbox: restrict Bash commands to workspace directory
          sandbox: {
            enabled: true,
            autoAllowBashIfSandboxed: true,
            allowUnsandboxedCommands: false,
          },
          // Hooks: restrict file-path tools to workspace directory
          hooks: {
            PreToolUse: [{ hooks: [createSandboxHook(streamSandbox)] }],
            PostToolUse: [{ hooks: [createTruncateToolResultsHook(log) as any] }],
          },
          // Guardrails: hide never_allowed tools from the model entirely
          ...(streamDisallowedTools.length > 0 ? { disallowedTools: streamDisallowedTools } : {}),
          // Guardrails: canUseTool callback for ask_first + dynamic tool classification
          canUseTool: async (toolName: string, input: Record<string, unknown>) => {
            if (streamAskFirstTools.has(toolName)) {
              return {
                behavior: 'deny' as const,
                message: 'This action requires user approval and cannot be performed during background execution. Run this agent in an interactive chat session.',
              };
            }
            if (streamGuardrails.length > 0) {
              const level = getToolPermissionLevel(toolName, streamGuardrails);
              if (level === 'never_allowed') {
                return {
                  behavior: 'deny' as const,
                  message: `This action is not allowed. The "${toolName}" tool is blocked by this agent's guardrails.`,
                };
              }
              if (level === 'ask_first') {
                return {
                  behavior: 'deny' as const,
                  message: 'This action requires user approval and cannot be performed during background execution. Run this agent in an interactive chat session.',
                };
              }
            }
            return { behavior: 'allow' as const, updatedInput: input };
          },
        }
      })) {
        yield message;
      }
    } finally {
      // Clean up any browser sessions spawned during this execution
      try { await browserSessionManager.cleanupAllSessions(); } catch (e) {
        log.error({ err: e }, 'Stream - Browser session cleanup error');
      }

      // Restore previous environment variables
      for (const [key, val] of Object.entries(previousEnv)) {
        if (val !== undefined) {
          process.env[key] = val;
        } else {
          delete process.env[key];
        }
      }
      log.info(`Stream - Restored environment variables`);
    }
  }
  */
}
