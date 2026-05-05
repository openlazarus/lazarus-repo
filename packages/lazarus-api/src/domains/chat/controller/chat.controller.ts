import { Request, Response } from 'express'
import { type SDKUserMessage } from '@anthropic-ai/claude-agent-sdk'
import { getAgentRuntime } from '@domains/agent/runtime'
import type { UUID } from 'crypto'
import { WorkspaceManager } from '@domains/workspace/service/workspace-manager'
import { MCPWorkspaceManager } from '@domains/workspace/service/mcp-workspace-manager'
import { PermissionSessionManager } from '@domains/permission/service/session-manager'
import {
  assessRiskLevel,
  getTimeoutForRiskLevel,
  formatRiskLevel,
} from '@domains/permission/service/risk-assessment'
import { WorkspaceSandbox } from '@domains/permission/service/sandbox'
import { createSandboxHook } from '@domains/permission/service/sandbox-hook'
import { createTruncateToolResultsHook } from '@domains/permission/service/truncate-tool-results-hook'
import { filterServerSecrets } from '@infrastructure/config/sdk-subprocess-env'
import { conversationMetadata } from '@domains/conversation/service/conversation-metadata.service'
import { resolveClaudeSessionJsonlPath } from '@domains/conversation/service/workspace-transcript-path'
import { librarianProcessor } from '@background/librarian-processor.service'
import { buildMemoryBlock } from '@domains/knowledge/service/memory-prompt-builder'
import {
  formatTranscript,
  conversationHasSubstance,
} from '@domains/knowledge/service/transcript-formatter'
import { extractMentionReferences, hasMentions } from '@domains/conversation/service/mention-parser'
import {
  buildContextFromMentions,
  formatContextForClaude,
} from '@domains/conversation/service/context-builder'
import {
  ChatRequestSchema,
  type ChatEvent,
  type ChatRequest,
} from '@domains/chat/types/chat.schemas'
import * as path from 'path'
import * as fs from 'fs/promises'
import { createToolServers } from '@tools/mcp-tool-server-factory'
import { mcpConfigManager } from '@domains/mcp/service/mcp-config-manager'
import { WorkspaceAgentService } from '@domains/agent/service/workspace-agent.service'
import { getActivityService } from '@domains/activity/service/activity.service'
import { generateConversationTitle } from '@domains/conversation/service/conversation-title.service'
import { v4 as uuidv4 } from 'uuid'
import { wrapWithLazarusIdentity, getLazarusPrePrompt } from '@infrastructure/config/system-prompts'
import { createLogger } from '@utils/logger'
import {
  getDisallowedTools,
  getAskFirstTools,
  getToolPermissionLevel,
} from '@guardrails/guardrail-tool-mapping'
import type { GuardrailConfig } from '@guardrails/guardrail-tool-mapping'
import {
  ApiError,
  BadRequestError,
  NotFoundError,
  InternalServerError,
  ServiceUnavailableError,
} from '@errors/api-errors'
import { mcpProcessTracker } from '@domains/chat/service/mcp-process-tracker'
import { memoryPressureMonitor } from '@domains/chat/service/memory-pressure-monitor'
import { withChatSessionTag } from '@infrastructure/config/mcp-env'
import { runInExecutionContext } from '@domains/execution/service/execution-context'

const log = createLogger('chat')

const workspaceManager = new WorkspaceManager()
const mcpWorkspaceManager = new MCPWorkspaceManager()
const permissionManager = PermissionSessionManager.getInstance()

function getCustomToolsForChat(): Record<string, any> {
  const customServers = createToolServers({ includeV0: true })
  log.debug({ tools: Object.keys(customServers) }, 'Loaded custom tools')
  return customServers
}

function sendEvent(res: Response, event: ChatEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}

async function processChat(request: ChatRequest, userId: string, res: Response): Promise<void> {
  const chatSessionTag = mcpProcessTracker.generateTag()

  let claudeSessionId: string | undefined

  let activityLogId: string | undefined
  let conversationTitle: string | undefined

  let heartbeatInterval: NodeJS.Timeout | undefined
  let abortController: AbortController | undefined

  try {
    let workspaceForContext: any = null

    if (request.workspaceId) {
      workspaceForContext = await workspaceManager.getWorkspace(request.workspaceId, userId)
    } else {
      log.debug({ userId }, 'No workspace specified, using default workspace')
      workspaceForContext = await workspaceManager.getOrCreateDefaultWorkspace(userId)
      request.workspaceId = workspaceForContext?.id
    }

    if (workspaceForContext) {
      if (!request.mcpServers && workspaceForContext.mcpServers) {
        request.mcpServers = workspaceForContext.mcpServers
      }
    }

    let mcpServersConfig: Record<string, any> | undefined
    let workingDirectory = process.cwd()
    const workspace: any = workspaceForContext

    if (workspace) {
      workingDirectory = path.isAbsolute(workspace.path)
        ? workspace.path
        : path.resolve(process.cwd(), workspace.path)

      log.debug(
        {
          workspacePath: workspace.path,
          workingDirectory,
          cwd: process.cwd(),
        },
        'Workspace path debug',
      )

      try {
        const stats = await fs.stat(workingDirectory)
        log.debug(
          {
            isDirectory: stats.isDirectory(),
            permissions: stats.mode.toString(8),
            uid: stats.uid,
            gid: stats.gid,
          },
          'Workspace directory exists',
        )

        await fs.access(workingDirectory, fs.constants.W_OK)
        log.debug('Workspace directory is writable')
      } catch (error) {
        log.error({ err: error, path: workingDirectory }, 'Workspace directory validation failed')
        sendEvent(res, {
          type: 'error',
          content: `Workspace directory not accessible: ${error instanceof Error ? error.message : String(error)}`,
          metadata: {
            code: 'WORKSPACE_DIRECTORY_ERROR',
            path: workingDirectory,
            error: error instanceof Error ? error.message : String(error),
          },
          timestamp: new Date().toISOString(),
        })
      }

      if (!request.resumeSessionId) {
        await workspaceManager.getWorkspaceContext(workspace)
      }

      sendEvent(res, {
        type: 'context',
        content: `Using workspace: ${workspace.name || request.workspaceId}`,
        metadata: {
          workspaceId: request.workspaceId,
          path: workspace.path,
          additionalPaths: workspace.additionalPaths,
        },
        timestamp: new Date().toISOString(),
      })

      const mcpWorkspaceConfig = await mcpConfigManager.getResolvedWorkspaceMCPConfig(
        workspace.path,
      )

      mcpServersConfig = {}
      const absoluteWorkspacePath = path.isAbsolute(workspace.path)
        ? workspace.path
        : path.resolve(process.cwd(), workspace.path)

      for (const [serverName, serverConfig] of Object.entries(
        mcpWorkspaceConfig.mcpServers ?? {},
      )) {
        if (serverConfig.enabled !== false) {
          mcpServersConfig[serverName] = {
            type: (serverConfig as any).transport || 'stdio',
            command: serverConfig.command,
            args: serverConfig.args || [],
            env: withChatSessionTag(
              {
                ...serverConfig.env,
                WORKSPACE_PATH: absoluteWorkspacePath,
                MCP_REMOTE_CONFIG_DIR: `${absoluteWorkspacePath}/.mcp-auth`,
              },
              chatSessionTag,
            ),
            ...(serverConfig.url ? { url: serverConfig.url } : {}),
          }
        }
      }

      log.debug(
        { mcpServers: Object.keys(mcpServersConfig), workspacePath: workspace.path },
        'Loaded MCP servers from workspace',
      )
    } else if (request.workspaceId) {
      sendEvent(res, {
        type: 'error',
        content: `Workspace not found: ${request.workspaceId}`,
        metadata: { code: 'WORKSPACE_NOT_FOUND' },
        timestamp: new Date().toISOString(),
      })
    }

    if (!workspace && request.mcpServers && request.mcpServers.length > 0) {
      mcpServersConfig = {}
      for (const serverName of request.mcpServers) {
        const defaultServers = mcpWorkspaceManager.getDefaultMCPServers()
        if (defaultServers[serverName]) {
          mcpServersConfig[serverName] = defaultServers[serverName]
        }
      }
    }

    let mentionContext = ''
    if (hasMentions(request.message)) {
      log.debug('Message contains mentions, parsing')

      try {
        const mentions = extractMentionReferences(request.message)
        log.debug({ count: mentions.length, mentions }, 'Found mentions')

        if (mentions.length > 0) {
          const contextResult = await buildContextFromMentions(mentions, {
            userId,
            workspaceId: request.workspaceId,
            storagePath: process.env.STORAGE_BASE_PATH ?? '/mnt/sdc/storage',
          })

          if (contextResult.items.length > 0) {
            mentionContext = formatContextForClaude(contextResult.items)
            log.debug(
              { itemCount: contextResult.items.length },
              'Built context from mentioned items',
            )

            sendEvent(res, {
              type: 'context',
              content: `Loaded ${contextResult.items.length} mentioned items`,
              metadata: {
                mentionCount: mentions.length,
                contextItemCount: contextResult.items.length,
                items: contextResult.items.map((item) => ({
                  type: item.type,
                  source: item.source,
                })),
              },
              timestamp: new Date().toISOString(),
            })
          }

          if (contextResult.errors.length > 0) {
            log.warn({ errors: contextResult.errors }, 'Errors loading some mentioned items')
            sendEvent(res, {
              type: 'status',
              content: `Could not load ${contextResult.errors.length} mentioned items`,
              metadata: {
                errors: contextResult.errors,
              },
              timestamp: new Date().toISOString(),
            })
          }
        }
      } catch (error) {
        log.error({ err: error }, 'Error parsing mentions')
      }
    }

    let fullPrompt = request.message

    if (mentionContext) {
      fullPrompt = `${mentionContext}\n\n=== USER MESSAGE ===\n${request.message}`
      log.debug('Prepended mention context to message')
    }

    if (request.resumeSessionId) {
      log.debug(
        { sessionId: request.resumeSessionId, hasMentionContext: !!mentionContext },
        'Resuming session',
      )
    } else {
      log.debug({ hasMentionContext: !!mentionContext }, 'New session')
    }

    let specialistAgentsList = ''
    try {
      const agentServiceInstance = new WorkspaceAgentService()

      const agents = await agentServiceInstance.listAgents(request.workspaceId!, userId, true)
      const specialists: string[] = []

      for (const agent of agents) {
        const description =
          agent.description || agent.systemPrompt?.split('\n')[0] || 'No description'
        specialists.push(`- **${agent.id}**: ${description}`)
      }

      if (specialists.length > 0) {
        specialistAgentsList = `\n**Available Agents in Workspace:**\n${specialists.join('\n')}`
      }
    } catch (error) {
      log.error({ err: error }, 'Failed to load workspace agents list')
    }

    let systemPrompt = ''
    let agentName = 'Lazarus'
    let agentModel = 'claude-sonnet-4-6'
    let agentGuardrails: GuardrailConfig[] = []
    let guardrailDisallowedTools: string[] = []
    let guardrailAskFirstTools: Set<string> = new Set()

    if (request.agentId && request.workspaceId) {
      try {
        const agentServiceInstance = new WorkspaceAgentService()
        const agent = await agentServiceInstance.getAgent(
          request.workspaceId,
          userId,
          request.agentId,
        )

        if (agent && agent.enabled) {
          systemPrompt = wrapWithLazarusIdentity(agent.systemPrompt)
          agentName = agent.name
          agentModel = agent.modelConfig?.model || 'claude-sonnet-4-6'
          log.info(
            {
              agentName: agent.name,
              agentId: request.agentId,
              model: agentModel,
              promptLength: systemPrompt.length,
            },
            'Using agent',
          )

          systemPrompt = `You are ${agent.name}. ${systemPrompt}`

          agentGuardrails = agent.guardrails || []
          if (agentGuardrails.length > 0) {
            guardrailDisallowedTools = getDisallowedTools(agentGuardrails)
            guardrailAskFirstTools = getAskFirstTools(agentGuardrails)
            log.info(
              {
                disallowed: guardrailDisallowedTools.length,
                askFirst: guardrailAskFirstTools.size,
                categories: agentGuardrails.map((g) => `${g.categoryId}:${g.level}`),
              },
              'Guardrails loaded for agent',
            )
          }
        } else {
          log.warn(
            { agentId: request.agentId },
            'Agent not found or disabled, falling back to Lazarus',
          )
        }
      } catch (error) {
        log.error({ err: error }, 'Failed to load agent config')
      }
    }

    if (!systemPrompt) {
      systemPrompt = getLazarusPrePrompt()
      systemPrompt = systemPrompt.replace('`[workspace directory]`', `\`${workingDirectory}\``)
      log.debug('Using Lazarus preprompt from system-prompts.ts')
    }

    let memoryBlock = ''
    if (request.workspaceId) {
      memoryBlock = await buildMemoryBlock(request.workspaceId, request.agentId || 'lazarus')
    }

    const finalSystemPrompt =
      request.systemPrompt ||
      systemPrompt +
        memoryBlock +
        `

${mcpServersConfig ? '\nYou have access to MCP tools. Use them when appropriate to help the user with file operations, database queries, and other tasks.' : ''}
${request.requirePermissions ? '\nIMPORTANT: Before using any potentially dangerous tools (Bash, Write, Edit, Delete), you MUST first call the request_permission tool to get user approval. Explain clearly what you intend to do and why.' : ''}

${specialistAgentsList}`

    log.debug(
      {
        agentId: request.agentId || 'none',
        agentName,
        promptPreview: finalSystemPrompt.substring(0, 200),
      },
      'System prompt debug',
    )

    const customTools = getCustomToolsForChat()

    const finalMcpServers = {
      ...customTools,
      ...mcpServersConfig,
    }

    log.debug({ mcpServers: Object.keys(finalMcpServers) }, 'Final MCP servers')

    abortController = new AbortController()

    const chatSandbox = new WorkspaceSandbox(workingDirectory, workspace?.additionalPaths)
    log.debug('Sandbox enabled for chat session')

    const sdkOptions: any = {
      model: agentModel,
      maxTurns: request.maxTurns,
      systemPrompt: finalSystemPrompt,
      cwd: workingDirectory,
      permissionMode: 'default' as const,
      mcpServers: finalMcpServers,
      additionalDirectories: workspace?.additionalPaths,
      allowedTools: ['*'],
      sandbox: {
        enabled: true,
        autoAllowBashIfSandboxed: true,
        allowUnsandboxedCommands: false,
      },
      hooks: {
        PreToolUse: [{ hooks: [createSandboxHook(chatSandbox)] }],
        PostToolUse: [{ hooks: [createTruncateToolResultsHook(log) as any] }],
      },
      ...(guardrailDisallowedTools.length > 0 ? { disallowedTools: guardrailDisallowedTools } : {}),
      settingSources: ['user', 'project'],
      env: {
        ...filterServerSecrets(process.env),
        ENABLE_TOOL_SEARCH: 'auto:5',
        HOME: process.env.HOME || '/mnt/sdc',
        LAZARUS_CHAT_SESSION_ID: chatSessionTag,
      },
      abortController,
      stderr: (msg: string) => {
        log.info({ stderr: msg.substring(0, 2000) }, 'SDK CLI stderr')
      },
    }

    log.debug({ requirePermissions: request.requirePermissions }, 'Setting canUseTool callback')
    sdkOptions.canUseTool = async (
      toolName: string,
      input: Record<string, unknown>,
      _options: { signal: AbortSignal },
    ) => {
      log.info({ toolName }, 'canUseTool called')

      if (toolName === 'AskUserQuestion') {
        log.debug({ input }, 'AskUserQuestion intercepted')

        if (!claudeSessionId) {
          log.debug('No session ID yet for AskUserQuestion, denying')
          return { behavior: 'deny', message: 'Session not ready for user questions' }
        }

        if (!permissionManager.getSession(claudeSessionId)) {
          permissionManager.registerSession(
            claudeSessionId,
            res,
            userId,
            request.workspaceId || 'unknown',
          )
        }

        const requestId = permissionManager.generateRequestId()
        const questions = (input.questions as any[]) || []

        sendEvent(res, {
          type: 'ask_user_question',
          requestId,
          sessionId: claudeSessionId,
          metadata: {
            questions: questions.map((q: any) => ({
              question: q.question,
              header: q.header,
              options: (q.options || []).map((opt: any) => ({
                label: opt.label,
                description: opt.description,
              })),
              multiSelect: q.multiSelect || false,
            })),
          },
          timestamp: new Date().toISOString(),
        } as any)

        const ASK_USER_TIMEOUT_MS = 120000
        const userAnswers = await new Promise<Record<string, string> | null>((resolve) => {
          const timeout = setTimeout(() => {
            log.debug({ requestId }, 'AskUserQuestion timed out')
            permissionManager.resolveAskUserRequest(claudeSessionId!, requestId, null)
          }, ASK_USER_TIMEOUT_MS)

          permissionManager.addAskUserRequest(claudeSessionId!, requestId, resolve, timeout)
        })

        if (userAnswers) {
          log.debug({ requestId, answers: userAnswers }, 'AskUserQuestion answered')
          return {
            behavior: 'allow',
            updatedInput: { ...input, answers: userAnswers },
          }
        } else {
          log.debug({ requestId }, 'AskUserQuestion denied/timed out')
          return { behavior: 'deny', message: 'User did not answer the question in time' }
        }
      }

      // Guardrail enforcement
      if (agentGuardrails.length > 0) {
        const guardrailLevel = getToolPermissionLevel(toolName, agentGuardrails)

        if (guardrailLevel === 'never_allowed') {
          log.info({ toolName }, 'Guardrail denied (never_allowed)')
          return {
            behavior: 'deny',
            message: `This action is not allowed. The "${toolName}" tool is blocked by this agent's guardrails.`,
          }
        }

        if (guardrailLevel === 'ask_first') {
          if (!claudeSessionId) {
            log.debug({ toolName }, 'Guardrail ask_first but no session yet, denying')
            return { behavior: 'deny', message: 'Session not ready for permission requests.' }
          }

          if (!permissionManager.getSession(claudeSessionId)) {
            permissionManager.registerSession(
              claudeSessionId,
              res,
              userId,
              request.workspaceId || 'unknown',
            )
          }

          const guardrailRequestId = permissionManager.generateRequestId()
          log.info(
            { toolName, requestId: guardrailRequestId },
            'Guardrail ask_first - sending permission request',
          )

          sendEvent(res, {
            type: 'permission_request',
            requestId: guardrailRequestId,
            sessionId: claudeSessionId,
            toolName,
            parameters: input,
            riskLevel: 'medium',
            riskDisplay: 'Guardrail: Approval Required',
            description: `This agent's guardrails require approval before using "${toolName}".`,
            factors: ['Agent guardrail: ask_first'],
            timestamp: new Date().toISOString(),
          })

          const guardrailDecision = await new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => {
              sendEvent(res, {
                type: 'permission_timeout',
                requestId: guardrailRequestId,
                message: 'Guardrail permission request timed out after 60 seconds',
                timestamp: new Date().toISOString(),
              })
              permissionManager.resolvePendingRequest(claudeSessionId!, guardrailRequestId, false)
            }, 60000)

            permissionManager.addPendingRequest(
              claudeSessionId!,
              guardrailRequestId,
              resolve,
              timeout,
              toolName,
            )
          })

          if (guardrailDecision) {
            return { behavior: 'allow', updatedInput: input }
          } else {
            return { behavior: 'deny', message: 'User denied permission' }
          }
        }

        if (guardrailLevel === 'always_allowed') {
          const safetyCheck = assessRiskLevel(toolName, input)
          if (safetyCheck.autoDeny) {
            return { behavior: 'deny', message: `Blocked: ${safetyCheck.factors.join(', ')}` }
          }
          return { behavior: 'allow', updatedInput: input }
        }
      }

      if (!request.requirePermissions) {
        return { behavior: 'allow', updatedInput: input }
      }

      const assessment = assessRiskLevel(toolName, input)
      log.debug(
        { toolName, riskLevel: assessment.level, autoApprove: assessment.autoApprove },
        'canUseTool assessment',
      )

      if (assessment.autoDeny) {
        return { behavior: 'deny', message: `Blocked: ${assessment.factors.join(', ')}` }
      }

      if (assessment.autoApprove) {
        return { behavior: 'allow', updatedInput: input }
      }

      if (!claudeSessionId) {
        log.debug({ toolName }, 'No session ID yet, auto-approving')
        return { behavior: 'allow', updatedInput: input }
      }

      const requestId = permissionManager.generateRequestId()

      if (!permissionManager.getSession(claudeSessionId)) {
        permissionManager.registerSession(
          claudeSessionId,
          res,
          userId,
          request.workspaceId || 'unknown',
        )
      }

      sendEvent(res, {
        type: 'permission_request',
        requestId,
        sessionId: claudeSessionId,
        toolName,
        parameters: input,
        riskLevel: assessment.level,
        riskDisplay: formatRiskLevel(assessment.level),
        description: assessment.description,
        factors: assessment.factors,
        timestamp: new Date().toISOString(),
      })

      const timeoutMs = getTimeoutForRiskLevel(assessment.level)
      const userDecision = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          sendEvent(res, {
            type: 'permission_timeout',
            requestId,
            message: `Permission request timed out after ${timeoutMs / 1000} seconds`,
            timestamp: new Date().toISOString(),
          })
          permissionManager.resolvePendingRequest(claudeSessionId!, requestId, false)
        }, timeoutMs)

        permissionManager.addPendingRequest(claudeSessionId!, requestId, resolve, timeout, toolName)
      })

      if (userDecision) {
        return { behavior: 'allow', updatedInput: input }
      } else {
        return { behavior: 'deny', message: 'User denied permission' }
      }
    }

    if (request.resumeSessionId) {
      const transcriptPath = await resolveClaudeSessionJsonlPath(
        request.workspaceId ?? '',
        request.resumeSessionId,
      )
      const exists = await fs
        .access(transcriptPath)
        .then(() => true)
        .catch(() => false)
      if (exists) {
        sdkOptions.resume = request.resumeSessionId
        log.debug(
          { resume: request.resumeSessionId, cwd: workingDirectory },
          'Resuming session with options',
        )
      } else {
        log.warn(
          { resumeSessionId: request.resumeSessionId, transcriptPath },
          'Resume transcript missing — starting fresh session',
        )
      }
    }

    if (request.temperature !== undefined) {
      sdkOptions.temperature = request.temperature
    }

    log.debug(
      {
        model: sdkOptions.model,
        cwd: sdkOptions.cwd,
        permissionMode: sdkOptions.permissionMode,
        canUseTool: sdkOptions.canUseTool ? 'SET' : 'NOT SET',
        mcpServers: Object.keys(sdkOptions.mcpServers || {}),
        additionalDirectories: sdkOptions.additionalDirectories,
        resume: sdkOptions.resume || 'NEW SESSION',
        temperature: sdkOptions.temperature,
      },
      'Claude Code SDK options',
    )

    for (const [name, config] of Object.entries(sdkOptions.mcpServers || {})) {
      const cfg = config as any
      if (cfg.type !== 'sdk') {
        log.info(
          {
            serverName: name,
            fullConfig: JSON.stringify(config),
          },
          'MCP server config detail',
        )
      }
    }

    // Per-request context for in-process tool servers. Wrapping the query loop in
    // runInExecutionContext (instead of mutating process.env) keeps concurrent chat
    // requests from clobbering each other's agent/workspace context mid-tool-call.
    const chatExecutionContext = {
      agentId: request.agentId || 'lazarus-chat',
      workspaceId: request.workspaceId || '',
      userId,
      workspacePath: workingDirectory,
      browserExecutionTs: Date.now().toString(),
    }

    let assistantResponse = ''
    const toolsUsed: string[] = []
    let currentText = ''
    let capturedClaudeSession = false

    const HEARTBEAT_INTERVAL_MS = 30000
    let lastEventTime = Date.now()
    heartbeatInterval = setInterval(() => {
      const now = Date.now()
      const timeSinceLastEvent = now - lastEventTime

      if (timeSinceLastEvent > 25000) {
        sendEvent(res, {
          type: 'status',
          content: 'Processing...',
          metadata: { heartbeat: true, elapsed: Math.floor(timeSinceLastEvent / 1000) },
          timestamp: new Date().toISOString(),
        })
        lastEventTime = now
        log.debug('Sent heartbeat to prevent ALB timeout')
      }
    }, HEARTBEAT_INTERVAL_MS)

    res.on('close', () => {
      if (!res.writableEnded && abortController) {
        log.info('Client disconnected, aborting query')
        abortController.abort()
      }
      mcpProcessTracker.cleanup(chatSessionTag)
    })

    const streamInput = (async function* (): AsyncGenerator<SDKUserMessage> {
      yield {
        type: 'user',
        message: { role: 'user', content: fullPrompt },
        parent_tool_use_id: null,
        session_id: uuidv4() as UUID,
      }
    })()

    await runInExecutionContext(chatExecutionContext, async () => {
      const runtime = getAgentRuntime()
      for await (const message of runtime.run({
        prompt: streamInput,
        context: chatExecutionContext.workspaceId
          ? {
              workspaceId: chatExecutionContext.workspaceId,
              agentId: chatExecutionContext.agentId,
              sessionId: request.resumeSessionId ?? null,
              runtime: 'claude-sdk',
              triggeredBy: 'user',
              platformSource: 'chat',
              title: request.message?.slice(0, 80) ?? null,
              userPrompt: request.message ?? null,
            }
          : undefined,
        options: sdkOptions,
      })) {
        log.debug(
          {
            type: message.type,
            hasContent: !!(message as any).content,
            contentType: typeof (message as any).content,
            isArray: Array.isArray((message as any).content),
          },
          'Message received',
        )

        if (message.type === 'system') {
          log.debug(
            {
              subtype: (message as any).subtype,
              session_id: (message as any).session_id,
              capturedClaudeSession,
            },
            'System message detected',
          )
        }

        if (
          message.type === 'system' &&
          (message as any).subtype === 'init' &&
          !capturedClaudeSession
        ) {
          claudeSessionId = (message as any).session_id
          capturedClaudeSession = true

          log.info(
            { sessionId: claudeSessionId, isResuming: !!request.resumeSessionId },
            'Captured Claude SDK session',
          )

          const initMsg = message as any
          const mcpServers = initMsg.mcp_servers || []
          const tools = initMsg.tools || []

          const skills = initMsg.skills || []
          log.info(
            {
              toolCount: tools.length,
              allTools: tools,
              skillCount: skills.length,
              skills: skills,
              mcpServerStatus: mcpServers.map((s: any) => ({ name: s.name, status: s.status })),
            },
            'SDK init status (tools, skills, MCP)',
          )

          const failedServers = mcpServers.filter((s: any) => s.status !== 'connected')
          if (failedServers.length > 0) {
            sendEvent(res, {
              type: 'status',
              content: `MCP servers failed to initialize: ${failedServers.map((s: any) => `${s.name} (${s.status})`).join(', ')}`,
              metadata: {
                mcpServers: mcpServers,
                failedServers: failedServers,
                availableTools: tools,
              },
              timestamp: new Date().toISOString(),
            })
          }

          try {
            let metaConversationId: string
            let isNewConversation = true

            if (request.resumeSessionId) {
              if (!request.workspaceId) {
                throw new Error('Workspace ID is required for conversation management')
              }

              let existing = await conversationMetadata.findBySessionId(
                claudeSessionId!,
                userId,
                request.workspaceId,
              )

              if (!existing && claudeSessionId !== request.resumeSessionId) {
                // SDK rotated session_id on resume — locate the original conversation
                // by the requested sessionId and migrate it to the new SDK sessionId.
                const original = await conversationMetadata.findBySessionId(
                  request.resumeSessionId,
                  userId,
                  request.workspaceId,
                )
                if (original) {
                  await conversationMetadata.updateSessionId(
                    original.id,
                    claudeSessionId!,
                    userId,
                    request.workspaceId,
                  )
                  existing = { ...original, sessionId: claudeSessionId! }
                  log.info(
                    {
                      conversationId: existing.id,
                      oldSessionId: request.resumeSessionId,
                      newSessionId: claudeSessionId,
                    },
                    'Migrated conversation to new SDK session_id',
                  )
                }
              }

              if (existing) {
                metaConversationId = existing.id
                isNewConversation = false
                log.info({ conversationId: metaConversationId }, 'Resuming existing conversation')
              } else {
                log.debug(
                  { sessionId: claudeSessionId },
                  'Resume requested but no existing conversation found',
                )
              }
            }

            if (isNewConversation) {
              const title =
                request.message.length > 50
                  ? request.message.substring(0, 47) + '...'
                  : request.message || 'New Conversation'

              if (!request.workspaceId) {
                throw new Error('Workspace ID is required for conversation management')
              }

              metaConversationId = await conversationMetadata.linkSessionToConversation({
                sessionId: claudeSessionId!,
                workspaceId: request.workspaceId,
                userId,
                agentId: request.agentId || null,
                agentName,
                title,
                messageCount: 1,
              })

              log.info({ conversationId: metaConversationId }, 'Created new conversation')
            }

            sendEvent(res, {
              type: 'conversation_info',
              content: isNewConversation ? 'Conversation created' : 'Conversation resumed',
              metadata: {
                conversationId: metaConversationId!,
                sessionId: claudeSessionId,
                isResume: !isNewConversation,
              },
              timestamp: new Date().toISOString(),
            })
          } catch (error) {
            log.error({ err: error }, 'Failed to link conversation')
          }

          // Resume existing activity log (if any) so we can continue the conversation title.
          // All new activity data is persisted by the OTel span processor to agent_runs/agent_spans.
          try {
            if (request.resumeSessionId && request.workspaceId) {
              const existingLog = await getActivityService().findActivityLogBySessionId(
                request.workspaceId,
                claudeSessionId!,
              )
              if (existingLog) {
                activityLogId = existingLog.id
                conversationTitle = existingLog.conversationTitle || existingLog.title
              }
            }
            if (!conversationTitle) {
              conversationTitle = await generateConversationTitle(request.message, 'chat', {
                userName: userId,
              })
            }
          } catch (activityError) {
            log.error({ err: activityError }, 'Failed to resolve activity log for session')
          }

          sendEvent(res, {
            type: 'context',
            content: 'Session initialized',
            metadata: {
              sessionId: claudeSessionId,
            },
            timestamp: new Date().toISOString(),
          })
        }

        if (message.type === 'assistant') {
          const fullMsg = message as any
          const content = (message as any).content || fullMsg.message?.content

          if (content) {
            if (Array.isArray(content)) {
              for (const block of content) {
                if (block.type === 'text') {
                  const text = block.text || ''

                  if (text) {
                    sendEvent(res, {
                      type: 'assistant',
                      content: text,
                      metadata: { partial: request.streamResponse },
                      timestamp: new Date().toISOString(),
                    })
                    currentText += text
                    assistantResponse += text
                  }
                } else if (block.type === 'tool_use') {
                  const toolEvent: ChatEvent = {
                    type: 'tool_use',
                    content: `Calling tool: ${block.name}`,
                    tool: {
                      name: block.name,
                      parameters: block.input || {},
                    },
                    metadata: { toolId: block.id },
                    timestamp: new Date().toISOString(),
                  }
                  sendEvent(res, toolEvent)
                  toolsUsed.push(block.name)

                  if (currentText) {
                    currentText = ''
                  }
                }
              }
            } else if (typeof content === 'string') {
              const text = content
              if (text) {
                sendEvent(res, {
                  type: 'assistant',
                  content: text,
                  metadata: { partial: request.streamResponse },
                  timestamp: new Date().toISOString(),
                })
                assistantResponse += text
              }
            }
          }
        } else if ((message as any).type === 'tool_result') {
          const msg = message as any
          const resultContent =
            typeof msg.output === 'string' ? msg.output : JSON.stringify(msg.output, null, 2)

          if (resultContent.length > 500 && request.streamResponse) {
            sendEvent(res, {
              type: 'tool_result',
              content: `[Tool Result - ${resultContent.length} bytes]`,
              metadata: {
                toolId: msg.tool_use_id,
                isPartial: true,
                totalLength: resultContent.length,
              },
              timestamp: new Date().toISOString(),
            })

            const chunkSize = 500
            for (let i = 0; i < resultContent.length; i += chunkSize) {
              const chunk = resultContent.slice(i, Math.min(i + chunkSize, resultContent.length))
              sendEvent(res, {
                type: 'tool_result',
                content: chunk,
                metadata: {
                  partial: true,
                  offset: i,
                  toolId: msg.tool_use_id,
                },
                timestamp: new Date().toISOString(),
              })
            }
          } else {
            sendEvent(res, {
              type: 'tool_result',
              content: resultContent,
              metadata: { toolId: msg.tool_use_id },
              timestamp: new Date().toISOString(),
            })
          }
        } else if (message.type === 'user') {
          const userMsg = message as any
          const content = userMsg.content || userMsg.message?.content

          if (content) {
            if (Array.isArray(content)) {
              for (const block of content) {
                if (block.type === 'tool_result') {
                  sendEvent(res, {
                    type: 'tool_result',
                    content: block.content || JSON.stringify(block.output),
                    tool: {
                      name: 'Unknown',
                      parameters: block.input ?? {},
                      result: block.output,
                    },
                    metadata: {
                      toolId: block.tool_use_id,
                      isError: block.is_error || false,
                    },
                    timestamp: new Date().toISOString(),
                  })
                } else if (block.type === 'text') {
                  sendEvent(res, {
                    type: 'user',
                    content: block.text,
                    timestamp: new Date().toISOString(),
                  })
                }
              }
            } else if (typeof content === 'string' && content) {
              sendEvent(res, {
                type: 'user',
                content: content,
                timestamp: new Date().toISOString(),
              })
            }
          }
        } else if ((message as any).type === 'error') {
          const errorMsg = message as any
          sendEvent(res, {
            type: 'error',
            content: errorMsg.error || 'An error occurred',
            metadata: { code: errorMsg.code },
            timestamp: new Date().toISOString(),
          })
        } else if (message.type === 'result') {
          const resultMsg = message as any

          if (resultMsg.result && typeof resultMsg.result === 'string' && !assistantResponse) {
            assistantResponse = resultMsg.result
            sendEvent(res, {
              type: 'assistant',
              content: assistantResponse,
              timestamp: new Date().toISOString(),
            })
          }

          // Activity persistence owned by the OTel span processor (agent_runs/agent_spans).
          sendEvent(res, {
            type: 'done',
            content: 'Processing complete',
            metadata: {
              usage: message.usage,
              totalCost: message.usage?.totalCostUsd,
            },
            timestamp: new Date().toISOString(),
          })
          break
        } else if ((message as any).type === 'tool') {
          const toolMsg = message as any
          sendEvent(res, {
            type: 'tool_use',
            content: `Using tool: ${toolMsg.name || 'unknown'}`,
            tool: {
              name: toolMsg.name,
              parameters: toolMsg.input || toolMsg.parameters || {},
            },
            metadata: {
              toolId: toolMsg.id,
              raw: toolMsg,
            },
            timestamp: new Date().toISOString(),
          })
          if (toolMsg.name) {
            toolsUsed.push(toolMsg.name)
          }
        } else {
          const msg = message as any
          if (msg.type !== 'system') {
            if (msg.tool || msg.tool_name || msg.function) {
              sendEvent(res, {
                type: 'tool_use',
                content: `Tool activity detected`,
                metadata: {
                  raw: msg,
                  possibleTool: true,
                },
                timestamp: new Date().toISOString(),
              })
            } else {
              sendEvent(res, {
                type: msg.type || 'unknown',
                content: JSON.stringify(message),
                metadata: { raw: true },
                timestamp: new Date().toISOString(),
              })
            }
          }
        }
      }
    })

    if (claudeSessionId && request.workspaceId) {
      await conversationMetadata.incrementMessageCount(claudeSessionId, request.workspaceId, userId)
    }

    // Distill this conversation into memory via the librarian (fire-and-forget).
    // Uses the full activity log (user + assistant + tool calls + thinking) rather
    // than just raw req/response, so the librarian can distill context-rich events.
    if (claudeSessionId && request.workspaceId && activityLogId) {
      try {
        const activityService = getActivityService()
        const fullLog = await activityService.getActivityLog(request.workspaceId, activityLogId)
        const messages = fullLog?.conversation || []
        if (conversationHasSubstance(messages)) {
          const transcript = formatTranscript(messages)
          librarianProcessor.analyzeConversation({
            workspaceId: request.workspaceId,
            agentId: request.agentId || 'lazarus',
            userId,
            conversationId: claudeSessionId,
            transcript,
          })
        }
      } catch (err) {
        log.warn({ err, claudeSessionId }, 'Failed to enqueue librarian from chat')
      }
    }

    sendEvent(res, {
      type: 'done',
      content: 'Chat completed',
      metadata: {
        toolsUsed,
        responseLength: assistantResponse.length,
      },
      timestamp: new Date().toISOString(),
    })

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error: any) {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
    }

    const isAborted =
      error?.name === 'AbortError' ||
      error?.message?.includes('aborted') ||
      abortController?.signal.aborted

    if (isAborted) {
      log.info('Query aborted by user - conversation can be resumed')
      mcpProcessTracker.cleanup(chatSessionTag)
      return
    }

    if (claudeSessionId) {
      permissionManager.cleanupSession(claudeSessionId)
    }

    // Failure is marked on the agent.run span by RuntimeTracer; no local side-channel writes.
    throw error
  } finally {
    mcpProcessTracker.cleanup(chatSessionTag)

    res.on('close', () => {
      if (claudeSessionId) {
        permissionManager.cleanupSession(claudeSessionId)
      }
    })
  }
}

class ChatController {
  async stream(req: Request, res: Response) {
    try {
      if (memoryPressureMonitor.isUnderPressure()) {
        res.setHeader('Retry-After', '30')
        throw new ServiceUnavailableError(
          'The system is briefly under high load. Please retry in ~30 seconds.',
        )
      }

      const userId = req.user!.id
      const request = req.body

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
      })

      await processChat(request, userId, res)
    } catch (error) {
      log.error({ err: error }, 'Chat error')
      if (!res.headersSent) {
        if (error instanceof ApiError) throw error
        throw new BadRequestError(error instanceof Error ? error.message : 'Chat failed')
      } else {
        sendEvent(res, {
          type: 'error',
          content: error instanceof Error ? error.message : 'Chat failed',
          metadata: {
            code: 'CHAT_ERROR',
            details: error instanceof Error ? error.stack : undefined,
          },
          timestamp: new Date().toISOString(),
        })
        sendEvent(res, {
          type: 'done',
          content: 'Chat failed',
          metadata: { error: true },
          timestamp: new Date().toISOString(),
        })
        res.write('data: [DONE]\n\n')
        res.end()
      }
    }
  }

  async query(req: Request, res: Response) {
    try {
      if (memoryPressureMonitor.isUnderPressure()) {
        res.setHeader('Retry-After', '30')
        throw new ServiceUnavailableError(
          'The system is briefly under high load. Please retry in ~30 seconds.',
        )
      }

      const userId = req.user!.id

      const request = ChatRequestSchema.parse({ ...req.body, streamResponse: false })
      const events: ChatEvent[] = []

      const mockRes = {
        write: (data: string) => {
          if (data.startsWith('data: ') && !data.includes('[DONE]')) {
            try {
              const event = JSON.parse(data.substring(6).trim())
              events.push(event)
            } catch (err) {
              log.debug({ err }, 'Ignore parse errors')
            }
          }
        },
        writeHead: () => {},
        end: () => {},
      } as any

      await processChat(request, userId, mockRes)

      const response = {
        events,
        summary: events
          .filter((e) => e.type === 'assistant' && e.content)
          .map((e) => e.content)
          .join('\n'),
        toolsUsed: events
          .filter((e) => e.type === 'tool_use')
          .map((e) => e.tool?.name)
          .filter(Boolean),
        timestamp: new Date().toISOString(),
      }

      res.json(response)
    } catch (error) {
      log.error({ err: error }, 'Chat error')
      if (error instanceof ApiError) throw error
      throw new BadRequestError(error instanceof Error ? error.message : 'Chat failed')
    }
  }

  async internalPermissionRequest(req: Request, res: Response) {
    try {
      const { sessionId, toolName, parameters, toolUseId } = req.body

      const session = permissionManager.getSession(sessionId)
      if (!session) {
        log.error({ sessionId }, 'Permission session not found')
        throw new NotFoundError('Permission session', sessionId)
      }

      const requestId = permissionManager.generateRequestId()

      const assessment = assessRiskLevel(toolName, parameters)
      log.debug(
        {
          toolName,
          riskLevel: assessment.level,
          autoApprove: assessment.autoApprove,
          autoDeny: assessment.autoDeny,
        },
        'Permission assessment',
      )

      if (assessment.autoDeny) {
        res.json({
          approved: false,
          reason: `Blocked: ${assessment.factors.join(', ')}`,
        })
        return
      }

      const forceAllPermissions = process.env.FORCE_ALL_PERMISSIONS === 'true'
      if (assessment.autoApprove && !forceAllPermissions) {
        res.json({
          approved: true,
          reason: 'Low-risk operation auto-approved',
        })
        return
      }

      sendEvent(session.res, {
        type: 'permission_request',
        requestId,
        sessionId,
        toolName,
        parameters,
        toolUseId,
        riskLevel: assessment.level,
        riskDisplay: formatRiskLevel(assessment.level),
        description: assessment.description,
        factors: assessment.factors,
        timestamp: new Date().toISOString(),
      })

      const timeoutMs = getTimeoutForRiskLevel(assessment.level)
      const userDecision = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          sendEvent(session.res, {
            type: 'permission_timeout',
            requestId,
            message: `Permission request timed out after ${timeoutMs / 1000} seconds`,
            timestamp: new Date().toISOString(),
          })

          permissionManager.resolvePendingRequest(sessionId, requestId, false)
        }, timeoutMs)

        permissionManager.addPendingRequest(sessionId, requestId, resolve, timeout, toolName)
      })

      res.json({
        approved: userDecision,
        reason: userDecision ? 'User approved operation' : 'User denied operation',
        requestId,
      })
    } catch (error) {
      log.error({ err: error }, 'Permission internal request error')
      if (error instanceof ApiError) throw error
      throw new InternalServerError(
        `Permission system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async permissionResponse(req: Request, res: Response) {
    try {
      const { sessionId, requestId, approved, reason } = req.body

      if (!sessionId || !requestId || approved === undefined) {
        throw new BadRequestError('Missing required fields (sessionId, requestId, approved)')
      }

      const session = permissionManager.getSession(sessionId)
      if (!session) {
        throw new NotFoundError('Session', sessionId)
      }

      sendEvent(session.res, {
        type: 'permission_resolved',
        requestId,
        approved,
        reason,
        timestamp: new Date().toISOString(),
      })

      const resolved = permissionManager.resolvePendingRequest(sessionId, requestId, approved)

      if (!resolved) {
        throw new NotFoundError('Permission request')
      }

      res.json({
        success: true,
        message: `Permission ${approved ? 'granted' : 'denied'}`,
        sessionId,
        requestId,
        approved,
        reason,
      })
    } catch (error) {
      log.error({ err: error }, 'Permission response error')
      if (error instanceof ApiError) throw error
      throw new BadRequestError(
        error instanceof Error ? error.message : 'Failed to process permission',
      )
    }
  }

  async askUserResponse(req: Request, res: Response) {
    try {
      const { sessionId, requestId, answers } = req.body

      if (!sessionId || !requestId || !answers) {
        throw new BadRequestError('Missing required fields (sessionId, requestId, answers)')
      }

      const session = permissionManager.getSession(sessionId)
      if (!session) {
        throw new NotFoundError('Session', sessionId)
      }

      sendEvent(session.res, {
        type: 'ask_user_question_resolved',
        requestId,
        metadata: { answers },
        timestamp: new Date().toISOString(),
      } as any)

      const resolved = permissionManager.resolveAskUserRequest(sessionId, requestId, answers)

      if (!resolved) {
        throw new NotFoundError('Ask-user request')
      }

      res.json({
        success: true,
        message: 'User response received',
        sessionId,
        requestId,
      })
    } catch (error) {
      log.error({ err: error }, 'Ask-user response error')
      if (error instanceof ApiError) throw error
      throw new BadRequestError(
        error instanceof Error ? error.message : 'Failed to process response',
      )
    }
  }
}

export const chatController = new ChatController()
