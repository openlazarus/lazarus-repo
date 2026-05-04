import { Request, Response } from 'express'
import { slackService } from '@domains/slack/service/slack.service'
import type { SlackMessage } from '@domains/slack/types/slack.types'
import { executionAbortRegistry } from '@domains/agent/service/execution-abort-registry'
import { executionCache } from '@realtime'
import { InternalServerError } from '@errors/api-errors'
import { createLogger } from '@utils/logger'

const log = createLogger('slack-webhook')

const SLACK_SLASH_COMMAND_HANDLERS: Record<
  string,
  (req: Request, res: Response) => Promise<Response | void>
> = {
  '/lazarus': async (_req, res) =>
    res.json({
      response_type: 'ephemeral',
      text: 'Processing your request...',
    }),

  '/lazarus-status': async (req, res) => {
    const { team_id } = req.body
    const connection = await slackService.getConnectionByTeam(team_id)
    if (connection) {
      return res.json({
        response_type: 'ephemeral',
        text:
          `*Lazarus Status*\n\n` +
          `Connected: Yes\n` +
          `Workspace: ${connection.workspaceId}\n` +
          `Agent: ${connection.agentId || 'lazarus'}\n` +
          `Enabled: ${connection.enabled ? 'Yes' : 'No'}`,
      })
    }
    return res.json({
      response_type: 'ephemeral',
      text: 'Lazarus is not connected to this workspace. Please ask an admin to set up the integration.',
    })
  },
}

const SLACK_INTERACTIVITY_TYPE_HANDLERS: Record<
  string,
  (payload: any, res: Response) => Promise<Response | void>
> = {
  block_actions: async (payload, res) => {
    const { actions, user, channel, team, response_url } = payload
    await handleBlockAction(actions?.[0], {
      userId: user?.id,
      channelId: channel?.id,
      teamId: team?.id,
      responseUrl: response_url,
    })
    return res.status(200).send()
  },

  view_submission: async (_payload, res) =>
    res.json({
      response_action: 'clear',
    }),

  shortcut: async (_payload, res) => res.status(200).send(),

  message_action: async (_payload, res) => res.status(200).send(),
}

const SLACK_EVENT_TYPE_HANDLERS: Record<string, (event: any, teamId: string) => Promise<void>> = {
  app_mention: async (event, teamId) => {
    await handleAppMention(event, teamId)
  },

  message: async (event, teamId) => {
    if (event.channel_type === 'im' && !event.bot_id && !event.subtype) {
      await handleDirectMessage(event, teamId)
    }
  },

  app_home_opened: async (event, _teamId) => {
    log.info({ user: event.user }, 'App home opened')
  },
}

async function handleSlackEvent(event: any, teamId: string, _eventId: string): Promise<void> {
  const handler = SLACK_EVENT_TYPE_HANDLERS[event.type]
  if (handler) {
    await handler(event, teamId)
  } else {
    log.debug({ eventType: event.type }, 'Unhandled event type')
  }
}

async function handleAppMention(event: any, teamId: string): Promise<void> {
  log.info({ user: event.user, channel: event.channel }, 'App mention')

  const message: SlackMessage = {
    teamId,
    channelId: event.channel,
    threadTs: event.thread_ts,
    userId: event.user,
    text: cleanMentionText(event.text),
    ts: event.ts,
    isMention: true,
    isDM: false,
    files: event.files,
  }

  await slackService.processMessage(message)
}

async function handleDirectMessage(event: any, teamId: string): Promise<void> {
  log.info({ user: event.user }, 'DM received')

  const message: SlackMessage = {
    teamId,
    channelId: event.channel,
    threadTs: event.thread_ts,
    userId: event.user,
    text: event.text,
    ts: event.ts,
    isMention: false,
    isDM: true,
    files: event.files,
  }

  await slackService.processMessage(message)
}

type BlockActionHandler = (
  params: string[],
  context: { userId: string; channelId: string; teamId: string; responseUrl: string },
) => Promise<void>

const blockActionHandlers: Record<string, BlockActionHandler> = {
  confirm: async (_params, context) => {
    await sendSlackResponse(context.responseUrl, { replace_original: true, text: 'Confirmed!' })
  },

  cancel: async (_params, context) => {
    await sendSlackResponse(context.responseUrl, { replace_original: true, text: 'Cancelled.' })
  },

  stop_execution: async (params, context) => {
    const executionId = params[0]
    if (!executionId) {
      await sendSlackResponse(context.responseUrl, {
        response_type: 'ephemeral',
        text: 'Invalid stop request.',
      })
      return
    }

    const execCtx = slackService.executionContexts.get(executionId)
    if (execCtx && execCtx.userId !== context.userId) {
      await sendSlackResponse(context.responseUrl, {
        response_type: 'ephemeral',
        text: 'Only the user who triggered this task can stop it.',
      })
      return
    }

    const execution = executionCache.get(executionId)
    if (!execution || execution.status !== 'running') {
      await sendSlackResponse(context.responseUrl, {
        replace_original: true,
        text: 'Task already finished.',
        blocks: [],
      })
      return
    }

    executionAbortRegistry.abort(executionId, 'Cancelled via Slack')
    executionCache.cancel(executionId, 'Cancelled via Slack')
    slackService.executionContexts.delete(executionId)

    await sendSlackResponse(context.responseUrl, {
      replace_original: true,
      text: 'Thinking...',
      blocks: [],
    })
  },
}

async function handleBlockAction(
  action: any,
  context: {
    userId: string
    channelId: string
    teamId: string
    responseUrl: string
  },
): Promise<void> {
  if (!action) return

  const [actionType, ...params] = (action.action_id || '').split(':')

  log.info({ actionType }, 'Block action')

  const handler = blockActionHandlers[actionType]
  if (handler) {
    await handler(params, context)
  } else {
    log.debug({ actionType }, 'Unhandled action')
  }
}

async function sendSlackResponse(
  responseUrl: string,
  data: {
    text?: string
    blocks?: any[]
    replace_original?: boolean
    response_type?: 'in_channel' | 'ephemeral'
  },
): Promise<void> {
  try {
    const response = await fetch(responseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      log.error({ status: response.status }, 'Failed to send response')
    }
  } catch (error) {
    log.error({ err: error }, 'Error sending response')
  }
}

function cleanMentionText(text: string): string {
  return text.replace(/<@[A-Z0-9]+>/gi, '').trim()
}

class SlackWebhookController {
  async handleEvents(req: Request, res: Response) {
    if (req.body.type === 'url_verification') {
      log.info('URL verification challenge')
      return res.json({ challenge: req.body.challenge })
    }

    const { type, event, team_id, event_id } = req.body

    log.info({ type, eventType: event?.type }, 'Received event')

    // Acknowledge quickly (Slack expects response within 3 seconds)
    res.status(200).send()

    // Process event asynchronously (fire-and-forget after responding)
    if (type === 'event_callback') {
      handleSlackEvent(event, team_id, event_id).catch((error) => {
        log.error({ err: error }, 'Error handling event')
      })
    }

    return
  }

  async handleCommand(req: Request, res: Response) {
    const { command, user_name } = req.body

    log.info({ command, user_name }, 'Slash command')

    try {
      const commandHandler = SLACK_SLASH_COMMAND_HANDLERS[command]
      if (commandHandler) {
        return await commandHandler(req, res)
      }
      return res.json({
        response_type: 'ephemeral',
        text: `Unknown command: ${command}`,
      })
    } catch (error) {
      log.error({ err: error }, 'Error handling command')
      return res.json({
        response_type: 'ephemeral',
        text: 'Sorry, an error occurred while processing your command.',
      })
    }
  }

  async handleInteractivity(req: Request, res: Response) {
    const payload = JSON.parse(req.body.payload || '{}')
    const { type } = payload

    log.info({ type }, 'Interactive event')

    try {
      const interactivityHandler = SLACK_INTERACTIVITY_TYPE_HANDLERS[type]
      if (interactivityHandler) {
        return await interactivityHandler(payload, res)
      }
      return res.status(200).send()
    } catch (error) {
      log.error({ err: error }, 'Error handling interactive event')
      throw new InternalServerError()
    }
  }
}

export const slackWebhookController = new SlackWebhookController()
