import { IGivebutterContactActivitiesApi } from './contact-activities-api.service.interface'
import { IGivebutterHttpClient } from '@mcp/givebutter/infrastructure/givebutter-http-client.interface'
import {
  TCreateContactActivityInput,
  TGivebutterContactActivity,
  TListParams,
  TPaginated,
  TUpdateContactActivityInput,
} from '@mcp/givebutter/types/givebutter.types'

export class GivebutterContactActivitiesApi implements IGivebutterContactActivitiesApi {
  constructor(private readonly http: IGivebutterHttpClient) {}

  listContactActivities(
    contactId: number,
    params?: TListParams,
  ): Promise<TPaginated<TGivebutterContactActivity>> {
    return this.http.get<TPaginated<TGivebutterContactActivity>>(
      `/v1/contacts/${contactId}/activities`,
      params as Record<string, unknown>,
    )
  }

  getContactActivity(contactId: number, activityId: number): Promise<TGivebutterContactActivity> {
    return this.http.get<TGivebutterContactActivity>(
      `/v1/contacts/${contactId}/activities/${activityId}`,
    )
  }

  createContactActivity(
    contactId: number,
    input: TCreateContactActivityInput,
  ): Promise<TGivebutterContactActivity> {
    return this.http.post<TGivebutterContactActivity>(`/v1/contacts/${contactId}/activities`, input)
  }

  updateContactActivity(
    contactId: number,
    activityId: number,
    input: TUpdateContactActivityInput,
  ): Promise<TGivebutterContactActivity> {
    return this.http.put<TGivebutterContactActivity>(
      `/v1/contacts/${contactId}/activities/${activityId}`,
      input,
    )
  }

  deleteContactActivity(contactId: number, activityId: number): Promise<void> {
    return this.http.delete<void>(`/v1/contacts/${contactId}/activities/${activityId}`)
  }
}
