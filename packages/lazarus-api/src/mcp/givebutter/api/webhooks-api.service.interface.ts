import {
  TCreateWebhookInput,
  TGivebutterWebhook,
  TGivebutterWebhookActivity,
  TListParams,
  TPaginated,
  TUpdateWebhookInput,
} from '@mcp/givebutter/types/givebutter.types'

export interface IGivebutterWebhooksApi {
  listWebhooks(params?: TListParams): Promise<TPaginated<TGivebutterWebhook>>
  getWebhook(id: string): Promise<TGivebutterWebhook>
  createWebhook(input: TCreateWebhookInput): Promise<TGivebutterWebhook>
  updateWebhook(id: string, input: TUpdateWebhookInput): Promise<TGivebutterWebhook>
  deleteWebhook(id: string): Promise<void>
  listWebhookActivities(
    webhookId: string,
    params?: TListParams,
  ): Promise<TPaginated<TGivebutterWebhookActivity>>
  getWebhookActivity(webhookId: string, activityId: string): Promise<TGivebutterWebhookActivity>
}
