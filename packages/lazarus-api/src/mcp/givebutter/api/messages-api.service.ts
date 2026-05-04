import { IGivebutterMessagesApi } from './messages-api.service.interface'
import { IGivebutterHttpClient } from '@mcp/givebutter/infrastructure/givebutter-http-client.interface'
import { TGivebutterMessage, TListParams, TPaginated } from '@mcp/givebutter/types/givebutter.types'

export class GivebutterMessagesApi implements IGivebutterMessagesApi {
  constructor(private readonly http: IGivebutterHttpClient) {}

  listMessages(params?: TListParams): Promise<TPaginated<TGivebutterMessage>> {
    return this.http.get<TPaginated<TGivebutterMessage>>(
      '/v1/messages',
      params as Record<string, unknown>,
    )
  }

  getMessage(id: string): Promise<TGivebutterMessage> {
    return this.http.get<TGivebutterMessage>(`/v1/messages/${id}`)
  }
}
