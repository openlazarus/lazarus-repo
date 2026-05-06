import { IGivebutterContactsApi } from './contacts-api.service.interface'
import { IGivebutterHttpClient } from '@mcp/givebutter/infrastructure/givebutter-http-client.interface'
import {
  TCreateContactInput,
  TGivebutterContact,
  TListParams,
  TPaginated,
  TUpdateContactInput,
} from '@mcp/givebutter/types/givebutter.types'

export class GivebutterContactsApi implements IGivebutterContactsApi {
  constructor(private readonly http: IGivebutterHttpClient) {}

  listContacts(params?: TListParams): Promise<TPaginated<TGivebutterContact>> {
    return this.http.get<TPaginated<TGivebutterContact>>(
      '/v1/contacts',
      params as Record<string, unknown>,
    )
  }

  getContact(id: number): Promise<TGivebutterContact> {
    return this.http.get<TGivebutterContact>(`/v1/contacts/${id}`)
  }

  createContact(input: TCreateContactInput): Promise<TGivebutterContact> {
    return this.http.post<TGivebutterContact>('/v1/contacts', input)
  }

  updateContact(id: number, input: TUpdateContactInput): Promise<TGivebutterContact> {
    return this.http.put<TGivebutterContact>(`/v1/contacts/${id}`, input)
  }

  archiveContact(id: number): Promise<void> {
    return this.http.delete<void>(`/v1/contacts/${id}`)
  }

  restoreContact(id: number): Promise<TGivebutterContact> {
    return this.http.patch<TGivebutterContact>(`/v1/contacts/${id}/restore`)
  }

  addContactTags(id: number, tags: string[]): Promise<TGivebutterContact> {
    return this.http.post<TGivebutterContact>(`/v1/contacts/${id}/tags/add`, { tags })
  }

  removeContactTags(id: number, tags: string[]): Promise<TGivebutterContact> {
    return this.http.post<TGivebutterContact>(`/v1/contacts/${id}/tags/remove`, { tags })
  }

  syncContactTags(id: number, tags: string[]): Promise<TGivebutterContact> {
    return this.http.post<TGivebutterContact>(`/v1/contacts/${id}/tags/sync`, { tags })
  }
}
