import { z } from 'zod'
import { IGivebutterService } from '@mcp/givebutter/givebutter.service.interface'
import { TToolRegistry } from '@mcp/givebutter/types/tool.types'
import {
  TCreateCampaignInput,
  TGivebutterCampaign,
  TGivebutterCampaignMember,
  TListParams,
  TUpdateCampaignInput,
} from '@mcp/givebutter/types/givebutter.types'
import {
  bulkListShape,
  wrapBulkListHandler,
  wrapLeanItemHandler,
  wrapLeanListHandler,
  wrapToolHandler,
} from './tool-helpers'
import { CAMPAIGN_LEAN, CAMPAIGN_TEAM_LEAN } from './lean-fields'

const campaignsFilterShape = {
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
  ...campaignsFilterShape,
}

const campaignsListAllShape = {
  ...campaignsFilterShape,
  ...bulkListShape,
}

const idShape = {
  id: z.number().int().positive().describe('Givebutter campaign ID'),
  fields: z.array(z.string()).optional(),
}

const createCampaignShape = {
  title: z.string().min(1).describe('Campaign title'),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  goal: z.number().positive().optional(),
  type: z.string().optional().describe('Campaign type (e.g. fundraise, event, form)'),
  slug: z.string().optional(),
}

const updateCampaignShape = {
  id: z.number().int().positive(),
  ...createCampaignShape,
  title: z.string().optional(),
}
const membersFilterShape = {
  id: z.number().int().positive(),
  fields: z.array(z.string()).optional(),
}
const membersShape = {
  ...membersFilterShape,
  page: listShape.page,
  per_page: listShape.per_page,
}
const membersListAllShape = {
  ...membersFilterShape,
  ...bulkListShape,
}
const memberIdShape = {
  id: z.number().int().positive(),
  member_id: z.number().int().positive().describe('Campaign member ID'),
  fields: z.array(z.string()).optional(),
}

type TListInput = TListParams & { fields?: string[] }
type TListAllInput = Omit<TListParams, 'page' | 'per_page'> & {
  fields?: string[]
  max_pages?: number
  output_path?: string
}
type TIdInput = { id: number; fields?: string[] }
type TUpdateInput = { id: number } & TUpdateCampaignInput
type TMembersInput = { id: number; page?: number; per_page?: number; fields?: string[] }
type TMembersListAllInput = {
  id: number
  fields?: string[]
  max_pages?: number
  output_path?: string
}
type TMemberIdInput = { id: number; member_id: number; fields?: string[] }

const DEFAULT_PER_PAGE = 100

export const buildCampaignTools = (service: IGivebutterService): TToolRegistry => ({
  list_campaigns: {
    name: 'list_campaigns',
    description: 'List Givebutter campaigns. Default page size 100 (max 100).',
    schema: listShape,
    handler: wrapLeanListHandler<TListInput, TGivebutterCampaign>(CAMPAIGN_LEAN, (input) =>
      service.campaigns().listCampaigns({ per_page: DEFAULT_PER_PAGE, ...input }),
    ),
  },
  list_all_campaigns: {
    name: 'list_all_campaigns',
    description:
      'Fetch ALL Givebutter campaigns across all pages (bulk export, lean). Uses server-side pagination internally so only one tool call is needed. Honors same filters as `list_campaigns`. Default cap 500 pages (~50k rows); raise via `max_pages`.',
    schema: campaignsListAllShape,
    handler: wrapBulkListHandler<TListAllInput, TGivebutterCampaign>(CAMPAIGN_LEAN, (input) =>
      service.campaigns().listCampaigns(input),
    ),
  },
  get_campaign: {
    name: 'get_campaign',
    description: 'Get a Givebutter campaign by ID (lean; pass `fields` for more).',
    schema: idShape,
    handler: wrapLeanItemHandler<TIdInput, TGivebutterCampaign>(CAMPAIGN_LEAN, ({ id }) =>
      service.campaigns().getCampaign(id),
    ),
  },
  create_campaign: {
    name: 'create_campaign',
    description: 'Create a new Givebutter campaign.',
    schema: createCampaignShape,
    handler: wrapToolHandler<TCreateCampaignInput>((input) =>
      service.campaigns().createCampaign(input),
    ),
  },
  update_campaign: {
    name: 'update_campaign',
    description: 'Update an existing Givebutter campaign by ID.',
    schema: updateCampaignShape,
    handler: wrapToolHandler<TUpdateInput>(({ id, ...rest }) =>
      service.campaigns().updateCampaign(id, rest),
    ),
  },
  archive_campaign: {
    name: 'archive_campaign',
    description: 'Archive (soft-delete) a Givebutter campaign by ID.',
    schema: { id: z.number().int().positive() },
    handler: wrapToolHandler<{ id: number }>(async ({ id }) => {
      await service.campaigns().archiveCampaign(id)
      return { archived: true, id }
    }),
  },
  list_campaign_members: {
    name: 'list_campaign_members',
    description: 'List team-fundraising members of a Givebutter campaign.',
    schema: membersShape,
    handler: wrapLeanListHandler<TMembersInput, TGivebutterCampaignMember>(
      CAMPAIGN_TEAM_LEAN,
      ({ id, ...params }) =>
        service.campaigns().listCampaignMembers(id, { per_page: DEFAULT_PER_PAGE, ...params }),
    ),
  },
  list_all_campaign_members: {
    name: 'list_all_campaign_members',
    description:
      'Fetch ALL team-fundraising members of a Givebutter campaign across all pages (bulk export, lean). Uses server-side pagination internally so only one tool call is needed. Honors same filters as `list_campaign_members`. Default cap 500 pages (~50k rows); raise via `max_pages`.',
    schema: membersListAllShape,
    handler: wrapBulkListHandler<TMembersListAllInput, TGivebutterCampaignMember>(
      CAMPAIGN_TEAM_LEAN,
      ({ id, ...params }) => service.campaigns().listCampaignMembers(id, params),
    ),
  },
  get_campaign_member: {
    name: 'get_campaign_member',
    description: 'Get a specific member of a Givebutter campaign.',
    schema: memberIdShape,
    handler: wrapLeanItemHandler<TMemberIdInput, TGivebutterCampaignMember>(
      CAMPAIGN_TEAM_LEAN,
      ({ id, member_id }) => service.campaigns().getCampaignMember(id, member_id),
    ),
  },
  delete_campaign_member: {
    name: 'delete_campaign_member',
    description: 'Remove a member from a Givebutter campaign.',
    schema: {
      id: z.number().int().positive(),
      member_id: z.number().int().positive(),
    },
    handler: wrapToolHandler<{ id: number; member_id: number }>(async ({ id, member_id }) => {
      await service.campaigns().deleteCampaignMember(id, member_id)
      return { deleted: true, campaign_id: id, member_id }
    }),
  },
})
