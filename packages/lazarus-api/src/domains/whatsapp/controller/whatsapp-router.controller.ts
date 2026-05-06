import { Request, Response } from 'express'
import { kapsoService } from '@domains/whatsapp/service/kapso-service'
import { agentWhatsAppStorage } from '@domains/whatsapp/repository/agent-whatsapp-storage'
import { AgentStatusService } from '@domains/agent/service/agent-status.service'
import { AgentTriggerManager } from '@domains/agent/service/triggers/trigger-manager'
import { BackgroundPermissionManager } from '@domains/permission/service/background-permission-manager'
import * as path from 'path'
import * as fs from 'fs/promises'
import { whatsappQueue } from '@domains/whatsapp/service/whatsapp-queue.service'
import { whatsAppPhoneRepository } from '@domains/whatsapp/repository/whatsapp-phone.repository'
import { workspaceRepository } from '@domains/workspace/repository/workspace.repository'
import { audioTranscriptionService } from '@domains/whatsapp/service/audio-transcription.service'
import { creditsGuard, INSUFFICIENT_CREDITS_MESSAGE } from '@shared/services/credits-guard'
import { UnauthorizedError, InternalServerError } from '@errors/api-errors'
import { createLogger } from '@utils/logger'
const log = createLogger('whatsapp-router')

const STORAGE_BASE = process.env.STORAGE_BASE_PATH || './storage'
const agentStatusService = AgentStatusService.getInstance()
const triggerManager = new AgentTriggerManager()

type InboundWhatsAppState = {
  textContent: string | undefined
  transcription: string | undefined
  mediaInfo: any
}

type InboundWhatsAppCtx = {
  phoneNumberId: string
  agentId: string
  workspaceId: string
}

async function loadInboundMediaContent(
  message: any,
  state: InboundWhatsAppState,
  ctx: InboundWhatsAppCtx,
): Promise<void> {
  const mediaData = message[message.type]
  state.mediaInfo = {
    id: mediaData.id,
    mimeType: mediaData.mime_type,
    caption: mediaData.caption,
    filename: mediaData.filename,
  }

  try {
    const mediaBuffer = await kapsoService.downloadMedia(mediaData.id, ctx.phoneNumberId)
    const filename = mediaData.filename || `${message.type}_${Date.now()}`
    const storagePath = await agentWhatsAppStorage.saveMediaAttachment(
      ctx.agentId,
      ctx.workspaceId,
      message.id,
      filename,
      mediaBuffer,
      mediaData.mime_type,
    )
    state.mediaInfo.storagePath = storagePath
    state.mediaInfo.size = mediaBuffer.length

    if (message.type === 'audio') {
      const transcription = (await audioTranscriptionService.transcribe(mediaBuffer)) ?? undefined
      state.transcription = transcription
      if (transcription) {
        state.textContent = transcription
      }
    }
  } catch (downloadError) {
    log.error({ err: downloadError }, `Failed to download media for message ${message.id}:`)
  }
}

const WHATSAPP_INBOUND_TYPE_HANDLERS: Record<
  string,
  (message: any, state: InboundWhatsAppState, ctx: InboundWhatsAppCtx) => Promise<void>
> = {
  text: async (message, state) => {
    state.textContent = message.text?.body
  },
  image: loadInboundMediaContent,
  document: loadInboundMediaContent,
  audio: loadInboundMediaContent,
  video: loadInboundMediaContent,
  sticker: loadInboundMediaContent,
  location: async () => {},
  contacts: async () => {},
}

// Register the trigger executor with the queue
whatsappQueue.setExecutor(executeWhatsAppTriggers)

function getWorkspacePath(workspaceId: string, settings?: { path?: string } | null): string {
  if (settings?.path) {
    return settings.path
  }
  return path.join(STORAGE_BASE, 'workspaces', workspaceId)
}

async function processIncomingMessage(
  phoneNumberId: string,
  displayPhoneNumber: string,
  message: any,
  contact?: { name: string; wa_id: string },
): Promise<void> {
  log.info(`Processing WhatsApp message from ${message.from} to ${displayPhoneNumber}`)

  const phoneConfig = await whatsAppPhoneRepository.getPhoneConfigForWebhook(phoneNumberId)

  if (!phoneConfig) {
    log.error(`No agent found for phone number ID ${phoneNumberId}`)
    return
  }

  const { workspace_id: workspaceId, agent_id: agentId } = phoneConfig

  if (message.type === 'interactive' && message.interactive?.type === 'button_reply') {
    const buttonId: string = message.interactive.button_reply.id || ''
    if (buttonId.startsWith('perm_approve_') || buttonId.startsWith('perm_deny_')) {
      const approved = buttonId.startsWith('perm_approve_')
      const requestId = buttonId.replace(/^perm_(approve|deny)_/, '')
      log.info(
        `Permission button response: ${approved ? 'APPROVE' : 'DENY'} for request ${requestId}`,
      )
      BackgroundPermissionManager.getInstance().resolve(requestId, approved)
      try {
        await kapsoService.markMessageAsRead(phoneNumberId, message.id)
      } catch (err) {
        log.debug({ err, phoneNumberId, messageId: message.id }, 'Failed to mark message as read')
      }
      return
    }
  }

  if (message.type === 'text') {
    const channelKey = `whatsapp:${workspaceId}:${agentId}:${message.from}`
    const pendingPerm = BackgroundPermissionManager.getInstance().findByChannelKey(channelKey)
    if (pendingPerm) {
      const text = (message.text?.body || '').trim().toLowerCase()
      if (['yes', 'y', 'approve', 'ok'].includes(text)) {
        log.info(
          `Text permission response: APPROVE via "${text}" for request ${pendingPerm.requestId}`,
        )
        BackgroundPermissionManager.getInstance().resolveByChannelKey(channelKey, true)
        try {
          await kapsoService.markMessageAsRead(phoneNumberId, message.id)
        } catch (err) {
          log.debug({ err, phoneNumberId, messageId: message.id }, 'Failed to mark message as read')
        }
        return
      } else if (['no', 'n', 'deny', 'reject'].includes(text)) {
        log.info(
          `Text permission response: DENY via "${text}" for request ${pendingPerm.requestId}`,
        )
        BackgroundPermissionManager.getInstance().resolveByChannelKey(channelKey, false)
        try {
          await kapsoService.markMessageAsRead(phoneNumberId, message.id)
        } catch (err) {
          log.debug({ err, phoneNumberId, messageId: message.id }, 'Failed to mark message as read')
        }
        return
      }
    }
  }

  const workspace = await workspaceRepository.getWorkspaceDetails(workspaceId)

  if (!workspace) {
    log.error(`Workspace ${workspaceId} not found`)
    return
  }

  const workspacePath = getWorkspacePath(
    workspaceId,
    workspace.settings as { path?: string } | null,
  )

  // Agent config is used by downstream trigger execution; no extra lookup needed here.

  const existingMessage = await agentWhatsAppStorage.getMessage(agentId, workspaceId, message.id)
  if (existingMessage) {
    log.info(
      `DUPLICATE message ${message.id} from ${message.from} for agent ${agentId} - skipping (webhook retry)`,
    )
    return
  }

  const inboundState: InboundWhatsAppState = {
    textContent: undefined,
    transcription: undefined,
    mediaInfo: undefined,
  }
  const inboundCtx: InboundWhatsAppCtx = { phoneNumberId, agentId, workspaceId }
  const inboundHandler = WHATSAPP_INBOUND_TYPE_HANDLERS[message.type]
  if (inboundHandler) {
    await inboundHandler(message, inboundState, inboundCtx)
  }
  const { textContent, transcription, mediaInfo } = inboundState

  const savedMessage = await agentWhatsAppStorage.saveIncomingMessage(agentId, workspaceId, {
    userId: workspace.user_id,
    sender: message.from,
    senderName: contact?.name,
    recipient: displayPhoneNumber,
    timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
    type: message.type,
    textContent,
    transcription,
    media: mediaInfo
      ? {
          id: mediaInfo.id,
          mimeType: mediaInfo.mimeType,
          filename: mediaInfo.filename,
          caption: mediaInfo.caption,
          storagePath: mediaInfo.storagePath || '',
          size: mediaInfo.size,
        }
      : undefined,
    location:
      message.type === 'location'
        ? {
            latitude: message.location?.latitude,
            longitude: message.location?.longitude,
            name: message.location?.name,
            address: message.location?.address,
          }
        : undefined,
    contacts:
      message.type === 'contacts'
        ? message.contacts?.map((c: any) => ({
            name: c.name?.formatted_name,
            phones: c.phones?.map((p: any) => ({ phone: p.phone, type: p.type })),
          }))
        : undefined,
    metadata: {
      received: new Date().toISOString(),
      read: false,
      direction: 'inbound' as const,
    },
  })

  log.info(`Saved WhatsApp message ${savedMessage.id} for agent ${agentId}`)

  const activityLogId: string | undefined = undefined
  // Agent-level activity is captured by the OTel span processor when the downstream
  // WhatsApp agent.run span completes, so no initial log is created here.

  try {
    agentStatusService.broadcastToWorkspace(workspaceId, {
      type: 'whatsapp_message_received',
      agentId,
      message: {
        messageId: message.id,
        sender: message.from,
        senderName: contact?.name,
        type: message.type,
        preview: textContent?.substring(0, 100) || `[${message.type}]`,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (wsError) {
    log.error({ err: wsError }, 'Failed to broadcast WebSocket')
  }

  await whatsappQueue.enqueue({
    workspaceId,
    userId: workspace.user_id,
    agentId,
    workspacePath,
    message: savedMessage,
    activityLogId,
    phoneNumberId,
  })
}

async function executeWhatsAppTriggers(
  workspaceId: string,
  userId: string,
  agentId: string,
  workspacePath: string,
  message: any,
  activityLogId?: string,
  phoneNumberId?: string,
): Promise<void> {
  try {
    const agentPath = path.join(workspacePath, '.agents', agentId)
    const triggersFile = path.join(agentPath, 'triggers.json')

    let triggers: any[] = []

    try {
      const triggersContent = await fs.readFile(triggersFile, 'utf-8')
      triggers = JSON.parse(triggersContent)
    } catch (readError: any) {
      if (readError.code !== 'ENOENT') {
        log.warn({ data: readError }, `Failed to read triggers.json for agent ${agentId}:`)
      }
      return
    }

    const whatsappTriggers = (Array.isArray(triggers) ? triggers : []).filter(
      (trigger: any) => trigger.type === 'whatsapp' && trigger.enabled,
    )

    if (whatsappTriggers.length === 0) {
      log.info(`No WhatsApp triggers configured for agent ${agentId}`)
      return
    }

    log.info(`Found ${whatsappTriggers.length} WhatsApp trigger(s) for agent ${agentId}`)

    for (const trigger of whatsappTriggers) {
      try {
        const conditions = trigger.config?.conditions || {}
        let shouldTrigger = true

        if (conditions.fromNumbers && conditions.fromNumbers.length > 0) {
          const senderMatch = conditions.fromNumbers.some(
            (pattern: string) =>
              message.sender.includes(pattern) || new RegExp(pattern).test(message.sender),
          )
          if (!senderMatch) shouldTrigger = false
        }

        if (
          shouldTrigger &&
          conditions.containsKeywords &&
          conditions.containsKeywords.length > 0
        ) {
          const textToSearch = message.textContent || message.media?.caption || ''
          const keywordMatch = conditions.containsKeywords.some((keyword: string) =>
            textToSearch.toLowerCase().includes(keyword.toLowerCase()),
          )
          if (!keywordMatch) shouldTrigger = false
        }

        if (shouldTrigger && conditions.messageTypes && conditions.messageTypes.length > 0) {
          if (!conditions.messageTypes.includes(message.type)) {
            shouldTrigger = false
          }
        }

        if (shouldTrigger) {
          // Credits check — if insufficient, reply via Kapso and stop processing
          const creditsCheck = await creditsGuard(
            workspaceId,
            async () => {
              if (message.sender && phoneNumberId) {
                await kapsoService.sendTextMessage(
                  phoneNumberId,
                  message.sender,
                  INSUFFICIENT_CREDITS_MESSAGE,
                )
              }
            },
            'whatsapp',
          )
          if (!creditsCheck.allowed) break

          log.info(`Executing WhatsApp trigger ${trigger.id} for agent ${agentId}`)

          const fullTrigger = {
            ...trigger,
            agentId,
            workspaceId,
            userId,
            name: trigger.name || trigger.config?.description || `WhatsApp trigger ${trigger.id}`,
          }

          const triggerPayload = {
            triggerId: trigger.id,
            agentId,
            workspaceId,
            userId,
            messageId: message.id,
            from: message.sender,
            senderName: message.senderName,
            type: message.type,
            textContent: message.textContent,
            caption: message.media?.caption,
            receivedAt: message.timestamp,
            messagePath: `.agents/${agentId}/whatsapp/${message.id}`,
            contentFilePath: `.agents/${agentId}/whatsapp/${message.id}/content.json`,
            hasMedia: !!message.media,
            phoneNumberId,
            senderPhone: message.sender,
          }

          const execution = await triggerManager.executeAgentTrigger(
            fullTrigger,
            triggerPayload,
            activityLogId,
          )

          if (execution.status === 'failed') {
            log.info(`Trigger ${trigger.id} failed: ${execution.error}`)
          } else {
            log.info(`Trigger ${trigger.id} executed successfully`)
          }

          await agentWhatsAppStorage.markAsRead(agentId, workspaceId, message.id)
        }
      } catch (triggerError) {
        log.error({ err: triggerError }, `Failed to execute trigger ${trigger.id}:`)
        await sendWhatsAppErrorResponse(workspaceId, agentId, message.sender, triggerError)
      }
    }
  } catch (error) {
    log.error({ err: error }, 'Failed to process WhatsApp triggers')
    await sendWhatsAppErrorResponse(workspaceId, agentId, message?.sender, error)
  }
}

async function sendWhatsAppErrorResponse(
  workspaceId: string,
  agentId: string,
  senderPhone: string | undefined,
  error: unknown,
): Promise<void> {
  if (!senderPhone) return

  try {
    const phoneNumberId = await whatsAppPhoneRepository.getPhoneNumberIdForAgent(
      workspaceId,
      agentId,
    )

    if (!phoneNumberId) {
      log.error(`Cannot send error response: no phone config found for agent ${agentId}`)
      return
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const safeError = errorMessage.replace(/sk[-_][a-zA-Z0-9]+/g, '[REDACTED]').substring(0, 200)

    await kapsoService.sendTextMessage(
      phoneNumberId,
      senderPhone,
      `⚠️ Sorry, I encountered an error processing your message. Please try again.\n\nError: ${safeError}`,
    )

    log.info(`Sent error response to ${senderPhone} for agent ${agentId}`)
  } catch (sendError) {
    log.error({ err: sendError }, `Failed to send error response to ${senderPhone}:`)
  }
}

async function processStatusUpdate(phoneNumberId: string, status: any): Promise<void> {
  log.info(`WhatsApp status update: ${status.status} for message ${status.id}`)

  const phoneConfig = await whatsAppPhoneRepository.getPhoneConfigByPhoneNumberId(phoneNumberId)

  if (!phoneConfig) return

  const { workspace_id: workspaceId, agent_id: agentId } = phoneConfig

  try {
    agentStatusService.broadcastToWorkspace(workspaceId, {
      type: 'whatsapp_status_update',
      agentId,
      status: {
        messageId: status.id,
        status: status.status,
        recipientId: status.recipient_id,
        timestamp: new Date(parseInt(status.timestamp) * 1000).toISOString(),
        errors: status.errors,
      },
    })
  } catch (error) {
    log.error({ err: error }, 'Failed to broadcast status update')
  }
}

async function processAccountUpdate(value: any): Promise<void> {
  const phoneNumberId = value?.metadata?.phone_number_id
  if (!phoneNumberId) return

  const phoneConfig = await whatsAppPhoneRepository.getPhoneConfigByPhoneNumberId(phoneNumberId)
  if (!phoneConfig) return

  const { workspace_id: workspaceId, agent_id: agentId } = phoneConfig

  const updates: Record<string, string> = {}
  if (value.quality_rating) updates.quality_rating = value.quality_rating

  if (Object.keys(updates).length > 0) {
    await whatsAppPhoneRepository.updateMetaFields(workspaceId, agentId, updates)
    log.info({ data: updates }, `Updated account fields for agent ${agentId}:`)

    try {
      agentStatusService.broadcastToWorkspace(workspaceId, {
        type: 'whatsapp_account_update',
        agentId,
        update: updates,
        timestamp: new Date().toISOString(),
      })
    } catch (wsError) {
      log.error({ err: wsError }, 'Failed to broadcast account update')
    }
  }
}

class WhatsappRouterController {
  async verifyWebhook(req: Request, res: Response) {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    const verifyToken = process.env.KAPSO_WEBHOOK_SECRET

    if (mode === 'subscribe' && token === verifyToken) {
      log.info('WhatsApp webhook verified')
      return res.status(200).send(challenge)
    } else {
      log.error('WhatsApp webhook verification failed')
      return res.sendStatus(403)
    }
  }

  async handleWebhook(req: Request, res: Response) {
    try {
      const rawBody = (req as Request & { rawBody?: string }).rawBody || JSON.stringify(req.body)
      const signature =
        (req.headers['x-hub-signature-256'] as string) ||
        (req.headers['x-webhook-signature'] as string) ||
        ''

      if (process.env.KAPSO_WEBHOOK_SECRET) {
        const signatureValue = signature.replace('sha256=', '')
        if (!kapsoService.verifyWebhookSignature(rawBody, signatureValue)) {
          log.error('WhatsApp webhook signature verification failed')
          throw new UnauthorizedError('Invalid signature')
        }
      }

      const event = kapsoService.parseWebhookEvent(req.body)

      const messages = kapsoService.extractMessagesFromWebhook(event)
      const statuses = kapsoService.extractStatusesFromWebhook(event)

      if (messages.length > 0) {
        log.info(
          `Webhook received: ${messages.length} message(s), ${statuses.length} status update(s)`,
        )
      }

      for (const { phoneNumberId, displayPhoneNumber, message, contact } of messages) {
        try {
          await processIncomingMessage(phoneNumberId, displayPhoneNumber, message, contact)
        } catch (error) {
          log.error({ err: error }, `Failed to process WhatsApp message ${message.id}:`)
        }
      }

      for (const { phoneNumberId, status } of statuses) {
        try {
          await processStatusUpdate(phoneNumberId, status)
        } catch (error) {
          log.error({ err: error }, `Failed to process status update:`)
        }
      }

      for (const entry of event.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'account_update' || change.field === 'account') {
            try {
              await processAccountUpdate(change.value)
            } catch (error) {
              log.error({ err: error }, 'Failed to process account update')
            }
          }
        }
      }

      return res.status(200).json({ received: true })
    } catch (error) {
      log.error({ err: error }, 'WhatsApp webhook error')
      throw error
    }
  }

  async healthCheck(_req: Request, res: Response) {
    try {
      const isConfigured = kapsoService.isConfigured()

      return res.json({
        status: isConfigured ? 'healthy' : 'unconfigured',
        service: 'whatsapp-webhook',
        kapsoConfigured: isConfigured,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      throw new InternalServerError(
        error instanceof Error ? error.message : 'WhatsApp health check failed',
      )
    }
  }
}

export const whatsappRouterController = new WhatsappRouterController()
