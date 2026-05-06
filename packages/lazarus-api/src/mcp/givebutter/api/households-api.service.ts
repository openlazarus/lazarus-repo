import { IGivebutterHouseholdsApi } from './households-api.service.interface'
import { IGivebutterHttpClient } from '@mcp/givebutter/infrastructure/givebutter-http-client.interface'
import {
  TCreateHouseholdInput,
  TGivebutterContact,
  TGivebutterHousehold,
  TListParams,
  TPaginated,
  TUpdateHouseholdInput,
} from '@mcp/givebutter/types/givebutter.types'

export class GivebutterHouseholdsApi implements IGivebutterHouseholdsApi {
  constructor(private readonly http: IGivebutterHttpClient) {}

  listHouseholds(params?: TListParams): Promise<TPaginated<TGivebutterHousehold>> {
    return this.http.get<TPaginated<TGivebutterHousehold>>(
      '/v1/households',
      params as Record<string, unknown>,
    )
  }

  getHousehold(id: number): Promise<TGivebutterHousehold> {
    return this.http.get<TGivebutterHousehold>(`/v1/households/${id}`)
  }

  createHousehold(input: TCreateHouseholdInput): Promise<TGivebutterHousehold> {
    return this.http.post<TGivebutterHousehold>('/v1/households', input)
  }

  updateHousehold(id: number, input: TUpdateHouseholdInput): Promise<TGivebutterHousehold> {
    return this.http.put<TGivebutterHousehold>(`/v1/households/${id}`, input)
  }

  deleteHousehold(id: number): Promise<void> {
    return this.http.delete<void>(`/v1/households/${id}`)
  }

  listHouseholdContacts(
    householdId: number,
    params?: TListParams,
  ): Promise<TPaginated<TGivebutterContact>> {
    return this.http.get<TPaginated<TGivebutterContact>>(
      `/v1/households/${householdId}/contacts`,
      params as Record<string, unknown>,
    )
  }

  getHouseholdContact(householdId: number, contactId: number): Promise<TGivebutterContact> {
    return this.http.get<TGivebutterContact>(`/v1/households/${householdId}/contacts/${contactId}`)
  }

  addContactToHousehold(householdId: number, contactId: number): Promise<TGivebutterHousehold> {
    return this.http.post<TGivebutterHousehold>(`/v1/households/${householdId}/contacts`, {
      contact_id: contactId,
    })
  }

  removeContactFromHousehold(householdId: number, contactId: number): Promise<void> {
    return this.http.delete<void>(`/v1/households/${householdId}/contacts/${contactId}`)
  }
}
