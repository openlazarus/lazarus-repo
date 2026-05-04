import type {
  ChannelContext,
  ChannelPermissionRequest,
} from '@domains/permission/types/permission.types'

export interface IWhatsAppPermissionProvider {
  /** Request permission via WhatsApp interactive button message. */
  requestPermission(
    request: ChannelPermissionRequest,
    context: ChannelContext,
    timeoutMs: number,
  ): Promise<boolean>

  /** Clean up a specific permission request. */
  cleanup(requestId: string): void
}
