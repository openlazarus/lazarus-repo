import { z } from 'zod'
import { IGivebutterService } from '@mcp/givebutter/givebutter.service.interface'
import { TToolRegistry } from '@mcp/givebutter/types/tool.types'
import { TGivebutterMessage, TListParams } from '@mcp/givebutter/types/givebutter.types'
import {
  bulkListShape,
  wrapBulkListHandler,
  wrapLeanItemHandler,
  wrapLeanListHandler,
} from './tool-helpers'
import { MESSAGE_LEAN } from './lean-fields'

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
  id: z.string().min(1).describe('Givebutter message ID'),
  fields: z.array(z.string()).optional(),
}

type TListInput = TListParams & { fields?: string[] }
type TListAllInput = Omit<TListParams, 'page' | 'per_page'> & {
  fields?: string[]
  max_pages?: number
  output_path?: string
}
type TIdInput = { id: string; fields?: string[] }

const DEFAULT_PER_PAGE = 100

export const buildMessageTools = (service: IGivebutterService): TToolRegistry => ({
  list_messages: {
    name: 'list_messages',
    description:
      'List Givebutter messages sent (email/SMS receipts). Default page size 100 (max 100).',
    schema: listShape,
    handler: wrapLeanListHandler<TListInput, TGivebutterMessage>(MESSAGE_LEAN, (input) =>
      service.messages().listMessages({ per_page: DEFAULT_PER_PAGE, ...input }),
    ),
  },
  list_all_messages: {
    name: 'list_all_messages',
    description:
      'Fetch ALL Givebutter messages (email/SMS receipts) across all pages (bulk export, lean). Uses server-side pagination internally so only one tool call is needed. Honors same filters as `list_messages`. Default cap 500 pages (~50k rows); raise via `max_pages`.',
    schema: listAllShape,
    handler: wrapBulkListHandler<TListAllInput, TGivebutterMessage>(MESSAGE_LEAN, (input) =>
      service.messages().listMessages(input),
    ),
  },
  get_message: {
    name: 'get_message',
    description: 'Get a Givebutter message by ID (lean; pass `fields` for more).',
    schema: idShape,
    handler: wrapLeanItemHandler<TIdInput, TGivebutterMessage>(MESSAGE_LEAN, ({ id }) =>
      service.messages().getMessage(id),
    ),
  },
})
