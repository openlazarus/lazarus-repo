import {
  TCreateHouseholdInput,
  TGivebutterContact,
  TGivebutterHousehold,
  TListParams,
  TPaginated,
  TUpdateHouseholdInput,
} from '@mcp/givebutter/types/givebutter.types'

export interface IGivebutterHouseholdsApi {
  listHouseholds(params?: TListParams): Promise<TPaginated<TGivebutterHousehold>>
  getHousehold(id: number): Promise<TGivebutterHousehold>
  createHousehold(input: TCreateHouseholdInput): Promise<TGivebutterHousehold>
  updateHousehold(id: number, input: TUpdateHouseholdInput): Promise<TGivebutterHousehold>
  deleteHousehold(id: number): Promise<void>
  listHouseholdContacts(
    householdId: number,
    params?: TListParams,
  ): Promise<TPaginated<TGivebutterContact>>
  getHouseholdContact(householdId: number, contactId: number): Promise<TGivebutterContact>
  addContactToHousehold(householdId: number, contactId: number): Promise<TGivebutterHousehold>
  removeContactFromHousehold(householdId: number, contactId: number): Promise<void>
}
