import { z } from 'zod'
import { IGivebutterService } from '@mcp/givebutter/givebutter.service.interface'
import { TToolRegistry } from '@mcp/givebutter/types/tool.types'
import { TGivebutterPlan, TPlanListParams } from '@mcp/givebutter/types/givebutter.types'
import {
  bulkListShape,
  wrapBulkListHandler,
  wrapLeanItemHandler,
  wrapLeanListHandler,
} from './tool-helpers'
import { PLAN_LEAN } from './lean-fields'

const filterShape = {
  contact_id: z.number().int().positive().optional(),
  campaign_id: z.number().int().positive().optional(),
  status: z.string().optional(),
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
  ...filterShape,
}

const listAllShape = {
  ...filterShape,
  ...bulkListShape,
}

const idShape = {
  id: z.string().min(1).describe('Givebutter recurring-plan ID'),
  fields: z.array(z.string()).optional(),
}

type TListInput = TPlanListParams & { fields?: string[] }
type TListAllInput = Omit<TPlanListParams, 'page' | 'per_page'> & {
  fields?: string[]
  max_pages?: number
  output_path?: string
}
type TIdInput = { id: string; fields?: string[] }

const DEFAULT_PER_PAGE = 100

export const buildPlanTools = (service: IGivebutterService): TToolRegistry => ({
  list_plans: {
    name: 'list_plans',
    description:
      'List Givebutter recurring giving plans. Default page size 100 (max 100). Filter with `contact_id`, `campaign_id`, `status`.',
    schema: listShape,
    handler: wrapLeanListHandler<TListInput, TGivebutterPlan>(PLAN_LEAN, (input) =>
      service.plans().listPlans({ per_page: DEFAULT_PER_PAGE, ...input }),
    ),
  },
  list_all_plans: {
    name: 'list_all_plans',
    description:
      'Fetch ALL Givebutter recurring giving plans across all pages (bulk export, lean). Uses server-side pagination internally so only one tool call is needed. Honors same filters as `list_plans`. Default cap 500 pages (~50k rows); raise via `max_pages`.',
    schema: listAllShape,
    handler: wrapBulkListHandler<TListAllInput, TGivebutterPlan>(PLAN_LEAN, (input) =>
      service.plans().listPlans(input),
    ),
  },
  get_plan: {
    name: 'get_plan',
    description: 'Get a Givebutter recurring plan by ID (lean; pass `fields` for more).',
    schema: idShape,
    handler: wrapLeanItemHandler<TIdInput, TGivebutterPlan>(PLAN_LEAN, ({ id }) =>
      service.plans().getPlan(id),
    ),
  },
})
