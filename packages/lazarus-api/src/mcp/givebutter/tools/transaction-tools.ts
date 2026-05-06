import { z } from 'zod'
import { IGivebutterService } from '@mcp/givebutter/givebutter.service.interface'
import { TToolRegistry } from '@mcp/givebutter/types/tool.types'
import {
  TCreateTransactionInput,
  TGivebutterTransaction,
  TTransactionListParams,
  TUpdateTransactionInput,
} from '@mcp/givebutter/types/givebutter.types'
import {
  bulkListShape,
  wrapBulkListHandler,
  wrapLeanItemHandler,
  wrapLeanListHandler,
  wrapToolHandler,
} from './tool-helpers'
import { TRANSACTION_LEAN, TRANSACTION_SUMMARY } from './lean-fields'

const filterShape = {
  query: z.string().optional(),
  contact_id: z.number().int().positive().optional().describe('Filter by contact ID.'),
  campaign_id: z.number().int().positive().optional().describe('Filter by campaign ID.'),
  status: z.string().optional().describe('Filter by status (e.g. succeeded, failed).'),
  method: z.string().optional().describe('Filter by payment method.'),
  from: z.string().optional().describe('Earliest transacted_at (ISO-8601).'),
  to: z.string().optional().describe('Latest transacted_at (ISO-8601).'),
  fields: z.array(z.string()).optional().describe('Extra fields to include.'),
  summary: z
    .boolean()
    .optional()
    .describe('Ultra-lean rows: id, contact_id, campaign_code, donated.'),
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
  id: z.string().min(1).describe('Givebutter transaction ID'),
  fields: z.array(z.string()).optional(),
}

const dedicationShape = z.object({
  type: z.string().optional(),
  name: z.string().optional(),
  recipient_name: z.string().optional(),
  recipient_email: z.string().email().optional(),
})

const createTxShape = {
  method: z.string().describe('Payment method (e.g. check, cash, offline)'),
  transacted_at: z.string().describe('Transaction timestamp (ISO 8601)'),
  amount: z.string().describe('Transaction amount as a string'),
  campaign_code: z.string().optional(),
  campaign_title: z.string().optional(),
  campaign_team_id: z.string().optional(),
  contact_id: z.number().int().positive().optional(),
  contact_external_id: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  address_1: z.string().optional(),
  address_2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipcode: z.string().optional(),
  country: z.string().optional(),
  fund_code: z.string().optional(),
  team_member_id: z.string().optional(),
  fee_covered: z.boolean().optional(),
  platform_fee: z.number().optional(),
  processing_fee: z.number().optional(),
  check_number: z.string().optional(),
  check_deposited_at: z.string().optional(),
  dedication_type: z.string().optional(),
  dedication_name: z.string().optional(),
  dedication_recipient_name: z.string().optional(),
  external_id: z.string().optional(),
  external_label: z.string().optional(),
  internal_note: z.string().optional(),
  timezone: z.string().optional(),
  acknowledgement_at: z.string().optional(),
  giving_space_message: z.string().optional(),
  appeal_code: z.string().optional(),
  appeal_name: z.string().optional(),
  appeal_status: z.string().optional(),
  mark_deposited: z.boolean().optional(),
}

const updateTxShape = {
  ...idShape,
  transaction_id: z.string().optional(),
  internal_note: z.string().max(255).optional(),
  check_number: z.string().max(255).optional(),
  check_deposited_at: z.string().optional(),
  custom_fields: z.array(z.string()).optional(),
  team_id: z.string().optional(),
  campaign_member_id: z.string().optional(),
  fund_id: z.string().optional(),
  campaign_id: z.string().optional(),
  method: z.string().optional(),
  transacted_at: z.string().optional(),
  appeal_id: z.string().optional(),
  offline_payment_received: z.string().optional(),
  dedication: dedicationShape.optional(),
}

type TListInput = TTransactionListParams & { fields?: string[]; summary?: boolean }
type TListAllInput = Omit<TTransactionListParams, 'page' | 'per_page'> & {
  fields?: string[]
  summary?: boolean
  max_pages?: number
  output_path?: string
}
type TIdInput = { id: string; fields?: string[] }
type TUpdateInput = { id: string } & TUpdateTransactionInput

const DEFAULT_PER_PAGE = 100

export const buildTransactionTools = (service: IGivebutterService): TToolRegistry => ({
  list_transactions: {
    name: 'list_transactions',
    description:
      'List Givebutter transactions (donations, purchases). Default page size 100 (max 100). Filter server-side with `contact_id`, `campaign_id`, `status`, `method`, `from`/`to`. Use `summary: true` for ultra-lean rows.',
    schema: listShape,
    handler: wrapLeanListHandler<TListInput, TGivebutterTransaction>(
      TRANSACTION_LEAN,
      (input) => service.transactions().listTransactions({ per_page: DEFAULT_PER_PAGE, ...input }),
      TRANSACTION_SUMMARY,
    ),
  },
  list_all_transactions: {
    name: 'list_all_transactions',
    description:
      'Fetch ALL Givebutter transactions across all pages (bulk export, lean). Uses server-side pagination internally so only one tool call is needed. Honors same filters as `list_transactions`. Default cap 500 pages (~50k rows); raise via `max_pages`.',
    schema: listAllShape,
    handler: wrapBulkListHandler<TListAllInput, TGivebutterTransaction>(
      TRANSACTION_LEAN,
      (input) => service.transactions().listTransactions(input),
      TRANSACTION_SUMMARY,
    ),
  },
  get_transaction: {
    name: 'get_transaction',
    description: 'Get a Givebutter transaction by ID (lean; pass `fields` for more).',
    schema: idShape,
    handler: wrapLeanItemHandler<TIdInput, TGivebutterTransaction>(TRANSACTION_LEAN, ({ id }) =>
      service.transactions().getTransaction(id),
    ),
  },
  create_transaction: {
    name: 'create_transaction',
    description: 'Create a Givebutter transaction (typically offline/check donations).',
    schema: createTxShape,
    handler: wrapToolHandler<TCreateTransactionInput>((input) =>
      service.transactions().createTransaction(input),
    ),
  },
  update_transaction: {
    name: 'update_transaction',
    description:
      'Update a Givebutter transaction by ID. IMPORTANT: Givebutter only allows updating transactions where is_offline=true. Transactions created via this API have is_offline=false and cannot be updated — only transactions manually entered in the Givebutter dashboard can be updated.',
    schema: updateTxShape,
    handler: wrapToolHandler<TUpdateInput>(({ id, ...rest }) =>
      service.transactions().updateTransaction(id, rest),
    ),
  },
})
