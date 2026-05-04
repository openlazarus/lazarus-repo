import { TGivebutterMessage, TListParams, TPaginated } from '@mcp/givebutter/types/givebutter.types'

export interface IGivebutterMessagesApi {
  listMessages(params?: TListParams): Promise<TPaginated<TGivebutterMessage>>
  getMessage(id: string): Promise<TGivebutterMessage>
}
