import { IGivebutterWebhooksApi } from './webhooks-api.service.interface'
import { IGivebutterHttpClient } from '@mcp/givebutter/infrastructure/givebutter-http-client.interface'
import {
  TCreateWebhookInput,
  TGivebutterWebhook,
  TGivebutterWebhookActivity,
  TListParams,
  TPaginated,
  TUpdateWebhookInput,
} from '@mcp/givebutter/types/givebutter.types'

export class GivebutterWebhooksApi implements IGivebutterWebhooksApi {
  constructor(private readonly http: IGivebutterHttpClient) {}

  listWebhooks(params?: TListParams): Promise<TPaginated<TGivebutterWebhook>> {
    return this.http.get<TPaginated<TGivebutterWebhook>>(
      '/v1/webhooks',
      params as Record<string, unknown>,
    )
  }

  getWebhook(id: string): Promise<TGivebutterWebhook> {
    return this.http.get<TGivebutterWebhook>(`/v1/webhooks/${id}`)
  }

  createWebhook(input: TCreateWebhookInput): Promise<TGivebutterWebhook> {
    return this.http.post<TGivebutterWebhook>('/v1/webhooks', input)
  }

  updateWebhook(id: string, input: TUpdateWebhookInput): Promise<TGivebutterWebhook> {
    return this.http.put<TGivebutterWebhook>(`/v1/webhooks/${id}`, input)
  }

  deleteWebhook(id: string): Promise<void> {
    return this.http.delete<void>(`/v1/webhooks/${id}`)
  }

  listWebhookActivities(
    webhookId: string,
    params?: TListParams,
  ): Promise<TPaginated<TGivebutterWebhookActivity>> {
    return this.http.get<TPaginated<TGivebutterWebhookActivity>>(
      `/v1/webhooks/${webhookId}/activities`,
      params as Record<string, unknown>,
    )
  }

  getWebhookActivity(webhookId: string, activityId: string): Promise<TGivebutterWebhookActivity> {
    return this.http.get<TGivebutterWebhookActivity>(
      `/v1/webhooks/${webhookId}/activities/${activityId}`,
    )
  }
}
