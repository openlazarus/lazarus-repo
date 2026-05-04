import { z } from 'zod'
import { IGivebutterService } from '@mcp/givebutter/givebutter.service.interface'
import { TToolRegistry } from '@mcp/givebutter/types/tool.types'
import {
  TCreateHouseholdInput,
  TGivebutterContact,
  TGivebutterHousehold,
  TListParams,
  TUpdateHouseholdInput,
} from '@mcp/givebutter/types/givebutter.types'
import {
  bulkListShape,
  wrapBulkListHandler,
  wrapLeanItemHandler,
  wrapLeanListHandler,
  wrapToolHandler,
} from './tool-helpers'
import { CONTACT_LEAN, HOUSEHOLD_LEAN } from './lean-fields'

const householdsFilterShape = {
  query: z.string().optional(),
  fields: z.array(z.string()).optional(),
}

const listShape = {
  page: z.number().int().positive().optional(),
  per_page: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe('Results per page (default 100, max 100).'),
  ...householdsFilterShape,
}

const householdsListAllShape = {
  ...householdsFilterShape,
  ...bulkListShape,
}

const idShape = {
  id: z.number().int().positive().describe('Givebutter household ID'),
  fields: z.array(z.string()).optional(),
}

const createShape = {
  name: z.string().min(1).max(255),
  head_contact_id: z.number().int().positive().optional(),
  note: z.string().optional(),
  envelope_name: z.string().max(255).optional(),
}

const updateShape = {
  id: z.number().int().positive(),
  ...createShape,
  name: z.string().max(255).optional(),
}

const householdContactsFilterShape = {
  id: z.number().int().positive().describe('Givebutter household ID'),
  fields: z.array(z.string()).optional(),
}
const contactsListShape = {
  ...householdContactsFilterShape,
  page: z.number().int().positive().optional(),
  per_page: z.number().int().positive().max(100).optional(),
}
const householdContactsListAllShape = {
  ...householdContactsFilterShape,
  ...bulkListShape,
}

const householdContactShape = {
  id: z.number().int().positive().describe('Givebutter household ID'),
  contact_id: z.number().int().positive().describe('Contact ID'),
  fields: z.array(z.string()).optional(),
}

type TListInput = TListParams & { fields?: string[] }
type TListAllInput = Omit<TListParams, 'page' | 'per_page'> & {
  fields?: string[]
  max_pages?: number
  output_path?: string
}
type TIdInput = { id: number; fields?: string[] }
type TUpdateInput = { id: number } & TUpdateHouseholdInput
type TContactsListInput = { id: number; page?: number; per_page?: number; fields?: string[] }
type TContactsListAllInput = {
  id: number
  fields?: string[]
  max_pages?: number
  output_path?: string
}
type THouseholdContactInput = { id: number; contact_id: number; fields?: string[] }

const DEFAULT_PER_PAGE = 100

export const buildHouseholdTools = (service: IGivebutterService): TToolRegistry => ({
  list_households: {
    name: 'list_households',
    description:
      'List Givebutter households. Default page size 100 (max 100). Nested contacts[] dropped by default — pass `fields: ["contacts"]` to include.',
    schema: listShape,
    handler: wrapLeanListHandler<TListInput, TGivebutterHousehold>(HOUSEHOLD_LEAN, (input) =>
      service.households().listHouseholds({ per_page: DEFAULT_PER_PAGE, ...input }),
    ),
  },
  list_all_households: {
    name: 'list_all_households',
    description:
      'Fetch ALL Givebutter households across all pages (bulk export, lean). Uses server-side pagination internally so only one tool call is needed. Honors same filters as `list_households`. Default cap 500 pages (~50k rows); raise via `max_pages`.',
    schema: householdsListAllShape,
    handler: wrapBulkListHandler<TListAllInput, TGivebutterHousehold>(HOUSEHOLD_LEAN, (input) =>
      service.households().listHouseholds(input),
    ),
  },
  get_household: {
    name: 'get_household',
    description:
      'Get a Givebutter household by ID. Nested contacts[] dropped by default; pass `fields: ["contacts"]` to include.',
    schema: idShape,
    handler: wrapLeanItemHandler<TIdInput, TGivebutterHousehold>(HOUSEHOLD_LEAN, ({ id }) =>
      service.households().getHousehold(id),
    ),
  },
  create_household: {
    name: 'create_household',
    description: 'Create a Givebutter household.',
    schema: createShape,
    handler: wrapToolHandler<TCreateHouseholdInput>((input) =>
      service.households().createHousehold(input),
    ),
  },
  update_household: {
    name: 'update_household',
    description: 'Update a Givebutter household by ID.',
    schema: updateShape,
    handler: wrapToolHandler<TUpdateInput>(({ id, ...rest }) =>
      service.households().updateHousehold(id, rest),
    ),
  },
  delete_household: {
    name: 'delete_household',
    description: 'Delete a Givebutter household by ID.',
    schema: { id: z.number().int().positive() },
    handler: wrapToolHandler<{ id: number }>(async ({ id }) => {
      await service.households().deleteHousehold(id)
      return { deleted: true, id }
    }),
  },
  list_household_contacts: {
    name: 'list_household_contacts',
    description: 'List contacts associated with a Givebutter household. Lean contact projection.',
    schema: contactsListShape,
    handler: wrapLeanListHandler<TContactsListInput, TGivebutterContact>(
      CONTACT_LEAN,
      ({ id, ...params }) =>
        service.households().listHouseholdContacts(id, { per_page: DEFAULT_PER_PAGE, ...params }),
    ),
  },
  list_all_household_contacts: {
    name: 'list_all_household_contacts',
    description:
      'Fetch ALL contacts associated with a Givebutter household across all pages (bulk export, lean). Uses server-side pagination internally so only one tool call is needed. Honors same filters as `list_household_contacts`. Default cap 500 pages (~50k rows); raise via `max_pages`.',
    schema: householdContactsListAllShape,
    handler: wrapBulkListHandler<TContactsListAllInput, TGivebutterContact>(
      CONTACT_LEAN,
      ({ id, ...params }) => service.households().listHouseholdContacts(id, params),
    ),
  },
  get_household_contact: {
    name: 'get_household_contact',
    description: 'Get a specific contact associated with a Givebutter household.',
    schema: householdContactShape,
    handler: wrapLeanItemHandler<THouseholdContactInput, TGivebutterContact>(
      CONTACT_LEAN,
      ({ id, contact_id }) => service.households().getHouseholdContact(id, contact_id),
    ),
  },
  add_contact_to_household: {
    name: 'add_contact_to_household',
    description: 'Add a contact to a Givebutter household.',
    schema: {
      id: z.number().int().positive(),
      contact_id: z.number().int().positive(),
    },
    handler: wrapToolHandler<{ id: number; contact_id: number }>(({ id, contact_id }) =>
      service.households().addContactToHousehold(id, contact_id),
    ),
  },
  remove_contact_from_household: {
    name: 'remove_contact_from_household',
    description: 'Remove a contact from a Givebutter household.',
    schema: {
      id: z.number().int().positive(),
      contact_id: z.number().int().positive(),
    },
    handler: wrapToolHandler<{ id: number; contact_id: number }>(async ({ id, contact_id }) => {
      await service.households().removeContactFromHousehold(id, contact_id)
      return { removed: true, household_id: id, contact_id }
    }),
  },
})
