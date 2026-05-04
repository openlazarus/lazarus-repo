import { z } from 'zod'
import { IGivebutterService } from '@mcp/givebutter/givebutter.service.interface'
import { TToolRegistry } from '@mcp/givebutter/types/tool.types'
import {
  EContactActivityType,
  TCreateContactActivityInput,
  TGivebutterContactActivity,
  TUpdateContactActivityInput,
} from '@mcp/givebutter/types/givebutter.types'
import {
  bulkListShape,
  wrapBulkListHandler,
  wrapLeanItemHandler,
  wrapLeanListHandler,
  wrapToolHandler,
} from './tool-helpers'
import { CONTACT_ACTIVITY_LEAN } from './lean-fields'

const activityType = z.nativeEnum(EContactActivityType)
const contactIdShape = { contact_id: z.number().int().positive().describe('Givebutter contact ID') }
const activityIdShape = {
  ...contactIdShape,
  activity_id: z.number().int().positive().describe('Activity ID'),
}

const filterShape = {
  ...contactIdShape,
  type: activityType.optional(),
  fields: z.array(z.string()).optional(),
}

const listShape = {
  ...filterShape,
  page: z.number().int().positive().optional(),
  per_page: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe('Results per page (default 100, max 100).'),
}

const listAllShape = {
  ...filterShape,
  ...bulkListShape,
}

const DEFAULT_PER_PAGE = 100

const createShape = {
  ...contactIdShape,
  type: activityType.describe('Activity type'),
  note: z.string().optional(),
  subject: z.string().max(255).optional(),
  occurred_at: z.string().optional().describe('ISO-8601 timestamp'),
  timezone: z.string().max(255).optional(),
}

const updateShape = {
  ...activityIdShape,
  type: activityType.optional(),
  note: z.string().optional(),
  subject: z.string().max(255).optional(),
  occurred_at: z.string().optional(),
  timezone: z.string().max(255).optional(),
}

type TListInput = {
  contact_id: number
  page?: number
  per_page?: number
  type?: EContactActivityType
  fields?: string[]
}
type TListAllInput = {
  contact_id: number
  type?: EContactActivityType
  fields?: string[]
  max_pages?: number
  output_path?: string
}
type TActivityIdInput = { contact_id: number; activity_id: number; fields?: string[] }
type TCreateInput = { contact_id: number } & TCreateContactActivityInput
type TUpdateInput = { contact_id: number; activity_id: number } & TUpdateContactActivityInput

const activityIdWithFields = {
  ...activityIdShape,
  fields: z.array(z.string()).optional(),
}

export const buildContactActivityTools = (service: IGivebutterService): TToolRegistry => ({
  list_contact_activities: {
    name: 'list_contact_activities',
    description: 'List activities logged on a Givebutter contact. Default page size 100 (max 100).',
    schema: listShape,
    handler: wrapLeanListHandler<TListInput, TGivebutterContactActivity>(
      CONTACT_ACTIVITY_LEAN,
      ({ contact_id, ...params }) =>
        service
          .contactActivities()
          .listContactActivities(contact_id, { per_page: DEFAULT_PER_PAGE, ...params }),
    ),
  },
  list_all_contact_activities: {
    name: 'list_all_contact_activities',
    description:
      'Fetch ALL activities for a Givebutter contact across all pages (bulk export, lean). Uses server-side pagination internally so only one tool call is needed. Honors same filters as `list_contact_activities`. Default cap 500 pages (~50k rows); raise via `max_pages`.',
    schema: listAllShape,
    handler: wrapBulkListHandler<TListAllInput, TGivebutterContactActivity>(
      CONTACT_ACTIVITY_LEAN,
      ({ contact_id, ...params }) =>
        service.contactActivities().listContactActivities(contact_id, params),
    ),
  },
  get_contact_activity: {
    name: 'get_contact_activity',
    description: 'Get a specific contact activity by ID.',
    schema: activityIdWithFields,
    handler: wrapLeanItemHandler<TActivityIdInput, TGivebutterContactActivity>(
      CONTACT_ACTIVITY_LEAN,
      ({ contact_id, activity_id }) =>
        service.contactActivities().getContactActivity(contact_id, activity_id),
    ),
  },
  create_contact_activity: {
    name: 'create_contact_activity',
    description: 'Log a new activity (note, meeting, call, etc.) on a Givebutter contact.',
    schema: createShape,
    handler: wrapToolHandler<TCreateInput>(({ contact_id, ...rest }) =>
      service.contactActivities().createContactActivity(contact_id, rest),
    ),
  },
  update_contact_activity: {
    name: 'update_contact_activity',
    description: 'Update a Givebutter contact activity.',
    schema: updateShape,
    handler: wrapToolHandler<TUpdateInput>(({ contact_id, activity_id, ...rest }) =>
      service.contactActivities().updateContactActivity(contact_id, activity_id, rest),
    ),
  },
  delete_contact_activity: {
    name: 'delete_contact_activity',
    description: 'Delete a Givebutter contact activity.',
    schema: activityIdShape,
    handler: wrapToolHandler<TActivityIdInput>(async ({ contact_id, activity_id }) => {
      await service.contactActivities().deleteContactActivity(contact_id, activity_id)
      return { deleted: true, contact_id, activity_id }
    }),
  },
})
