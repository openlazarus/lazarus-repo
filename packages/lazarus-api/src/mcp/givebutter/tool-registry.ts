import { IGivebutterService } from './givebutter.service.interface'
import { TToolRegistry } from './types/tool.types'
import { buildContactTools } from './tools/contact-tools'
import { buildContactActivityTools } from './tools/contact-activity-tools'
import { buildCampaignTools } from './tools/campaign-tools'
import { buildCampaignTeamTools } from './tools/campaign-team-tools'
import { buildCampaignTicketTools } from './tools/campaign-ticket-tools'
import { buildCampaignDiscountCodeTools } from './tools/campaign-discount-code-tools'
import { buildTransactionTools } from './tools/transaction-tools'
import { buildPayoutTools } from './tools/payout-tools'
import { buildPlanTools } from './tools/plan-tools'
import { buildTicketTools } from './tools/ticket-tools'
import { buildFundTools } from './tools/fund-tools'
import { buildHouseholdTools } from './tools/household-tools'
import { buildMessageTools } from './tools/message-tools'
import { buildPledgeTools } from './tools/pledge-tools'
import { buildWebhookTools } from './tools/webhook-tools'

export const buildGivebutterTools = (service: IGivebutterService): TToolRegistry => ({
  ...buildContactTools(service),
  ...buildContactActivityTools(service),
  ...buildCampaignTools(service),
  ...buildCampaignTeamTools(service),
  ...buildCampaignTicketTools(service),
  ...buildCampaignDiscountCodeTools(service),
  ...buildTransactionTools(service),
  ...buildPayoutTools(service),
  ...buildPlanTools(service),
  ...buildTicketTools(service),
  ...buildFundTools(service),
  ...buildHouseholdTools(service),
  ...buildMessageTools(service),
  ...buildPledgeTools(service),
  ...buildWebhookTools(service),
})
