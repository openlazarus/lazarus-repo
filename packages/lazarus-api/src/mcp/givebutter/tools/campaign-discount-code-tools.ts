import { z } from 'zod'
import { IGivebutterService } from '@mcp/givebutter/givebutter.service.interface'
import { TToolRegistry } from '@mcp/givebutter/types/tool.types'
import {
  TCreateDiscountCodeInput,
  TGivebutterDiscountCode,
  TUpdateDiscountCodeInput,
} from '@mcp/givebutter/types/givebutter.types'
import {
  bulkListShape,
  wrapBulkListHandler,
  wrapLeanItemHandler,
  wrapLeanListHandler,
  wrapToolHandler,
} from './tool-helpers'
import { CAMPAIGN_DISCOUNT_CODE_LEAN } from './lean-fields'

const discountType = z.enum(['percentage', 'fixed'])
const campaignIdShape = {
  campaign_id: z.number().int().positive().describe('Givebutter campaign ID'),
}
const codeIdShape = {
  ...campaignIdShape,
  code_id: z.number().int().positive().describe('Discount code ID'),
  fields: z.array(z.string()).optional(),
}

const filterShape = {
  ...campaignIdShape,
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
  ...campaignIdShape,
  code: z.string().min(1).max(255),
  type: discountType,
  amount: z.number().min(1),
  active: z.boolean(),
  items: z.array(z.string()).optional(),
  uses: z.number().int().min(1).optional(),
  starts_at: z.string().optional(),
  expires_at: z.string().optional(),
}

const updateShape = {
  ...codeIdShape,
  amount: z.number().min(1).max(100),
  code: z.string().max(255).optional(),
  type: discountType.optional(),
  active: z.boolean().optional(),
  items: z.array(z.string()).optional(),
  uses: z.number().int().min(1).optional(),
  starts_at: z.string().optional(),
  expires_at: z.string().optional(),
}

type TListInput = { campaign_id: number; page?: number; per_page?: number; fields?: string[] }
type TListAllInput = {
  campaign_id: number
  fields?: string[]
  max_pages?: number
  output_path?: string
}
type TCodeIdInput = { campaign_id: number; code_id: number; fields?: string[] }
type TCreateInput = { campaign_id: number } & TCreateDiscountCodeInput
type TUpdateInput = { campaign_id: number; code_id: number } & TUpdateDiscountCodeInput

export const buildCampaignDiscountCodeTools = (service: IGivebutterService): TToolRegistry => ({
  list_campaign_discount_codes: {
    name: 'list_campaign_discount_codes',
    description: 'List discount codes for a Givebutter campaign. Default page size 100 (max 100).',
    schema: listShape,
    handler: wrapLeanListHandler<TListInput, TGivebutterDiscountCode>(
      CAMPAIGN_DISCOUNT_CODE_LEAN,
      ({ campaign_id, ...params }) =>
        service
          .campaignDiscountCodes()
          .listDiscountCodes(campaign_id, { per_page: DEFAULT_PER_PAGE, ...params }),
    ),
  },
  list_all_campaign_discount_codes: {
    name: 'list_all_campaign_discount_codes',
    description:
      'Fetch ALL discount codes for a Givebutter campaign across all pages (bulk export, lean). Uses server-side pagination internally so only one tool call is needed. Honors same filters as `list_campaign_discount_codes`. Default cap 500 pages (~50k rows); raise via `max_pages`.',
    schema: listAllShape,
    handler: wrapBulkListHandler<TListAllInput, TGivebutterDiscountCode>(
      CAMPAIGN_DISCOUNT_CODE_LEAN,
      ({ campaign_id, ...params }) =>
        service.campaignDiscountCodes().listDiscountCodes(campaign_id, params),
    ),
  },
  get_campaign_discount_code: {
    name: 'get_campaign_discount_code',
    description: 'Get a specific discount code for a Givebutter campaign.',
    schema: codeIdShape,
    handler: wrapLeanItemHandler<TCodeIdInput, TGivebutterDiscountCode>(
      CAMPAIGN_DISCOUNT_CODE_LEAN,
      ({ campaign_id, code_id }) =>
        service.campaignDiscountCodes().getDiscountCode(campaign_id, code_id),
    ),
  },
  create_campaign_discount_code: {
    name: 'create_campaign_discount_code',
    description: 'Create a discount code on a Givebutter campaign.',
    schema: createShape,
    handler: wrapToolHandler<TCreateInput>(({ campaign_id, ...rest }) =>
      service.campaignDiscountCodes().createDiscountCode(campaign_id, rest),
    ),
  },
  update_campaign_discount_code: {
    name: 'update_campaign_discount_code',
    description: 'Update a Givebutter campaign discount code.',
    schema: updateShape,
    handler: wrapToolHandler<TUpdateInput>(({ campaign_id, code_id, ...rest }) =>
      service.campaignDiscountCodes().updateDiscountCode(campaign_id, code_id, rest),
    ),
  },
  delete_campaign_discount_code: {
    name: 'delete_campaign_discount_code',
    description: 'Delete a Givebutter campaign discount code.',
    schema: {
      campaign_id: z.number().int().positive(),
      code_id: z.number().int().positive(),
    },
    handler: wrapToolHandler<{ campaign_id: number; code_id: number }>(
      async ({ campaign_id, code_id }) => {
        await service.campaignDiscountCodes().deleteDiscountCode(campaign_id, code_id)
        return { deleted: true, campaign_id, code_id }
      },
    ),
  },
})
