import {
  TCreateContactActivityInput,
  TGivebutterContactActivity,
  TListParams,
  TPaginated,
  TUpdateContactActivityInput,
} from '@mcp/givebutter/types/givebutter.types'

export interface IGivebutterContactActivitiesApi {
  listContactActivities(
    contactId: number,
    params?: TListParams,
  ): Promise<TPaginated<TGivebutterContactActivity>>
  getContactActivity(contactId: number, activityId: number): Promise<TGivebutterContactActivity>
  createContactActivity(
    contactId: number,
    input: TCreateContactActivityInput,
  ): Promise<TGivebutterContactActivity>
  updateContactActivity(
    contactId: number,
    activityId: number,
    input: TUpdateContactActivityInput,
  ): Promise<TGivebutterContactActivity>
  deleteContactActivity(contactId: number, activityId: number): Promise<void>
}
