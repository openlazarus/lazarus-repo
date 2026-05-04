import { IGivebutterService } from './givebutter.service.interface'
import { IGivebutterHttpClient } from './infrastructure/givebutter-http-client.interface'
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
import { GivebutterContactsApi } from './api/contacts-api.service'
import { GivebutterContactActivitiesApi } from './api/contact-activities-api.service'
import { GivebutterCampaignsApi } from './api/campaigns-api.service'
import { GivebutterCampaignTeamsApi } from './api/campaign-teams-api.service'
import { GivebutterCampaignTicketsApi } from './api/campaign-tickets-api.service'
import { GivebutterCampaignDiscountCodesApi } from './api/campaign-discount-codes-api.service'
import { GivebutterTransactionsApi } from './api/transactions-api.service'
import { GivebutterPayoutsApi } from './api/payouts-api.service'
import { GivebutterPlansApi } from './api/plans-api.service'
import { GivebutterTicketsApi } from './api/tickets-api.service'
import { GivebutterFundsApi } from './api/funds-api.service'
import { GivebutterHouseholdsApi } from './api/households-api.service'
import { GivebutterMessagesApi } from './api/messages-api.service'
import { GivebutterPledgesApi } from './api/pledges-api.service'
import { GivebutterWebhooksApi } from './api/webhooks-api.service'

export class GivebutterService implements IGivebutterService {
  private readonly contactsApi: IGivebutterContactsApi
  private readonly contactActivitiesApi: IGivebutterContactActivitiesApi
  private readonly campaignsApi: IGivebutterCampaignsApi
  private readonly campaignTeamsApi: IGivebutterCampaignTeamsApi
  private readonly campaignTicketsApi: IGivebutterCampaignTicketsApi
  private readonly campaignDiscountCodesApi: IGivebutterCampaignDiscountCodesApi
  private readonly transactionsApi: IGivebutterTransactionsApi
  private readonly payoutsApi: IGivebutterPayoutsApi
  private readonly plansApi: IGivebutterPlansApi
  private readonly ticketsApi: IGivebutterTicketsApi
  private readonly fundsApi: IGivebutterFundsApi
  private readonly householdsApi: IGivebutterHouseholdsApi
  private readonly messagesApi: IGivebutterMessagesApi
  private readonly pledgesApi: IGivebutterPledgesApi
  private readonly webhooksApi: IGivebutterWebhooksApi

  constructor(http: IGivebutterHttpClient) {
    this.contactsApi = new GivebutterContactsApi(http)
    this.contactActivitiesApi = new GivebutterContactActivitiesApi(http)
    this.campaignsApi = new GivebutterCampaignsApi(http)
    this.campaignTeamsApi = new GivebutterCampaignTeamsApi(http)
    this.campaignTicketsApi = new GivebutterCampaignTicketsApi(http)
    this.campaignDiscountCodesApi = new GivebutterCampaignDiscountCodesApi(http)
    this.transactionsApi = new GivebutterTransactionsApi(http)
    this.payoutsApi = new GivebutterPayoutsApi(http)
    this.plansApi = new GivebutterPlansApi(http)
    this.ticketsApi = new GivebutterTicketsApi(http)
    this.fundsApi = new GivebutterFundsApi(http)
    this.householdsApi = new GivebutterHouseholdsApi(http)
    this.messagesApi = new GivebutterMessagesApi(http)
    this.pledgesApi = new GivebutterPledgesApi(http)
    this.webhooksApi = new GivebutterWebhooksApi(http)
  }

  contacts(): IGivebutterContactsApi {
    return this.contactsApi
  }
  contactActivities(): IGivebutterContactActivitiesApi {
    return this.contactActivitiesApi
  }
  campaigns(): IGivebutterCampaignsApi {
    return this.campaignsApi
  }
  campaignTeams(): IGivebutterCampaignTeamsApi {
    return this.campaignTeamsApi
  }
  campaignTickets(): IGivebutterCampaignTicketsApi {
    return this.campaignTicketsApi
  }
  campaignDiscountCodes(): IGivebutterCampaignDiscountCodesApi {
    return this.campaignDiscountCodesApi
  }
  transactions(): IGivebutterTransactionsApi {
    return this.transactionsApi
  }
  payouts(): IGivebutterPayoutsApi {
    return this.payoutsApi
  }
  plans(): IGivebutterPlansApi {
    return this.plansApi
  }
  tickets(): IGivebutterTicketsApi {
    return this.ticketsApi
  }
  funds(): IGivebutterFundsApi {
    return this.fundsApi
  }
  households(): IGivebutterHouseholdsApi {
    return this.householdsApi
  }
  messages(): IGivebutterMessagesApi {
    return this.messagesApi
  }
  pledges(): IGivebutterPledgesApi {
    return this.pledgesApi
  }
  webhooks(): IGivebutterWebhooksApi {
    return this.webhooksApi
  }
}
