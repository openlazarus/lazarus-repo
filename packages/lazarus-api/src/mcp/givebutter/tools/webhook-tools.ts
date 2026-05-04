import { z } from 'zod'
import { IGivebutterService } from '@mcp/givebutter/givebutter.service.interface'
import { TToolRegistry } from '@mcp/givebutter/types/tool.types'
import {
  EWebhookEvent,
  TCreateWebhookInput,
  TGivebutterWebhook,
  TListParams,
  TUpdateWebhookInput,
} from '@mcp/givebutter/types/givebutter.types'
import {
  bulkListShape,
  formatGivebutterError,
  toToolResult,
  wrapBulkListHandler,
  wrapLeanItemHandler,
  wrapLeanListHandler,
  wrapToolHandler,
} from './tool-helpers'
import { WEBHOOK_ACTIVITY_LEAN, WEBHOOK_ACTIVITY_WITH_PAYLOAD, WEBHOOK_LEAN } from './lean-fields'
import { TFieldList, projectItem, projectList } from './response-projection'
import { TToolResult } from '@mcp/givebutter/types/tool.types'

const eventEnum = z.nativeEnum(EWebhookEvent)

const webhooksFilterShape = {
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
  ...webhooksFilterShape,
}

const webhooksListAllShape = {
  ...webhooksFilterShape,
  ...bulkListShape,
}

const idShape = {
  id: z.string().min(1).describe('Givebutter webhook ID'),
  fields: z.array(z.string()).optional(),
}

const createShape = {
  url: z.string().url().describe('Webhook endpoint URL'),
  events: z.array(eventEnum).optional().describe('List of event types to subscribe to'),
  event: eventEnum.optional().describe('Single event type to subscribe to'),
  name: z.string().max(255).optional(),
  enabled: z.boolean().optional(),
}

const updateShape = {
  id: z.string().min(1),
  url: z.string().url(),
  events: z.array(eventEnum).describe('List of event types to subscribe to'),
  name: z.string().max(255).optional(),
  enabled: z.boolean().optional(),
}

const activitiesFilterShape = {
  id: z.string().min(1).describe('Givebutter webhook ID'),
  include_payload: z
    .boolean()
    .optional()
    .describe('Include the raw payload body (large; off by default).'),
  fields: z.array(z.string()).optional(),
}

const activitiesListShape = {
  ...activitiesFilterShape,
  page: z.number().int().positive().optional(),
  per_page: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe('Results per page (default 100, max 100).'),
}

const activitiesListAllShape = {
  ...activitiesFilterShape,
  ...bulkListShape,
}

const activityIdShape = {
  id: z.string().min(1).describe('Givebutter webhook ID'),
  activity_id: z.string().min(1).describe('Webhook activity ID'),
  include_payload: z.boolean().optional(),
  fields: z.array(z.string()).optional(),
}

type TListInput = TListParams & { fields?: string[] }
type TListAllInput = Omit<TListParams, 'page' | 'per_page'> & {
  fields?: string[]
  max_pages?: number
  output_path?: string
}
type TIdInput = { id: string; fields?: string[] }
type TUpdateInput = { id: string } & TUpdateWebhookInput
type TActivitiesListInput = {
  id: string
  page?: number
  per_page?: number
  include_payload?: boolean
  fields?: string[]
}
type TActivitiesListAllInput = {
  id: string
  include_payload?: boolean
  fields?: string[]
  max_pages?: number
  output_path?: string
}
type TActivityIdInput = {
  id: string
  activity_id: string
  include_payload?: boolean
  fields?: string[]
}

const DEFAULT_PER_PAGE = 100

const activityFields = (includePayload?: boolean): TFieldList =>
  includePayload ? WEBHOOK_ACTIVITY_WITH_PAYLOAD : WEBHOOK_ACTIVITY_LEAN

const bulkWebhookActivitiesHandler = (
  service: IGivebutterService,
): ((input: unknown) => Promise<TToolResult>) => {
  return (input: unknown): Promise<TToolResult> => {
    const typed = (input ?? {}) as TActivitiesListAllInput
    const lean = activityFields(typed.include_payload)
    const inner = wrapBulkListHandler<TActivitiesListAllInput, object>(
      lean,
      ({ id, page, per_page }) => service.webhooks().listWebhookActivities(id, { page, per_page }),
    )
    return inner(typed)
  }
}

export const buildWebhookTools = (service: IGivebutterService): TToolRegistry => ({
  list_webhooks: {
    name: 'list_webhooks',
    description: 'List Givebutter webhooks configured on the account.',
    schema: listShape,
    handler: wrapLeanListHandler<TListInput, TGivebutterWebhook>(WEBHOOK_LEAN, (input) =>
      service.webhooks().listWebhooks({ per_page: DEFAULT_PER_PAGE, ...input }),
    ),
  },
  list_all_webhooks: {
    name: 'list_all_webhooks',
    description:
      'Fetch ALL Givebutter webhooks configured on the account across all pages (bulk export, lean). Uses server-side pagination internally so only one tool call is needed. Honors same filters as `list_webhooks`. Default cap 500 pages (~50k rows); raise via `max_pages`.',
    schema: webhooksListAllShape,
    handler: wrapBulkListHandler<TListAllInput, TGivebutterWebhook>(WEBHOOK_LEAN, (input) =>
      service.webhooks().listWebhooks(input),
    ),
  },
  get_webhook: {
    name: 'get_webhook',
    description: 'Get a Givebutter webhook by ID (lean; pass `fields` for more).',
    schema: idShape,
    handler: wrapLeanItemHandler<TIdInput, TGivebutterWebhook>(WEBHOOK_LEAN, ({ id }) =>
      service.webhooks().getWebhook(id),
    ),
  },
  create_webhook: {
    name: 'create_webhook',
    description: 'Create a new Givebutter webhook subscription.',
    schema: createShape,
    handler: wrapToolHandler<TCreateWebhookInput>((input) =>
      service.webhooks().createWebhook(input),
    ),
  },
  update_webhook: {
    name: 'update_webhook',
    description: 'Update a Givebutter webhook by ID.',
    schema: updateShape,
    handler: wrapToolHandler<TUpdateInput>(({ id, ...rest }) =>
      service.webhooks().updateWebhook(id, rest),
    ),
  },
  delete_webhook: {
    name: 'delete_webhook',
    description: 'Delete a Givebutter webhook by ID.',
    schema: { id: z.string().min(1) },
    handler: wrapToolHandler<{ id: string }>(async ({ id }) => {
      await service.webhooks().deleteWebhook(id)
      return { deleted: true, id }
    }),
  },
  list_webhook_activities: {
    name: 'list_webhook_activities',
    description:
      'List delivery activities for a Givebutter webhook. `payload` is dropped by default — set `include_payload: true` to include it (large, kilobytes per row).',
    schema: activitiesListShape,
    handler: async (input: unknown): Promise<TToolResult> => {
      try {
        const { id, include_payload, fields, ...params } = (input ?? {}) as TActivitiesListInput
        const res = await service
          .webhooks()
          .listWebhookActivities(id, { per_page: DEFAULT_PER_PAGE, ...params })
        return toToolResult(projectList(res, activityFields(include_payload), fields))
      } catch (err) {
        return formatGivebutterError(err)
      }
    },
  },
  list_all_webhook_activities: {
    name: 'list_all_webhook_activities',
    description:
      'Fetch ALL delivery activities for a Givebutter webhook across all pages (bulk export, lean). Uses server-side pagination internally so only one tool call is needed. Honors same filters as `list_webhook_activities` — `payload` is dropped by default; set `include_payload: true` to include it. Default cap 500 pages (~50k rows); raise via `max_pages`.',
    schema: activitiesListAllShape,
    handler: bulkWebhookActivitiesHandler(service),
  },
  get_webhook_activity: {
    name: 'get_webhook_activity',
    description:
      'Get a specific webhook delivery activity by ID. Set `include_payload: true` to include the raw body.',
    schema: activityIdShape,
    handler: async (input: unknown): Promise<TToolResult> => {
      try {
        const { id, activity_id, include_payload, fields } = (input ?? {}) as TActivityIdInput
        const res = await service.webhooks().getWebhookActivity(id, activity_id)
        return toToolResult(projectItem(res, activityFields(include_payload), fields))
      } catch (err) {
        return formatGivebutterError(err)
      }
    },
  },
})
