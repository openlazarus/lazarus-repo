import { Request, Response } from 'express'
import { verifyKey } from 'discord-interactions'
import { discordService } from '@domains/discord/service/discord.service'
import { executionAbortRegistry } from '@domains/agent/service/execution-abort-registry'
import { executionCache } from '@realtime'
import { UnauthorizedError, BadRequestError } from '@errors/api-errors'
import { createLogger } from '@utils/logger'
const log = createLogger('discord-webhook')

const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
  MODAL_SUBMIT: 5,
} as const

const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
  MODAL: 9,
} as const

const DISCORD_INTERACTION_HANDLERS: Record<
  number,
  (req: Request, res: Response) => Promise<Response>
> = {
  [InteractionType.PING]: async (_req, res) => res.json({ type: InteractionResponseType.PONG }),

  [InteractionType.APPLICATION_COMMAND]: async (req, res) => {
    const interaction = req.body
    const { data, guild_id, channel_id, member, user } = interaction
    return handleSlashCommand(req, res, {
      commandName: data.name,
      options: data.options || [],
      guildId: guild_id,
      channelId: channel_id,
      userId: member?.user?.id || user?.id,
      userName: member?.user?.username || user?.username,
    })
  },

  [InteractionType.MESSAGE_COMPONENT]: async (req, res) => {
    const interaction = req.body
    const { data, guild_id, channel_id, member, user } = interaction
    return handleComponent(req, res, {
      customId: data.custom_id,
      componentType: data.component_type,
      guildId: guild_id,
      channelId: channel_id,
      userId: member?.user?.id || user?.id,
    })
  },

  [InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE]: async (req, res) => {
    const interaction = req.body
    const { data, guild_id } = interaction
    return handleAutocomplete(req, res, {
      commandName: data.name,
      focusedOption: data.options?.find((o: any) => o.focused),
      guildId: guild_id,
    })
  },
}

async function verifyDiscordRequest(req: Request): Promise<boolean> {
  const signature = req.headers['x-signature-ed25519'] as string
  const timestamp = req.headers['x-signature-timestamp'] as string
  const publicKey = process.env.DISCORD_PUBLIC_KEY

  if (!signature || !timestamp || !publicKey) {
    return false
  }

  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)

  try {
    return await verifyKey(rawBody, signature, timestamp, publicKey)
  } catch (error) {
    log.error({ err: error }, 'Signature verification error')
    return false
  }
}

type SlashCommandContext = {
  commandName: string
  options: any[]
  guildId: string
  channelId: string
  userId: string
  userName: string
}

const DISCORD_SLASH_COMMAND_HANDLERS: Record<
  string,
  (req: Request, res: Response, context: SlashCommandContext) => Promise<Response>
> = {
  lazarus: async (req, res, context) => {
    const { options, guildId, channelId, userId, userName } = context
    const message = options.find((o: any) => o.name === 'message')?.value

    if (!message) {
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Please provide a message.',
          flags: 64,
        },
      })
    }

    res.json({
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    })

    processSlashCommandMessage({
      guildId,
      channelId,
      userId,
      userName,
      message,
      interactionToken: req.body.token,
      applicationId: req.body.application_id,
    }).catch((error) => {
      log.error({ err: error }, 'Error processing slash command')
    })

    return res
  },

  'lazarus-status': async (_req, res, context) => {
    const { guildId } = context
    const connection = await discordService.getConnectionByGuild(guildId)

    if (connection) {
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content:
            `**Lazarus Status**\n\n` +
            `Connected: Yes\n` +
            `Workspace: ${connection.workspaceId}\n` +
            `Agent: ${connection.agentId || 'lazarus'}\n` +
            `Enabled: ${connection.enabled ? 'Yes' : 'No'}`,
          flags: 64,
        },
      })
    }
    return res.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content:
          'Lazarus is not connected to this server. Please ask an admin to set up the integration.',
        flags: 64,
      },
    })
  },

  'lazarus-agent': async (_req, res, context) => {
    const { options, guildId } = context
    const agentId = options.find((o: any) => o.name === 'agent')?.value

    if (!agentId) {
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Please specify an agent ID.',
          flags: 64,
        },
      })
    }

    const connection = await discordService.getConnectionByGuild(guildId)
    if (!connection) {
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Lazarus is not connected to this server.',
          flags: 64,
        },
      })
    }

    await discordService.updateConnection(connection.id, { agentId })

    return res.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Switched to agent: ${agentId}`,
        flags: 64,
      },
    })
  },
}

async function handleSlashCommand(
  req: Request,
  res: Response,
  context: SlashCommandContext,
): Promise<Response> {
  const { commandName, userName } = context

  log.info(`Slash command: /${commandName} from ${userName}`)

  const commandHandler = DISCORD_SLASH_COMMAND_HANDLERS[commandName]
  if (commandHandler) {
    return commandHandler(req, res, context)
  }

  return res.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `Unknown command: ${commandName}`,
      flags: 64,
    },
  })
}

type ComponentHandler = (
  req: Request,
  res: Response,
  params: string[],
  context: {
    customId: string
    componentType: number
    guildId: string
    channelId: string
    userId: string
  },
) => Promise<Response>

const componentHandlers: Record<string, ComponentHandler> = {
  confirm: async (_req, res) =>
    res.json({
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: { content: 'Confirmed!', components: [] },
    }),

  cancel: async (_req, res) =>
    res.json({
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: { content: 'Cancelled.', components: [] },
    }),

  stop_execution: async (_req, res, params, context) => {
    const executionId = params[0]
    if (!executionId) {
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: 'Invalid stop request.', flags: 64 },
      })
    }

    const execCtx = discordService.executionContexts.get(executionId)
    if (execCtx && execCtx.userId !== context.userId) {
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: 'Only the user who triggered this task can stop it.', flags: 64 },
      })
    }

    const execution = executionCache.get(executionId)
    if (!execution || execution.status !== 'running') {
      return res.json({
        type: InteractionResponseType.UPDATE_MESSAGE,
        data: { content: 'Task already finished.', components: [] },
      })
    }

    executionAbortRegistry.abort(executionId, 'Cancelled via Discord')
    executionCache.cancel(executionId, 'Cancelled via Discord')
    discordService.executionContexts.delete(executionId)

    return res.json({
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: { components: [] },
    })
  },
}

async function handleComponent(
  req: Request,
  res: Response,
  context: {
    customId: string
    componentType: number
    guildId: string
    channelId: string
    userId: string
  },
): Promise<Response> {
  log.info(`Component interaction: ${context.customId}`)

  const parts = context.customId.split(':')
  const action = parts[0]!
  const params = parts.slice(1)
  const handler = componentHandlers[action]

  if (handler) {
    return handler(req, res, params, context)
  }

  return res.json({ type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE })
}

async function handleAutocomplete(
  _req: Request,
  res: Response,
  context: {
    commandName: string
    focusedOption: any
    guildId: string
  },
): Promise<Response> {
  log.info(`Autocomplete for: ${context.commandName}`)

  return res.json({
    type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
    data: {
      choices: [],
    },
  })
}

async function processSlashCommandMessage(params: {
  guildId: string
  channelId: string
  userId: string
  userName: string
  message: string
  interactionToken: string
  applicationId: string
}): Promise<void> {
  const { guildId, channelId, userId, userName, message, interactionToken, applicationId } = params

  const connection = await discordService.getConnectionByGuild(guildId)
  if (!connection) {
    await sendFollowUp(applicationId, interactionToken, {
      content: 'Lazarus is not connected to this server.',
    })
    return
  }

  try {
    const sendResponse = async (content: string): Promise<void> => {
      await sendFollowUp(applicationId, interactionToken, { content })
    }

    await discordService.processMessage(
      {
        messageId: `slash_${Date.now()}`,
        guildId,
        channelId,
        authorId: userId,
        authorName: userName,
        content: message,
        mentionedBot: true,
        isDM: false,
        attachments: [],
      },
      sendResponse,
    )
  } catch (error) {
    log.error({ err: error }, 'Error processing slash command message')
    await sendFollowUp(applicationId, interactionToken, {
      content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
}

async function sendFollowUp(
  applicationId: string,
  token: string,
  data: { content: string; flags?: number },
): Promise<void> {
  try {
    const response = await fetch(`https://discord.com/api/v10/webhooks/${applicationId}/${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      log.error({ err: await response.text() }, 'Failed to send follow-up')
    }
  } catch (error) {
    log.error({ err: error }, 'Error sending follow-up')
  }
}

async function postDiscordMessage(
  channelId: string,
  content: string,
  replyTo?: string,
): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) {
    log.warn('DISCORD_BOT_TOKEN not configured — cannot reply')
    return
  }
  try {
    const body: Record<string, unknown> = { content }
    if (replyTo) body.message_reference = { message_id: replyTo, fail_if_not_exists: false }
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bot ${token}` },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      log.error({ status: response.status, body: await response.text() }, 'discord reply failed')
    }
  } catch (error) {
    log.error({ err: error }, 'Error posting discord reply via REST')
  }
}

async function dispatchInteraction(req: Request, res: Response): Promise<Response | void> {
  const interaction = req.body
  const { type } = interaction
  log.info(`Received interaction type: ${type}`)
  try {
    const interactionHandler = DISCORD_INTERACTION_HANDLERS[type]
    if (interactionHandler) return await interactionHandler(req, res)
    log.warn(`Unknown interaction type: ${type}`)
    throw new BadRequestError('Unknown interaction type')
  } catch (error) {
    log.error({ err: error }, 'Error handling interaction')
    return res.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Sorry, an error occurred while processing your request.', flags: 64 },
    })
  }
}

class DiscordWebhookController {
  async handleGatewayMessage(req: Request, res: Response) {
    const message = req.body as {
      messageId: string
      guildId: string | null
      channelId: string
      authorId: string
      authorName: string
      content: string
      mentionedBot: boolean
      isDM: boolean
      referencedMessageId?: string
      attachments?: Array<{
        id: string
        filename: string
        url: string
        size: number
        proxy_url?: string
        content_type?: string
        width?: number
        height?: number
      }>
    }
    if (!message?.messageId || !message?.channelId) {
      log.warn('Missing required fields on gateway message')
      throw new BadRequestError('Missing required fields')
    }

    res.status(202).json({ accepted: true })

    const sendResponse = async (content: string, replyTo?: string): Promise<void> => {
      await postDiscordMessage(message.channelId, content, replyTo ?? message.messageId)
    }

    discordService
      .processMessage({ ...message, attachments: message.attachments ?? [] }, sendResponse)
      .catch((error) => log.error({ err: error }, 'gateway processMessage error'))
  }

  async handleInteraction(req: Request, res: Response) {
    if (!(await verifyDiscordRequest(req))) {
      log.warn('Invalid signature')
      throw new UnauthorizedError('Invalid request signature')
    }
    return dispatchInteraction(req, res)
  }

  async handleForwardedInteraction(req: Request, res: Response) {
    return dispatchInteraction(req, res)
  }
}

export const discordWebhookController = new DiscordWebhookController()
