import { IGivebutterContactsApi } from './api/contacts-api.service.interface'
import { IGivebutterContactActivitiesApi } from './api/contact-activities-api.service.interface'
import { IGivebutterCampaignsApi } from './api/campaigns-api.service.interface'
import { IGivebutterCampaignTeamsApi } from './api/campaign-teams-api.service.interface'
import { IGivebutterCampaignTicketsApi } from './api/campaign-tickets-api.service.interface'
import { IGivebutterCampaignDiscountCodesApi } from './api/campaign-discount-codes-api.service.interface'
import { IGivebutterTransactionsApi } from './api/transactions-api.service.interface'
import { IGivebutterPayoutsApi } from './api/payouts-api.service.interface'
import { IGivebutterPlansApi } from './api/plans-api.service.interface'
import { IGivebutterTicketsApi } from './api/tickets-api.service.interface'
import { IGivebutterFundsApi } from './api/funds-api.service.interface'
import { IGivebutterHouseholdsApi } from './api/households-api.service.interface'
import { IGivebutterMessagesApi } from './api/messages-api.service.interface'
import { IGivebutterPledgesApi } from './api/pledges-api.service.interface'
import { IGivebutterWebhooksApi } from './api/webhooks-api.service.interface'

export interface IGivebutterService {
  contacts(): IGivebutterContactsApi
  contactActivities(): IGivebutterContactActivitiesApi
  campaigns(): IGivebutterCampaignsApi
  campaignTeams(): IGivebutterCampaignTeamsApi
  campaignTickets(): IGivebutterCampaignTicketsApi
  campaignDiscountCodes(): IGivebutterCampaignDiscountCodesApi
  transactions(): IGivebutterTransactionsApi
  payouts(): IGivebutterPayoutsApi
  plans(): IGivebutterPlansApi
  tickets(): IGivebutterTicketsApi
  funds(): IGivebutterFundsApi
  households(): IGivebutterHouseholdsApi
  messages(): IGivebutterMessagesApi
  pledges(): IGivebutterPledgesApi
  webhooks(): IGivebutterWebhooksApi
}
