export type TGivebutterPagination = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export type TPaginated<T> = {
  data: T[]
  meta: TGivebutterPagination
}

export type TListParams = {
  page?: number
  per_page?: number
  query?: string
  [key: string]: unknown
}

export type TContactListParams = TListParams & {
  tag?: string
  tags?: string[]
  archived?: boolean
  email?: string
  phone?: string
}

export type TTransactionListParams = TListParams & {
  contact_id?: number
  campaign_id?: number
  status?: string
  method?: string
  from?: string
  to?: string
}

export type TTicketListParams = TListParams & {
  campaign_id?: number
  status?: string
}

export type TPlanListParams = TListParams & {
  contact_id?: number
  campaign_id?: number
  status?: string
}

export type TPledgeListParams = TListParams & {
  contact_id?: number
  campaign_id?: number
  status?: string
}

export type TGivebutterAddress = {
  address_1?: string
  address_2?: string
  city?: string
  state?: string
  zipcode?: string
  country?: string
}

export type TGivebutterEmail = {
  type?: string
  value: string
}

export type TGivebutterPhone = {
  type?: string
  value: string
}

export type TGivebutterContact = {
  id: number
  prefix?: string | null
  first_name?: string | null
  middle_name?: string | null
  last_name?: string | null
  suffix?: string | null
  gender?: string | null
  dob?: string | null
  company?: string | null
  title?: string | null
  twitter_url?: string | null
  linkedin_url?: string | null
  facebook_url?: string | null
  website_url?: string | null
  emails?: TGivebutterEmail[]
  phones?: TGivebutterPhone[]
  primary_email?: string | null
  primary_phone?: string | null
  addresses?: TGivebutterAddress[]
  tags?: string[]
  custom_fields?: Record<string, unknown>
  is_email_subscribed?: boolean
  is_phone_subscribed?: boolean
  is_address_subscribed?: boolean
  archived_at?: string | null
  created_at: string
  updated_at: string
}

export type TCreateContactInput = {
  prefix?: string
  first_name?: string
  middle_name?: string
  last_name?: string
  suffix?: string
  gender?: string
  dob?: string
  company?: string
  title?: string
  twitter_url?: string
  linkedin_url?: string
  facebook_url?: string
  website_url?: string
  emails?: TGivebutterEmail[]
  phones?: TGivebutterPhone[]
  addresses?: TGivebutterAddress[]
  tags?: string[]
  custom_fields?: Record<string, unknown>
}

export type TUpdateContactInput = Partial<TCreateContactInput>

export enum EContactActivityType {
  Email = 'email',
  Meeting = 'meeting',
  Note = 'note',
  PhoneCall = 'phone_call',
  Sms = 'sms',
  CompletedTask = 'completed_task',
  VolunteerActivity = 'volunteer_activity',
}

export type TGivebutterContactActivity = {
  id: number
  contact_id: number
  type: EContactActivityType
  note?: string | null
  subject?: string | null
  occurred_at?: string | null
  timezone?: string | null
  source?: string | null
  created_at: string
  updated_at: string
}

export type TCreateContactActivityInput = {
  type: EContactActivityType
  note?: string
  subject?: string
  occurred_at?: string
  timezone?: string
}

export type TUpdateContactActivityInput = Partial<TCreateContactActivityInput>

export type TGivebutterCampaign = {
  id: number
  code: string
  title: string
  subtitle?: string | null
  description?: string | null
  type?: string
  slug?: string
  url?: string
  goal?: number
  raised?: number
  donors?: number
  status?: string
  created_at: string
  updated_at: string
}

export type TCreateCampaignInput = {
  title: string
  subtitle?: string
  description?: string
  goal?: number
  type?: string
  slug?: string
}

export type TUpdateCampaignInput = Partial<TCreateCampaignInput>

export type TGivebutterCampaignMember = {
  id: number
  campaign_id: number
  first_name?: string | null
  last_name?: string | null
  display_name?: string | null
  email?: string | null
  goal?: number
  raised?: number
  donors?: number
  url?: string
  created_at: string
  updated_at: string
}

export type TGivebutterCampaignTeam = {
  id: number
  campaign_id: number
  name?: string | null
  slug?: string | null
  goal?: number
  raised?: number
  supporters?: number
  url?: string
  created_at: string
  updated_at: string
}

export type TGivebutterCampaignTicket = {
  id: number
  campaign_id: number
  name: string
  price: number
  retail_price?: number | null
  description?: string | null
  total_quantity?: number | null
  active?: boolean
  subtype?: string | null
  bundle_only?: boolean
  hide_remaining?: boolean
  scope?: string | null
  created_at: string
  updated_at: string
}

export type TCreateCampaignTicketInput = {
  name: string
  price: number
  total_quantity?: number
  subtype?: 'physical' | 'digital' | 'hybrid'
  active?: boolean
  retail_price?: number
  description?: string
  bundle_only?: boolean
  hide_remaining?: boolean
  scope?: 'registrant' | 'event'
  bundles?: string[]
  custom_fields?: string[]
  pictures?: string[]
}

export type TGivebutterDiscountCode = {
  id: number
  campaign_id: number
  code: string
  type: 'percentage' | 'fixed'
  amount: number
  active: boolean
  items?: string[] | null
  uses?: number | null
  starts_at?: string | null
  expires_at?: string | null
  created_at: string
  updated_at: string
}

export type TCreateDiscountCodeInput = {
  code: string
  type: 'percentage' | 'fixed'
  amount: number
  active: boolean
  items?: string[]
  uses?: number
  starts_at?: string
  expires_at?: string
}

export type TUpdateDiscountCodeInput = {
  amount: number
  code?: string
  type?: 'percentage' | 'fixed'
  active?: boolean
  items?: string[]
  uses?: number
  starts_at?: string
  expires_at?: string
}

export type TGivebutterTransaction = {
  id: string
  number?: string
  campaign_id?: number | null
  campaign_code?: string | null
  fund_id?: number | null
  plan_id?: string | null
  contact_id?: number | null
  method?: string
  status?: string
  amount?: number
  fee?: number
  donated?: number
  payout?: number
  currency?: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  giving_space?: { name?: string; amount?: number; message?: string } | null
  created_at: string
  updated_at: string
}

export type TDedication = {
  type?: string
  name?: string
  recipient_name?: string
  recipient_email?: string
}

export type TCreateTransactionInput = {
  method: string
  transacted_at: string
  amount: string
  campaign_code?: string
  campaign_title?: string
  campaign_team_id?: string
  contact_id?: number
  contact_external_id?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  company?: string
  address_1?: string
  address_2?: string
  city?: string
  state?: string
  zipcode?: string
  country?: string
  fund_code?: string
  team_member_id?: string
  fee_covered?: boolean
  platform_fee?: number
  processing_fee?: number
  check_number?: string
  check_deposited_at?: string
  dedication_type?: string
  dedication_name?: string
  dedication_recipient_name?: string
  external_id?: string
  external_label?: string
  internal_note?: string
  timezone?: string
  acknowledgement_at?: string
  giving_space_message?: string
  appeal_code?: string
  appeal_name?: string
  appeal_status?: string
  mark_deposited?: boolean
}

export type TUpdateTransactionInput = {
  transaction_id?: string
  internal_note?: string
  check_number?: string
  check_deposited_at?: string
  custom_fields?: string[]
  team_id?: string
  campaign_member_id?: string
  fund_id?: string
  campaign_id?: string
  method?: string
  transacted_at?: string
  appeal_id?: string
  offline_payment_received?: string
  dedication?: TDedication
}

export type TGivebutterPayout = {
  id: string
  amount?: number
  currency?: string
  status?: string
  deposited_at?: string | null
  created_at: string
  updated_at: string
}

export type TGivebutterPlan = {
  id: string
  contact_id?: number | null
  campaign_id?: number | null
  amount?: number
  frequency?: string
  status?: string
  next_payment_at?: string | null
  created_at: string
  updated_at: string
}

export type TGivebutterTicket = {
  id: number
  campaign_id?: number | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  type?: string
  status?: string
  price?: number
  created_at: string
  updated_at: string
}

export type TGivebutterFund = {
  id: string
  code?: string | null
  name: string
  description?: string | null
  goal?: number
  raised?: number
  supporters?: number
  created_at: string
  updated_at: string
}

export type TCreateFundInput = {
  name: string
  description?: string
  goal?: number
}

export type TUpdateFundInput = {
  name: string
  code?: string
}

export type TGivebutterHousehold = {
  id: number
  name: string
  head_contact_id?: number | null
  note?: string | null
  envelope_name?: string | null
  contacts?: TGivebutterContact[]
  created_at: string
  updated_at: string
}

export type TCreateHouseholdInput = {
  name: string
  head_contact_id?: number
  note?: string
  envelope_name?: string
}

export type TUpdateHouseholdInput = Partial<TCreateHouseholdInput>

export type TGivebutterMessage = {
  id: string
  status?: string
  channel?: string
  subject?: string | null
  recipient_id?: number | null
  recipient_email?: string | null
  sent_at?: string | null
  created_at: string
  updated_at: string
}

export type TGivebutterPledge = {
  id: number
  contact_id?: number | null
  campaign_id?: number | null
  amount?: number
  currency?: string
  status?: string
  pledged_at?: string | null
  fulfilled_at?: string | null
  created_at: string
  updated_at: string
}

export enum EWebhookEvent {
  CampaignCreated = 'campaign.created',
  CampaignUpdated = 'campaign.updated',
  TicketCreated = 'ticket.created',
  TransactionSucceeded = 'transaction.succeeded',
  ContactCreated = 'contact.created',
  PlanCanceled = 'plan.canceled',
  PlanCreated = 'plan.created',
  PlanFailed = 'plan.failed',
  PlanPaused = 'plan.paused',
  PlanResumed = 'plan.resumed',
  PlanUpdated = 'plan.updated',
  RefundCreated = 'refund.created',
}

export type TGivebutterWebhook = {
  id: string
  url: string
  events: EWebhookEvent[]
  name?: string | null
  enabled: boolean
  last_status?: string | null
  created_at: string
  updated_at: string
}

export type TCreateWebhookInput = {
  url: string
  events?: EWebhookEvent[]
  event?: EWebhookEvent
  name?: string
  enabled?: boolean
}

export type TUpdateWebhookInput = {
  url: string
  events: EWebhookEvent[]
  name?: string
  enabled?: boolean
}

export type TGivebutterWebhookActivity = {
  id: string
  webhook_id: string
  event: string
  status?: string
  status_code?: number
  attempts?: number
  payload?: Record<string, unknown>
  response?: string | null
  delivered_at?: string | null
  created_at: string
  updated_at: string
}
