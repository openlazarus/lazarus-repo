import { z } from 'zod'
import { IGivebutterService } from '@mcp/givebutter/givebutter.service.interface'
import { TToolRegistry } from '@mcp/givebutter/types/tool.types'
import {
  TCreateFundInput,
  TGivebutterFund,
  TListParams,
  TUpdateFundInput,
} from '@mcp/givebutter/types/givebutter.types'
import {
  bulkListShape,
  wrapBulkListHandler,
  wrapLeanItemHandler,
  wrapLeanListHandler,
  wrapToolHandler,
} from './tool-helpers'
import { FUND_LEAN } from './lean-fields'

const filterShape = {
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
  id: z.string().min(1).describe('Givebutter fund ID'),
  fields: z.array(z.string()).optional(),
}

const DEFAULT_PER_PAGE = 100

const createFundShape = {
  name: z.string().min(1).describe('Fund name'),
  description: z.string().optional(),
  goal: z.number().positive().optional(),
}

const updateFundShape = {
  id: z.string().min(1),
  name: z.string().min(1).max(255).describe('Fund name'),
  code: z.string().max(255).optional(),
}

type TListInput = TListParams & { fields?: string[] }
type TListAllInput = Omit<TListParams, 'page' | 'per_page'> & {
  fields?: string[]
  max_pages?: number
  output_path?: string
}
type TIdInput = { id: string; fields?: string[] }
type TUpdateInput = { id: string } & TUpdateFundInput

export const buildFundTools = (service: IGivebutterService): TToolRegistry => ({
  list_funds: {
    name: 'list_funds',
    description: 'List Givebutter fund designations. Default page size 100 (max 100).',
    schema: listShape,
    handler: wrapLeanListHandler<TListInput, TGivebutterFund>(FUND_LEAN, (input) =>
      service.funds().listFunds({ per_page: DEFAULT_PER_PAGE, ...input }),
    ),
  },
  list_all_funds: {
    name: 'list_all_funds',
    description:
      'Fetch ALL Givebutter fund designations across all pages (bulk export, lean). Uses server-side pagination internally so only one tool call is needed. Honors same filters as `list_funds`. Default cap 500 pages (~50k rows); raise via `max_pages`.',
    schema: listAllShape,
    handler: wrapBulkListHandler<TListAllInput, TGivebutterFund>(FUND_LEAN, (input) =>
      service.funds().listFunds(input),
    ),
  },
  get_fund: {
    name: 'get_fund',
    description: 'Get a Givebutter fund by ID (lean; pass `fields` for more).',
    schema: idShape,
    handler: wrapLeanItemHandler<TIdInput, TGivebutterFund>(FUND_LEAN, ({ id }) =>
      service.funds().getFund(id),
    ),
  },
  create_fund: {
    name: 'create_fund',
    description: 'Create a new Givebutter fund designation.',
    schema: createFundShape,
    handler: wrapToolHandler<TCreateFundInput>((input) => service.funds().createFund(input)),
  },
  update_fund: {
    name: 'update_fund',
    description: 'Update a Givebutter fund by ID.',
    schema: updateFundShape,
    handler: wrapToolHandler<TUpdateInput>(({ id, ...rest }) =>
      service.funds().updateFund(id, rest),
    ),
  },
  archive_fund: {
    name: 'archive_fund',
    description: 'Archive (delete) a Givebutter fund by ID.',
    schema: { id: z.string().min(1) },
    handler: wrapToolHandler<{ id: string }>(async ({ id }) => {
      await service.funds().archiveFund(id)
      return { archived: true, id }
    }),
  },
})
