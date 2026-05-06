/**
 * WhatsApp Phone Number Repository
 *
 * Encapsulates database and Kapso operations for WhatsApp phone numbers.
 */

import { supabase } from '@infrastructure/database/supabase'
import { kapsoService } from '@domains/whatsapp/service/kapso-service'
import type { IWhatsAppPhoneRepository } from './whatsapp-phone.repository.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('whatsapp-phone')

export interface PhoneConfig {
  phone_number_id: string
  workspace_id: string
  agent_id: string
  status: string | null
  business_account_id?: string | null
  quality_rating?: string | null
  name_status?: string | null
  account_mode?: string | null
  messaging_limit_tier?: string | null
}

export class WhatsAppPhoneRepository implements IWhatsAppPhoneRepository {
  /**
   * Get the phone configuration for an agent.
   */
  async getPhoneConfig(workspaceId: string, agentId: string): Promise<PhoneConfig | null> {
    const { data, error } = await supabase
      .from('whatsapp_phone_numbers')
      .select(
        'phone_number_id, workspace_id, agent_id, status, business_account_id, quality_rating, name_status, account_mode, messaging_limit_tier',
      )
      .eq('workspace_id', workspaceId)
      .eq('agent_id', agentId)
      .single()

    if (error && error.code !== 'PGRST116') {
      log.error({ err: error }, `Error fetching phone config for agent ${agentId}:`)
    }

    return data
  }

  /**
   * Delete the phone number DB record for an agent.
   */
  async deletePhoneRecord(workspaceId: string, agentId: string): Promise<boolean> {
    const { error } = await supabase
      .from('whatsapp_phone_numbers')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('agent_id', agentId)

    if (error) {
      log.error({ err: error }, `Failed to delete phone record for agent ${agentId}:`)
      return false
    }

    return true
  }

  /**
   * Disconnect a phone number from Kapso and delete the DB record.
   * Returns true if cleanup was performed, false if no phone was configured.
   */
  async disconnectAndCleanup(workspaceId: string, agentId: string): Promise<boolean> {
    const phoneConfig = await this.getPhoneConfig(workspaceId, agentId)
    if (!phoneConfig) {
      return false
    }

    if (kapsoService.isConfigured()) {
      // 1. Remove all webhooks before disconnecting the phone number
      //    (once the phone is deleted from Kapso, we can no longer reference it)
      try {
        const webhooks = await kapsoService.listPhoneWebhooks(phoneConfig.phone_number_id)
        for (const webhook of webhooks) {
          try {
            await kapsoService.deletePhoneWebhook(phoneConfig.phone_number_id, webhook.id)
            log.info(`Deleted webhook ${webhook.id} for agent ${agentId}`)
          } catch (webhookError) {
            log.error({ err: webhookError }, `Failed to delete webhook ${webhook.id}:`)
          }
        }
      } catch (listError) {
        log.error({ err: listError }, `Failed to list webhooks for cleanup:`)
      }

      // 2. Disconnect phone number from Kapso
      try {
        await kapsoService.disconnectPhoneNumber(phoneConfig.phone_number_id)
        log.info(`Disconnected phone from Kapso for agent ${agentId}`)
      } catch (kapsoError) {
        log.error({ err: kapsoError }, `Failed to disconnect from Kapso for agent ${agentId}:`)
      }
    }

    // Delete DB record
    const deleted = await this.deletePhoneRecord(workspaceId, agentId)
    if (deleted) {
      log.info(`Cleaned up WhatsApp phone number for agent ${agentId}`)
    }

    return deleted
  }
  /**
   * Get phone config by phone_number_id (for webhook routing).
   */
  async getPhoneConfigByPhoneNumberId(phoneNumberId: string): Promise<PhoneConfig | null> {
    const { data, error } = await supabase
      .from('whatsapp_phone_numbers')
      .select(
        'phone_number_id, workspace_id, agent_id, status, business_account_id, quality_rating, name_status, account_mode, messaging_limit_tier',
      )
      .eq('phone_number_id', phoneNumberId)
      .eq('status', 'connected')
      .single()

    if (error && error.code !== 'PGRST116') {
      log.error({ err: error }, `Error fetching phone config for phoneNumberId ${phoneNumberId}:`)
    }

    return data
  }

  /**
   * Get the business_account_id for an agent, fetching from Kapso if not cached.
   */
  async getBusinessAccountId(workspaceId: string, agentId: string): Promise<string | null> {
    const phoneConfig = await this.getPhoneConfig(workspaceId, agentId)
    if (!phoneConfig) return null

    if (phoneConfig.business_account_id) {
      return phoneConfig.business_account_id
    }

    // Try fetching live from Kapso
    if (kapsoService.isConfigured()) {
      try {
        const phoneDetails = await kapsoService.getPhoneNumber(phoneConfig.phone_number_id)
        if (phoneDetails.businessAccountId) {
          await this.updateMetaFields(workspaceId, agentId, {
            business_account_id: phoneDetails.businessAccountId,
            quality_rating: phoneDetails.qualityRating,
            name_status: phoneDetails.nameStatus,
            account_mode: phoneDetails.accountMode,
            messaging_limit_tier: phoneDetails.messagingLimitTier,
          })
          return phoneDetails.businessAccountId
        }
      } catch (err) {
        log.warn({ data: err }, `Could not fetch business account ID from Kapso:`)
      }
    }

    return null
  }

  /**
   * Update Meta-sourced fields (business_account_id, quality_rating) in the DB.
   */
  async updateMetaFields(
    workspaceId: string,
    agentId: string,
    fields: Record<string, string | undefined>,
  ): Promise<boolean> {
    const updateData = Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null))

    if (Object.keys(updateData).length === 0) return true

    const { error } = await supabase
      .from('whatsapp_phone_numbers')
      .update(updateData)
      .eq('workspace_id', workspaceId)
      .eq('agent_id', agentId)

    if (error) {
      log.error({ err: error }, `Failed to update meta fields for agent ${agentId}:`)
      return false
    }

    return true
  }

  // ---------------------------------------------------------------------------
  // Extended queries for routes & tools
  // ---------------------------------------------------------------------------

  async getPhoneConfigForWebhook(
    phoneNumberId: string,
  ): Promise<{ workspace_id: string; agent_id: string; webhook_secret: string | null } | null> {
    const { data, error } = await supabase
      .from('whatsapp_phone_numbers')
      .select('workspace_id, agent_id, webhook_secret')
      .eq('phone_number_id', phoneNumberId)
      .eq('status', 'connected')
      .single()

    if (error) {
      if (error.code !== 'PGRST116') {
        log.error({ err: error }, `Error fetching webhook config for ${phoneNumberId}:`)
      }
      return null
    }

    return data
  }

  async getPhoneNumberIdForAgent(workspaceId: string, agentId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('whatsapp_phone_numbers')
      .select('phone_number_id')
      .eq('workspace_id', workspaceId)
      .eq('agent_id', agentId)
      .eq('status', 'connected')
      .single()

    if (error) {
      if (error.code !== 'PGRST116') {
        log.error({ err: error }, `Error fetching phone number ID for agent ${agentId}:`)
      }
      return null
    }

    return data?.phone_number_id ?? null
  }

  async getAgentWhatsAppConfig(
    workspaceId: string,
    agentId: string,
  ): Promise<{ phoneNumber: string; phoneNumberId: string; displayName?: string } | null> {
    const { data, error } = await supabase
      .from('whatsapp_phone_numbers')
      .select('phone_number, phone_number_id, display_name')
      .eq('workspace_id', workspaceId)
      .eq('agent_id', agentId)
      .eq('status', 'connected')
      .single()

    if (error || !data) {
      return null
    }

    return {
      phoneNumber: data.phone_number,
      phoneNumberId: data.phone_number_id,
      displayName: data.display_name ?? undefined,
    }
  }

  async getFullPhoneConfig(
    workspaceId: string,
    agentId: string,
  ): Promise<Record<string, any> | null> {
    const { data, error } = await supabase
      .from('whatsapp_phone_numbers')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('agent_id', agentId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return data
  }

  async listPhoneNumbers(workspaceId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('whatsapp_phone_numbers')
      .select('*')
      .eq('workspace_id', workspaceId)

    if (error) {
      throw error
    }

    return data ?? []
  }

  async checkAgentHasPhone(workspaceId: string, agentId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('whatsapp_phone_numbers')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('agent_id', agentId)
      .single()

    if (error && error.code !== 'PGRST116') {
      log.error({ err: error }, `Error checking agent phone:`)
    }

    return !!data
  }

  async insertPhoneNumber(params: {
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
  }): Promise<Record<string, any>> {
    const insertData = {
      ...params,
      kapso_customer_id: params.kapso_customer_id ?? '',
    }

    const { data, error } = await supabase
      .from('whatsapp_phone_numbers')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  }

  async updateDisplayName(
    workspaceId: string,
    agentId: string,
    displayName: string,
  ): Promise<boolean> {
    const { error } = await supabase
      .from('whatsapp_phone_numbers')
      .update({ display_name: displayName })
      .eq('workspace_id', workspaceId)
      .eq('agent_id', agentId)

    if (error) {
      log.error({ err: error }, `Error updating display name for agent ${agentId}:`)
      return false
    }

    return true
  }
}

export const whatsAppPhoneRepository: IWhatsAppPhoneRepository = new WhatsAppPhoneRepository()
