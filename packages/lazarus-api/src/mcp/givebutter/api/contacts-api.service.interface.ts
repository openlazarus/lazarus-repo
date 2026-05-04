import {
  TCreateContactInput,
  TGivebutterContact,
  TListParams,
  TPaginated,
  TUpdateContactInput,
} from '@mcp/givebutter/types/givebutter.types'

export interface IGivebutterContactsApi {
  listContacts(params?: TListParams): Promise<TPaginated<TGivebutterContact>>
  getContact(id: number): Promise<TGivebutterContact>
  createContact(input: TCreateContactInput): Promise<TGivebutterContact>
  updateContact(id: number, input: TUpdateContactInput): Promise<TGivebutterContact>
  archiveContact(id: number): Promise<void>
  restoreContact(id: number): Promise<TGivebutterContact>
  addContactTags(id: number, tags: string[]): Promise<TGivebutterContact>
  removeContactTags(id: number, tags: string[]): Promise<TGivebutterContact>
  syncContactTags(id: number, tags: string[]): Promise<TGivebutterContact>
}
