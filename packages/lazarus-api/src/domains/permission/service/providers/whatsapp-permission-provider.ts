/**
 * WhatsApp Permission Provider
 *
 * Sends interactive button messages via WhatsApp to request tool approval
 * from users, then waits for the user's response (button tap or text reply).
 */

import type {
  ChannelContext,
  ChannelPermissionProvider,
  ChannelPermissionRequest,
} from '@domains/permission/types/permission.types'
import { BackgroundPermissionManager } from '@domains/permission/service/background-permission-manager'
import { kapsoService } from '@domains/whatsapp/service/kapso-service'
import type { IWhatsAppPermissionProvider } from './whatsapp-permission-provider.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('whatsapp-permission-provider')

export class WhatsAppPermissionProvider
  implements ChannelPermissionProvider, IWhatsAppPermissionProvider
{
  async requestPermission(
    request: ChannelPermissionRequest,
    context: ChannelContext,
    timeoutMs: number,
  ): Promise<boolean> {
    const { phoneNumberId, senderPhone } = context

    if (!phoneNumberId || !senderPhone) {
      log.error('Missing phoneNumberId or senderPhone — auto-denying')
      return false
    }

    const bgPermManager = BackgroundPermissionManager.getInstance()
    const timeoutMinutes = Math.max(1, Math.floor(timeoutMs / 60000))

    // Truncate description for WhatsApp body limit (1024 chars)
    const bodyText =
      request.description.length > 900
        ? request.description.substring(0, 900) + '...'
        : request.description

    try {
      // Send interactive button message
      await kapsoService.sendInteractiveMessage(
        phoneNumberId,
        senderPhone,
        bodyText,
        [
          { id: `perm_approve_${request.requestId}`, title: 'Approve' },
          { id: `perm_deny_${request.requestId}`, title: 'Deny' },
        ],
        'Permission Request',
        `Auto-denies in ${timeoutMinutes} min`,
      )

      log.info(
        `Sent permission request ${request.requestId} to ${senderPhone} for tool ${request.toolName}`,
      )
    } catch (err) {
      log.error({ err: err }, `Failed to send interactive message for ${request.requestId}:`)
      // If we can't send the message, auto-deny
      return false
    }

    // Register pending permission and wait for response
    return new Promise<boolean>((resolve) => {
      const channelKey = `whatsapp:${request.workspaceId}:${request.agentId}:${senderPhone}`
      bgPermManager.register(
        request.requestId,
        channelKey,
        resolve,
        timeoutMs,
        'whatsapp',
        request.toolName,
      )
    })
  }

  cleanup(requestId: string): void {
    BackgroundPermissionManager.getInstance().cleanup(requestId)
  }
}
