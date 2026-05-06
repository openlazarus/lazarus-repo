import { TFieldList } from './response-projection'

export const CONTACT_LEAN: TFieldList = [
  'id',
  'first_name',
  'last_name',
  'primary_email',
  'primary_phone',
  'tags',
  'is_email_subscribed',
  'is_phone_subscribed',
] as const

export const CONTACT_SUMMARY: TFieldList = ['id', 'first_name', 'last_name', 'tags'] as const

export const CONTACT_ACTIVITY_LEAN: TFieldList = [
  'id',
  'contact_id',
  'type',
  'subject',
  'occurred_at',
] as const

export const CAMPAIGN_LEAN: TFieldList = [
  'id',
  'code',
  'title',
  'status',
  'goal',
  'raised',
  'donors',
] as const

export const CAMPAIGN_TEAM_LEAN: TFieldList = [
  'id',
  'campaign_id',
  'name',
  'goal',
  'raised',
  'supporters',
] as const

export const CAMPAIGN_TICKET_LEAN: TFieldList = [
  'id',
  'campaign_id',
  'name',
  'price',
  'active',
  'total_quantity',
] as const

export const CAMPAIGN_DISCOUNT_CODE_LEAN: TFieldList = [
  'id',
  'code',
  'type',
  'amount',
  'active',
] as const

export const TRANSACTION_LEAN: TFieldList = [
  'id',
  'status',
  'method',
  'amount',
  'donated',
  'contact_id',
  'campaign_id',
  'campaign_code',
  'created_at',
] as const

export const TRANSACTION_SUMMARY: TFieldList = [
  'id',
  'contact_id',
  'campaign_code',
  'donated',
] as const

export const PAYOUT_LEAN: TFieldList = ['id', 'amount', 'status', 'deposited_at'] as const

export const PLAN_LEAN: TFieldList = [
  'id',
  'contact_id',
  'campaign_id',
  'amount',
  'frequency',
  'status',
  'next_payment_at',
] as const

export const TICKET_LEAN: TFieldList = [
  'id',
  'campaign_id',
  'first_name',
  'last_name',
  'email',
  'status',
  'price',
] as const

export const TICKET_SUMMARY: TFieldList = ['id', 'campaign_id', 'email', 'status'] as const

export const FUND_LEAN: TFieldList = ['id', 'code', 'name', 'goal', 'raised', 'supporters'] as const

export const HOUSEHOLD_LEAN: TFieldList = ['id', 'name', 'head_contact_id'] as const

export const MESSAGE_LEAN: TFieldList = [
  'id',
  'status',
  'channel',
  'subject',
  'recipient_email',
  'sent_at',
] as const

export const PLEDGE_LEAN: TFieldList = [
  'id',
  'contact_id',
  'campaign_id',
  'amount',
  'status',
  'pledged_at',
] as const

export const PLEDGE_SUMMARY: TFieldList = [
  'id',
  'contact_id',
  'campaign_id',
  'amount',
  'status',
] as const

export const WEBHOOK_LEAN: TFieldList = ['id', 'url', 'events', 'enabled', 'last_status'] as const

export const WEBHOOK_ACTIVITY_LEAN: TFieldList = [
  'id',
  'webhook_id',
  'event',
  'status',
  'status_code',
  'delivered_at',
] as const

export const WEBHOOK_ACTIVITY_WITH_PAYLOAD: TFieldList = [
  ...WEBHOOK_ACTIVITY_LEAN,
  'payload',
] as const
