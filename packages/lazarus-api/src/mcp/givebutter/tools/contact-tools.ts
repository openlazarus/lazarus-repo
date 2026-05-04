import { z } from 'zod'
import { IGivebutterService } from '@mcp/givebutter/givebutter.service.interface'
import { TToolRegistry } from '@mcp/givebutter/types/tool.types'
import {
  TContactListParams,
  TCreateContactInput,
  TGivebutterContact,
  TUpdateContactInput,
} from '@mcp/givebutter/types/givebutter.types'
import {
  bulkListShape,
  wrapBulkListHandler,
  wrapLeanItemHandler,
  wrapLeanListHandler,
  wrapToolHandler,
} from './tool-helpers'
import { CONTACT_LEAN, CONTACT_SUMMARY } from './lean-fields'

const fieldsOption = z
  .array(z.string())
  .optional()
  .describe('Extra fields to include on top of the lean default.')

const summaryOption = z
  .boolean()
  .optional()
  .describe('Return ultra-lean rows (id + identifying/join fields only).')

const filterShape = {
  query: z.string().optional().describe('Free-text search query.'),
  tag: z.string().optional().describe('Filter to contacts carrying this tag (server-side).'),
  archived: z.boolean().optional().describe('Include/exclude archived contacts.'),
  email: z.string().optional().describe('Exact-match email lookup.'),
  phone: z.string().optional().describe('Exact-match phone lookup.'),
  fields: fieldsOption,
  summary: summaryOption,
}

const listShape = {
  page: z.number().int().positive().optional().describe('Page number (1-indexed).'),
  per_page: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe('Results per page (default 100, max 100).'),
  ...filterShape,
}

const listAllShape = {
  ...filterShape,
  ...bulkListShape,
}

const idShape = {
  id: z.number().int().positive().describe('Givebutter contact ID'),
  fields: fieldsOption,
}

const emailSchema = z.object({ type: z.string().optional(), value: z.string().email() })
const phoneSchema = z.object({ type: z.string().optional(), value: z.string() })
const addressSchema = z.object({
  address_1: z.string().optional(),
  address_2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipcode: z.string().optional(),
  country: z.string().optional(),
})

const createContactShape = {
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  middle_name: z.string().optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  dob: z.string().optional().describe('Date of birth (YYYY-MM-DD)'),
  emails: z.array(emailSchema).optional(),
  phones: z.array(phoneSchema).optional(),
  addresses: z.array(addressSchema).optional(),
  tags: z.array(z.string()).optional(),
}

const updateContactShape = { id: z.number().int().positive(), ...createContactShape }
const tagsShape = {
  id: z.number().int().positive(),
  tags: z.array(z.string().max(64)).min(1).describe('Tags (max 64 chars each)'),
}

type TListInput = TContactListParams & { fields?: string[]; summary?: boolean }
type TListAllInput = Omit<TContactListParams, 'page' | 'per_page'> & {
  fields?: string[]
  summary?: boolean
  max_pages?: number
  output_path?: string
}
type TIdInput = { id: number; fields?: string[] }
type TUpdateInput = { id: number } & TUpdateContactInput
type TTagsInput = { id: number; tags: string[] }

const DEFAULT_PER_PAGE = 100

const withDefaults = (input: TListInput): TContactListParams => ({
  per_page: DEFAULT_PER_PAGE,
  ...input,
})

export const buildContactTools = (service: IGivebutterService): TToolRegistry => ({
  list_contacts: {
    name: 'list_contacts',
    description:
      'List Givebutter contacts. Default page size is 100 (max 100). Returns lean fields; pass `tag` to filter server-side, `summary: true` for ultra-lean rows, or `fields: [...]` to include extra keys.',
    schema: listShape,
    handler: wrapLeanListHandler<TListInput, TGivebutterContact>(
      CONTACT_LEAN,
      (input) => service.contacts().listContacts(withDefaults(input)),
      CONTACT_SUMMARY,
    ),
  },
  list_all_contacts: {
    name: 'list_all_contacts',
    description:
      'Fetch ALL Givebutter contacts across all pages (bulk export, lean). Uses server-side pagination internally so only one tool call is needed. Honors same filters as `list_contacts`. Default cap 500 pages (~50k rows); raise via `max_pages`.',
    schema: listAllShape,
    handler: wrapBulkListHandler<TListAllInput, TGivebutterContact>(
      CONTACT_LEAN,
      (input) => service.contacts().listContacts(input),
      CONTACT_SUMMARY,
    ),
  },
  get_contact: {
    name: 'get_contact',
    description: 'Get a Givebutter contact by ID (lean projection; pass `fields` for more).',
    schema: idShape,
    handler: wrapLeanItemHandler<TIdInput, TGivebutterContact>(CONTACT_LEAN, ({ id }) =>
      service.contacts().getContact(id),
    ),
  },
  create_contact: {
    name: 'create_contact',
    description: 'Create a new Givebutter contact.',
    schema: createContactShape,
    handler: wrapToolHandler<TCreateContactInput>((input) =>
      service.contacts().createContact(input),
    ),
  },
  update_contact: {
    name: 'update_contact',
    description: 'Update an existing Givebutter contact by ID.',
    schema: updateContactShape,
    handler: wrapToolHandler<TUpdateInput>(({ id, ...rest }) =>
      service.contacts().updateContact(id, rest),
    ),
  },
  archive_contact: {
    name: 'archive_contact',
    description: 'Archive (soft-delete) a Givebutter contact by ID.',
    schema: { id: z.number().int().positive() },
    handler: wrapToolHandler<{ id: number }>(async ({ id }) => {
      await service.contacts().archiveContact(id)
      return { archived: true, id }
    }),
  },
  restore_contact: {
    name: 'restore_contact',
    description: 'Restore a previously archived Givebutter contact by ID.',
    schema: { id: z.number().int().positive() },
    handler: wrapToolHandler<{ id: number }>(({ id }) => service.contacts().restoreContact(id)),
  },
  add_contact_tags: {
    name: 'add_contact_tags',
    description: 'Add one or more tags to a Givebutter contact (merges with existing tags).',
    schema: tagsShape,
    handler: wrapToolHandler<TTagsInput>(({ id, tags }) =>
      service.contacts().addContactTags(id, tags),
    ),
  },
  remove_contact_tags: {
    name: 'remove_contact_tags',
    description: 'Remove one or more tags from a Givebutter contact.',
    schema: tagsShape,
    handler: wrapToolHandler<TTagsInput>(({ id, tags }) =>
      service.contacts().removeContactTags(id, tags),
    ),
  },
  sync_contact_tags: {
    name: 'sync_contact_tags',
    description: 'Replace the full set of tags on a Givebutter contact with the provided list.',
    schema: tagsShape,
    handler: wrapToolHandler<TTagsInput>(({ id, tags }) =>
      service.contacts().syncContactTags(id, tags),
    ),
  },
})
