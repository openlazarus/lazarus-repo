import type { PhoneConfig } from './whatsapp-phone.repository'

export interface IWhatsAppPhoneRepository {
  /** Get the phone configuration for an agent. */
  getPhoneConfig(workspaceId: string, agentId: string): Promise<PhoneConfig | null>
  /** Delete the phone number DB record for an agent. */
  deletePhoneRecord(workspaceId: string, agentId: string): Promise<boolean>
  /** Disconnect from Kapso and delete the DB record. */
  disconnectAndCleanup(workspaceId: string, agentId: string): Promise<boolean>
  /** Get phone config by phone_number_id (for webhook routing). */
  getPhoneConfigByPhoneNumberId(phoneNumberId: string): Promise<PhoneConfig | null>
  /** Get the business_account_id, fetching from Kapso if not cached. */
  getBusinessAccountId(workspaceId: string, agentId: string): Promise<string | null>
  /** Update Meta-sourced fields in the DB. */
  updateMetaFields(
    workspaceId: string,
    agentId: string,
    fields: Record<string, string | undefined>,
  ): Promise<boolean>
  /** Get phone config for webhook verification. */
  getPhoneConfigForWebhook(
    phoneNumberId: string,
  ): Promise<{ workspace_id: string; agent_id: string; webhook_secret: string | null } | null>
  /** Get the phone_number_id for a connected agent. */
  getPhoneNumberIdForAgent(workspaceId: string, agentId: string): Promise<string | null>
  /** Get agent WhatsApp config (phone number + display name). */
  getAgentWhatsAppConfig(
    workspaceId: string,
    agentId: string,
  ): Promise<{ phoneNumber: string; phoneNumberId: string; displayName?: string } | null>
  /** Get the full phone config record. */
  getFullPhoneConfig(workspaceId: string, agentId: string): Promise<Record<string, any> | null>
  /** List all phone numbers for a workspace. */
  listPhoneNumbers(workspaceId: string): Promise<any[]>
  /** Check if an agent has a phone number configured. */
  checkAgentHasPhone(workspaceId: string, agentId: string): Promise<boolean>
  /** Insert a new phone number record. */
  insertPhoneNumber(params: {
    workspace_id: string
    agent_id: string
    phone_number: string
    phone_number_id: string
    display_name?: string
    kapso_customer_id?: string
    business_account_id?: string | null
    status: string
    webhook_secret: string
    connected_at: string
  }): Promise<Record<string, any>>
  /** Update the display name of a phone number. */
  updateDisplayName(workspaceId: string, agentId: string, displayName: string): Promise<boolean>
}
