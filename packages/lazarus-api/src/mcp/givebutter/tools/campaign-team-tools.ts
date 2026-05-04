import { z } from 'zod'
import { IGivebutterService } from '@mcp/givebutter/givebutter.service.interface'
import { TToolRegistry } from '@mcp/givebutter/types/tool.types'
import { TGivebutterCampaignTeam } from '@mcp/givebutter/types/givebutter.types'
import {
  bulkListShape,
  wrapBulkListHandler,
  wrapLeanItemHandler,
  wrapLeanListHandler,
  wrapToolHandler,
} from './tool-helpers'
import { CAMPAIGN_TEAM_LEAN } from './lean-fields'

const teamIdShape = {
  campaign_id: z.number().int().positive().describe('Givebutter campaign ID'),
  team_id: z.number().int().positive().describe('Team ID'),
  fields: z.array(z.string()).optional(),
}

const filterShape = {
  campaign_id: z.number().int().positive().describe('Givebutter campaign ID'),
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

type TListInput = { campaign_id: number; page?: number; per_page?: number; fields?: string[] }
type TListAllInput = {
  campaign_id: number
  fields?: string[]
  max_pages?: number
  output_path?: string
}
type TTeamIdInput = { campaign_id: number; team_id: number; fields?: string[] }

const DEFAULT_PER_PAGE = 100

export const buildCampaignTeamTools = (service: IGivebutterService): TToolRegistry => ({
  list_campaign_teams: {
    name: 'list_campaign_teams',
    description: 'List teams within a Givebutter campaign. Default page size 100 (max 100).',
    schema: listShape,
    handler: wrapLeanListHandler<TListInput, TGivebutterCampaignTeam>(
      CAMPAIGN_TEAM_LEAN,
      ({ campaign_id, ...params }) =>
        service
          .campaignTeams()
          .listCampaignTeams(campaign_id, { per_page: DEFAULT_PER_PAGE, ...params }),
    ),
  },
  list_all_campaign_teams: {
    name: 'list_all_campaign_teams',
    description:
      'Fetch ALL teams within a Givebutter campaign across all pages (bulk export, lean). Uses server-side pagination internally so only one tool call is needed. Honors same filters as `list_campaign_teams`. Default cap 500 pages (~50k rows); raise via `max_pages`.',
    schema: listAllShape,
    handler: wrapBulkListHandler<TListAllInput, TGivebutterCampaignTeam>(
      CAMPAIGN_TEAM_LEAN,
      ({ campaign_id, ...params }) =>
        service.campaignTeams().listCampaignTeams(campaign_id, params),
    ),
  },
  get_campaign_team: {
    name: 'get_campaign_team',
    description: 'Get a specific team within a Givebutter campaign.',
    schema: teamIdShape,
    handler: wrapLeanItemHandler<TTeamIdInput, TGivebutterCampaignTeam>(
      CAMPAIGN_TEAM_LEAN,
      ({ campaign_id, team_id }) => service.campaignTeams().getCampaignTeam(campaign_id, team_id),
    ),
  },
  delete_campaign_team: {
    name: 'delete_campaign_team',
    description: 'Delete a team from a Givebutter campaign.',
    schema: {
      campaign_id: z.number().int().positive(),
      team_id: z.number().int().positive(),
    },
    handler: wrapToolHandler<{ campaign_id: number; team_id: number }>(
      async ({ campaign_id, team_id }) => {
        await service.campaignTeams().deleteCampaignTeam(campaign_id, team_id)
        return { deleted: true, campaign_id, team_id }
      },
    ),
  },
})
