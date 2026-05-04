// NOTE: Billing tables (user_billing_accounts, credit_transactions,
// workspace_credit_quotas) and billing functions (add_credits, consume_credits,
// transfer_credits) are intentionally excluded. Billing lives in
// lazarus-orchestrator and is reached via shared Redis (`credits:{workspaceId}`
// key + `usage:events` stream). Do not regenerate this file from Supabase
// without filtering those tables/functions back out.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '12.2.3 (519615d)'
  }
  public: {
    Tables: {
      agent_runs: {
        Row: {
          agent_id: string
          attributes: Json
          cost_usd: number
          ended_at: string | null
          events: Json
          input_tokens: number
          model: string | null
          output_tokens: number
          platform_source: string | null
          runtime: string
          session_id: string | null
          started_at: string
          status: string
          title: string | null
          trace_id: string
          triggered_by: string | null
          workspace_id: string
        }
        Insert: {
          agent_id: string
          attributes?: Json
          cost_usd?: number
          ended_at?: string | null
          events?: Json
          input_tokens?: number
          model?: string | null
          output_tokens?: number
          platform_source?: string | null
          runtime: string
          session_id?: string | null
          started_at: string
          status: string
          title?: string | null
          trace_id: string
          triggered_by?: string | null
          workspace_id: string
        }
        Update: {
          agent_id?: string
          attributes?: Json
          cost_usd?: number
          ended_at?: string | null
          events?: Json
          input_tokens?: number
          model?: string | null
          output_tokens?: number
          platform_source?: string | null
          runtime?: string
          session_id?: string | null
          started_at?: string
          status?: string
          title?: string | null
          trace_id?: string
          triggered_by?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      agent_spans: {
        Row: {
          attributes: Json
          ended_at: string | null
          events: Json
          name: string
          parent_span_id: string | null
          span_id: string
          started_at: string
          trace_id: string
        }
        Insert: {
          attributes?: Json
          ended_at?: string | null
          events?: Json
          name: string
          parent_span_id?: string | null
          span_id: string
          started_at: string
          trace_id: string
        }
        Update: {
          attributes?: Json
          ended_at?: string | null
          events?: Json
          name?: string
          parent_span_id?: string | null
          span_id?: string
          started_at?: string
          trace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'agent_spans_trace_id_fkey'
            columns: ['trace_id']
            isOneToOne: false
            referencedRelation: 'agent_runs'
            referencedColumns: ['trace_id']
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: Json
          rate_limit: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: Json
          rate_limit?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: Json
          rate_limit?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'api_keys_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      contact_submissions: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      discord_connections: {
        Row: {
          agent_id: string | null
          bot_user_id: string | null
          channel_id: string | null
          created_at: string
          created_by: string
          enabled: boolean | null
          guild_id: string
          guild_name: string | null
          id: string
          settings: Json | null
          updated_at: string
          webhook_url: string | null
          workspace_id: string
        }
        Insert: {
          agent_id?: string | null
          bot_user_id?: string | null
          channel_id?: string | null
          created_at?: string
          created_by: string
          enabled?: boolean | null
          guild_id: string
          guild_name?: string | null
          id?: string
          settings?: Json | null
          updated_at?: string
          webhook_url?: string | null
          workspace_id: string
        }
        Update: {
          agent_id?: string | null
          bot_user_id?: string | null
          channel_id?: string | null
          created_at?: string
          created_by?: string
          enabled?: boolean | null
          guild_id?: string
          guild_name?: string | null
          id?: string
          settings?: Json | null
          updated_at?: string
          webhook_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'discord_connections_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      discord_conversations: {
        Row: {
          channel_id: string
          conversation_id: string | null
          created_at: string
          discord_connection_id: string
          id: string
          last_message_at: string
          message_count: number | null
          session_id: string | null
          thread_id: string | null
        }
        Insert: {
          channel_id: string
          conversation_id?: string | null
          created_at?: string
          discord_connection_id: string
          id?: string
          last_message_at?: string
          message_count?: number | null
          session_id?: string | null
          thread_id?: string | null
        }
        Update: {
          channel_id?: string
          conversation_id?: string | null
          created_at?: string
          discord_connection_id?: string
          id?: string
          last_message_at?: string
          message_count?: number | null
          session_id?: string | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'discord_conversations_discord_connection_id_fkey'
            columns: ['discord_connection_id']
            isOneToOne: false
            referencedRelation: 'discord_connections'
            referencedColumns: ['id']
          },
        ]
      }
      discord_messages: {
        Row: {
          attachments: Json | null
          author_id: string
          author_name: string | null
          content: string | null
          created_at: string
          discord_conversation_id: string
          discord_message_id: string
          id: string
          is_from_bot: boolean | null
        }
        Insert: {
          attachments?: Json | null
          author_id: string
          author_name?: string | null
          content?: string | null
          created_at?: string
          discord_conversation_id: string
          discord_message_id: string
          id?: string
          is_from_bot?: boolean | null
        }
        Update: {
          attachments?: Json | null
          author_id?: string
          author_name?: string | null
          content?: string | null
          created_at?: string
          discord_conversation_id?: string
          discord_message_id?: string
          id?: string
          is_from_bot?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: 'discord_messages_discord_conversation_id_fkey'
            columns: ['discord_conversation_id']
            isOneToOne: false
            referencedRelation: 'discord_conversations'
            referencedColumns: ['id']
          },
        ]
      }
      email_conversations: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          last_message_at: string | null
          message_count: number | null
          normalized_subject: string | null
          sender_email: string
          thread_root_message_id: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          normalized_subject?: string | null
          sender_email: string
          thread_root_message_id?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          normalized_subject?: string | null
          sender_email?: string
          thread_root_message_id?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      email_messages: {
        Row: {
          attachments: Json | null
          content: string | null
          created_at: string | null
          direction: string
          email_conversation_id: string
          email_message_id: string | null
          id: string
          in_reply_to: string | null
          is_from_bot: boolean | null
          reference_ids: Json | null
          sender_email: string
          sender_name: string | null
          ses_message_id: string | null
          subject: string | null
        }
        Insert: {
          attachments?: Json | null
          content?: string | null
          created_at?: string | null
          direction: string
          email_conversation_id: string
          email_message_id?: string | null
          id?: string
          in_reply_to?: string | null
          is_from_bot?: boolean | null
          reference_ids?: Json | null
          sender_email: string
          sender_name?: string | null
          ses_message_id?: string | null
          subject?: string | null
        }
        Update: {
          attachments?: Json | null
          content?: string | null
          created_at?: string | null
          direction?: string
          email_conversation_id?: string
          email_message_id?: string | null
          id?: string
          in_reply_to?: string | null
          is_from_bot?: boolean | null
          reference_ids?: Json | null
          sender_email?: string
          sender_name?: string | null
          ses_message_id?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'email_messages_email_conversation_id_fkey'
            columns: ['email_conversation_id']
            isOneToOne: false
            referencedRelation: 'email_conversations'
            referencedColumns: ['id']
          },
        ]
      }
      error_logs: {
        Row: {
          created_at: string | null
          error_code: string | null
          error_message: string | null
          function_name: string
          id: string
          request_data: Json | null
          stack_trace: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          function_name: string
          id?: string
          request_data?: Json | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          function_name?: string
          id?: string
          request_data?: Json | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'error_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          status: string
          token: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: string
          status?: string
          token: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
          token?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'invitations_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invitations_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          expires_at: string
          id: string
          max_uses: number | null
          metadata: Json | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          expires_at: string
          id?: string
          max_uses?: number | null
          metadata?: Json | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          expires_at?: string
          id?: string
          max_uses?: number | null
          metadata?: Json | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'invite_codes_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invite_codes_used_by_fkey'
            columns: ['used_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      kapso_customers: {
        Row: {
          created_at: string | null
          id: string
          kapso_customer_id: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          kapso_customer_id: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          kapso_customer_id?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'kapso_customers_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: true
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      mcp_credentials: {
        Row: {
          created_at: string | null
          env_keys: string[]
          id: string
          server_name: string
          updated_at: string | null
          vault_secret_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          env_keys?: string[]
          id?: string
          server_name: string
          updated_at?: string | null
          vault_secret_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          env_keys?: string[]
          id?: string
          server_name?: string
          updated_at?: string | null
          vault_secret_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'mcp_credentials_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
          is_active: boolean
          subscribed_at: string
          unsubscribed_at: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      partner_redemptions: {
        Row: {
          building_description: string | null
          company: string
          created_at: string
          email: string
          id: string
          ip_address: string | null
          name: string
          partner_slug: string
          perk_type: string
          perk_value: string
          role: string | null
          status: string
          updated_at: string
          user_agent: string | null
          verification_file_name: string | null
          verification_file_url: string | null
          website: string | null
        }
        Insert: {
          building_description?: string | null
          company: string
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          name: string
          partner_slug: string
          perk_type?: string
          perk_value?: string
          role?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          verification_file_name?: string | null
          verification_file_url?: string | null
          website?: string | null
        }
        Update: {
          building_description?: string | null
          company?: string
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          name?: string
          partner_slug?: string
          perk_type?: string
          perk_value?: string
          role?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          verification_file_name?: string | null
          verification_file_url?: string | null
          website?: string | null
        }
        Relationships: []
      }
      pending_approvals: {
        Row: {
          activity_trace: Json | null
          agent_id: string
          agent_name: string
          created_at: string
          description: string
          execution_id: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          risk_level: string
          status: string
          tool_input: Json
          tool_name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          activity_trace?: Json | null
          agent_id: string
          agent_name: string
          created_at?: string
          description: string
          execution_id: string
          id: string
          resolved_at?: string | null
          resolved_by?: string | null
          risk_level?: string
          status?: string
          tool_input: Json
          tool_name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          activity_trace?: Json | null
          agent_id?: string
          agent_name?: string
          created_at?: string
          description?: string
          execution_id?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          risk_level?: string
          status?: string
          tool_input?: Json
          tool_name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      pool_instances: {
        Row: {
          assigned_at: string | null
          assigned_workspace_id: string | null
          consecutive_failures: number | null
          created_at: string | null
          ec2_instance_id: string
          health_check_url: string | null
          id: string
          instance_type: string | null
          last_health_check_at: string | null
          launched_at: string | null
          private_ip: string | null
          ready_at: string | null
          status: string
          status_message: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_workspace_id?: string | null
          consecutive_failures?: number | null
          created_at?: string | null
          ec2_instance_id: string
          health_check_url?: string | null
          id?: string
          instance_type?: string | null
          last_health_check_at?: string | null
          launched_at?: string | null
          private_ip?: string | null
          ready_at?: string | null
          status?: string
          status_message?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_workspace_id?: string | null
          consecutive_failures?: number | null
          created_at?: string | null
          ec2_instance_id?: string
          health_check_url?: string | null
          id?: string
          instance_type?: string | null
          last_health_check_at?: string | null
          launched_at?: string | null
          private_ip?: string | null
          ready_at?: string | null
          status?: string
          status_message?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'pool_instances_assigned_workspace_id_fkey'
            columns: ['assigned_workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          birthdate: string | null
          connected_apps_count: number | null
          connected_apps_limit: number | null
          created_at: string | null
          email: string
          email_verified: boolean | null
          first_name: string | null
          id: string
          last_name: string | null
          last_sign_in_at: string | null
          monthly_chat_limit: number | null
          monthly_chats_used: number | null
          phone_number: string | null
          plan: string
          preferences: Json | null
          still_on_waitlist: boolean | null
          storage_bucket_name: string | null
          storage_quota_mb: number | null
          storage_used_mb: number | null
          stripe_customer_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar?: string | null
          birthdate?: string | null
          connected_apps_count?: number | null
          connected_apps_limit?: number | null
          created_at?: string | null
          email: string
          email_verified?: boolean | null
          first_name?: string | null
          id: string
          last_name?: string | null
          last_sign_in_at?: string | null
          monthly_chat_limit?: number | null
          monthly_chats_used?: number | null
          phone_number?: string | null
          plan?: string
          preferences?: Json | null
          still_on_waitlist?: boolean | null
          storage_bucket_name?: string | null
          storage_quota_mb?: number | null
          storage_used_mb?: number | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar?: string | null
          birthdate?: string | null
          connected_apps_count?: number | null
          connected_apps_limit?: number | null
          created_at?: string | null
          email?: string
          email_verified?: boolean | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          last_sign_in_at?: string | null
          monthly_chat_limit?: number | null
          monthly_chats_used?: number | null
          phone_number?: string | null
          plan?: string
          preferences?: Json | null
          still_on_waitlist?: boolean | null
          storage_bucket_name?: string | null
          storage_quota_mb?: number | null
          storage_used_mb?: number | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string | null
          success: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'security_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      slack_connections: {
        Row: {
          agent_id: string | null
          bot_token: string
          bot_user_id: string | null
          channel_id: string | null
          created_at: string
          created_by: string
          enabled: boolean | null
          id: string
          settings: Json | null
          slack_team_id: string
          slack_team_name: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          agent_id?: string | null
          bot_token: string
          bot_user_id?: string | null
          channel_id?: string | null
          created_at?: string
          created_by: string
          enabled?: boolean | null
          id?: string
          settings?: Json | null
          slack_team_id: string
          slack_team_name?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          agent_id?: string | null
          bot_token?: string
          bot_user_id?: string | null
          channel_id?: string | null
          created_at?: string
          created_by?: string
          enabled?: boolean | null
          id?: string
          settings?: Json | null
          slack_team_id?: string
          slack_team_name?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'slack_connections_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      slack_conversations: {
        Row: {
          channel_id: string
          conversation_id: string | null
          created_at: string
          id: string
          last_message_at: string
          message_count: number | null
          session_id: string | null
          slack_connection_id: string
          thread_ts: string | null
        }
        Insert: {
          channel_id: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          message_count?: number | null
          session_id?: string | null
          slack_connection_id: string
          thread_ts?: string | null
        }
        Update: {
          channel_id?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          message_count?: number | null
          session_id?: string | null
          slack_connection_id?: string
          thread_ts?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'slack_conversations_slack_connection_id_fkey'
            columns: ['slack_connection_id']
            isOneToOne: false
            referencedRelation: 'slack_connections'
            referencedColumns: ['id']
          },
        ]
      }
      slack_messages: {
        Row: {
          attachments: Json | null
          content: string | null
          created_at: string
          id: string
          is_from_bot: boolean | null
          slack_conversation_id: string
          slack_ts: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          attachments?: Json | null
          content?: string | null
          created_at?: string
          id?: string
          is_from_bot?: boolean | null
          slack_conversation_id: string
          slack_ts: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          attachments?: Json | null
          content?: string | null
          created_at?: string
          id?: string
          is_from_bot?: boolean | null
          slack_conversation_id?: string
          slack_ts?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'slack_messages_slack_conversation_id_fkey'
            columns: ['slack_conversation_id']
            isOneToOne: false
            referencedRelation: 'slack_conversations'
            referencedColumns: ['id']
          },
        ]
      }
      sqlite_databases: {
        Row: {
          allowed_operations: Json | null
          created_at: string
          created_by: string
          description: string | null
          error_message: string | null
          id: string
          last_accessed_at: string | null
          last_modified_at: string | null
          name: string
          path: string
          row_count: number | null
          schema_checksum: string | null
          schema_version: string | null
          size_bytes: number | null
          status: string | null
          table_count: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          allowed_operations?: Json | null
          created_at?: string
          created_by: string
          description?: string | null
          error_message?: string | null
          id?: string
          last_accessed_at?: string | null
          last_modified_at?: string | null
          name: string
          path: string
          row_count?: number | null
          schema_checksum?: string | null
          schema_version?: string | null
          size_bytes?: number | null
          status?: string | null
          table_count?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          allowed_operations?: Json | null
          created_at?: string
          created_by?: string
          description?: string | null
          error_message?: string | null
          id?: string
          last_accessed_at?: string | null
          last_modified_at?: string | null
          name?: string
          path?: string
          row_count?: number | null
          schema_checksum?: string | null
          schema_version?: string | null
          size_bytes?: number | null
          status?: string | null
          table_count?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sqlite_databases_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      v0_apps: {
        Row: {
          api_key_id: string | null
          chat_id: string | null
          created_at: string
          created_by: string
          deployment_error: string | null
          deployment_platform: string | null
          deployment_status: string | null
          deployment_url: string | null
          description: string | null
          environment_vars: Json | null
          features: Json | null
          id: string
          name: string
          project_id: string | null
          status: string
          synced_at: string | null
          technical_stack: Json | null
          updated_at: string
          web_url: string | null
          workspace_id: string
        }
        Insert: {
          api_key_id?: string | null
          chat_id?: string | null
          created_at?: string
          created_by: string
          deployment_error?: string | null
          deployment_platform?: string | null
          deployment_status?: string | null
          deployment_url?: string | null
          description?: string | null
          environment_vars?: Json | null
          features?: Json | null
          id?: string
          name: string
          project_id?: string | null
          status?: string
          synced_at?: string | null
          technical_stack?: Json | null
          updated_at?: string
          web_url?: string | null
          workspace_id: string
        }
        Update: {
          api_key_id?: string | null
          chat_id?: string | null
          created_at?: string
          created_by?: string
          deployment_error?: string | null
          deployment_platform?: string | null
          deployment_status?: string | null
          deployment_url?: string | null
          description?: string | null
          environment_vars?: Json | null
          features?: Json | null
          id?: string
          name?: string
          project_id?: string | null
          status?: string
          synced_at?: string | null
          technical_stack?: Json | null
          updated_at?: string
          web_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'v0_apps_api_key_id_fkey'
            columns: ['api_key_id']
            isOneToOne: false
            referencedRelation: 'api_keys'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'v0_apps_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      whatsapp_connections: {
        Row: {
          agent_id: string
          created_at: string
          created_by: string
          display_phone_number: string | null
          enabled: boolean | null
          id: string
          kapso_config: Json | null
          kapso_phone_number_id: string
          phone_number: string
          settings: Json | null
          setup_type: string
          updated_at: string
          webhook_secret: string | null
          workspace_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          created_by: string
          display_phone_number?: string | null
          enabled?: boolean | null
          id?: string
          kapso_config?: Json | null
          kapso_phone_number_id: string
          phone_number: string
          settings?: Json | null
          setup_type: string
          updated_at?: string
          webhook_secret?: string | null
          workspace_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          created_by?: string
          display_phone_number?: string | null
          enabled?: boolean | null
          id?: string
          kapso_config?: Json | null
          kapso_phone_number_id?: string
          phone_number?: string
          settings?: Json | null
          setup_type?: string
          updated_at?: string
          webhook_secret?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'whatsapp_connections_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          context: Json | null
          conversation_id: string | null
          created_at: string
          id: string
          last_message_at: string
          message_count: number | null
          profile_name: string | null
          scope: string | null
          session_id: string | null
          state: string | null
          user_id: string | null
          wa_id: string
          whatsapp_connection_id: string | null
        }
        Insert: {
          context?: Json | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          message_count?: number | null
          profile_name?: string | null
          scope?: string | null
          session_id?: string | null
          state?: string | null
          user_id?: string | null
          wa_id: string
          whatsapp_connection_id?: string | null
        }
        Update: {
          context?: Json | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          message_count?: number | null
          profile_name?: string | null
          scope?: string | null
          session_id?: string | null
          state?: string | null
          user_id?: string | null
          wa_id?: string
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'whatsapp_conversations_whatsapp_connection_id_fkey'
            columns: ['whatsapp_connection_id']
            isOneToOne: false
            referencedRelation: 'whatsapp_connections'
            referencedColumns: ['id']
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_from_user: boolean
          media_mime_type: string | null
          media_url: string | null
          message_type: string
          status: string | null
          wamid: string
          whatsapp_conversation_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_from_user: boolean
          media_mime_type?: string | null
          media_url?: string | null
          message_type: string
          status?: string | null
          wamid: string
          whatsapp_conversation_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_from_user?: boolean
          media_mime_type?: string | null
          media_url?: string | null
          message_type?: string
          status?: string | null
          wamid?: string
          whatsapp_conversation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'whatsapp_messages_whatsapp_conversation_id_fkey'
            columns: ['whatsapp_conversation_id']
            isOneToOne: false
            referencedRelation: 'whatsapp_conversations'
            referencedColumns: ['id']
          },
        ]
      }
      whatsapp_phone_numbers: {
        Row: {
          account_mode: string | null
          agent_id: string
          business_account_id: string | null
          connected_at: string | null
          created_at: string | null
          display_name: string | null
          id: string
          kapso_customer_id: string
          messaging_limit_tier: string | null
          name_status: string | null
          phone_number: string
          phone_number_id: string
          provisioned_by_lazarus: boolean | null
          quality_rating: string | null
          status: string | null
          updated_at: string | null
          webhook_secret: string
          workspace_id: string
        }
        Insert: {
          account_mode?: string | null
          agent_id: string
          business_account_id?: string | null
          connected_at?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          kapso_customer_id: string
          messaging_limit_tier?: string | null
          name_status?: string | null
          phone_number: string
          phone_number_id: string
          provisioned_by_lazarus?: boolean | null
          quality_rating?: string | null
          status?: string | null
          updated_at?: string | null
          webhook_secret: string
          workspace_id: string
        }
        Update: {
          account_mode?: string | null
          agent_id?: string
          business_account_id?: string | null
          connected_at?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          kapso_customer_id?: string
          messaging_limit_tier?: string | null
          name_status?: string | null
          phone_number?: string
          phone_number_id?: string
          provisioned_by_lazarus?: boolean | null
          quality_rating?: string | null
          status?: string | null
          updated_at?: string | null
          webhook_secret?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'whatsapp_phone_numbers_kapso_customer_id_fkey'
            columns: ['kapso_customer_id']
            isOneToOne: false
            referencedRelation: 'kapso_customers'
            referencedColumns: ['kapso_customer_id']
          },
          {
            foreignKeyName: 'whatsapp_phone_numbers_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_instances: {
        Row: {
          ami_id: string | null
          consecutive_failures: number | null
          created_at: string | null
          ec2_instance_id: string | null
          from_pool: boolean | null
          health_check_url: string | null
          id: string
          instance_type: string | null
          last_activity_at: string | null
          last_health_check_at: string | null
          last_started_at: string | null
          last_stopped_at: string | null
          pool_instance_id: string | null
          private_ip: string | null
          status: string
          status_message: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          ami_id?: string | null
          consecutive_failures?: number | null
          created_at?: string | null
          ec2_instance_id?: string | null
          from_pool?: boolean | null
          health_check_url?: string | null
          id?: string
          instance_type?: string | null
          last_activity_at?: string | null
          last_health_check_at?: string | null
          last_started_at?: string | null
          last_stopped_at?: string | null
          pool_instance_id?: string | null
          private_ip?: string | null
          status?: string
          status_message?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          ami_id?: string | null
          consecutive_failures?: number | null
          created_at?: string | null
          ec2_instance_id?: string | null
          from_pool?: boolean | null
          health_check_url?: string | null
          id?: string
          instance_type?: string | null
          last_activity_at?: string | null
          last_health_check_at?: string | null
          last_started_at?: string | null
          last_stopped_at?: string | null
          pool_instance_id?: string | null
          private_ip?: string | null
          status?: string
          status_message?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_instances_pool_instance_id_fkey'
            columns: ['pool_instance_id']
            isOneToOne: false
            referencedRelation: 'pool_instances'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_instances_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: true
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          code: string
          created_at: string
          declined_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          code?: string
          created_at?: string
          declined_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          code?: string
          created_at?: string
          declined_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_invitations_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_invitations_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string | null
          id: string
          invited_by: string | null
          joined_at: string | null
          role: string
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          role: string
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_members_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspaces: {
        Row: {
          avatar: string | null
          color: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          needs_onboarding: boolean
          owner_id: string
          settings: Json | null
          slug: string | null
          updated_at: string | null
          upload_email: string | null
          user_id: string
        }
        Insert: {
          avatar?: string | null
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          needs_onboarding?: boolean
          owner_id: string
          settings?: Json | null
          slug?: string | null
          updated_at?: string | null
          upload_email?: string | null
          user_id: string
        }
        Update: {
          avatar?: string | null
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          needs_onboarding?: boolean
          owner_id?: string
          settings?: Json | null
          slug?: string | null
          updated_at?: string | null
          upload_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspaces_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspaces_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_workspace_invitation: {
        Args: { p_invitation_code: string }
        Returns: Json
      }
      can_add_workspace_member: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
      can_workspace_spend: {
        Args: { p_amount_cents: number; p_workspace_id: string }
        Returns: boolean
      }
      check_organization_slug_exists: {
        Args: { check_slug: string; org_id?: string }
        Returns: boolean
      }
      check_user_quota: {
        Args: { p_quota_type: string; p_user_id: string }
        Returns: boolean
      }
      check_workspace_admin: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
      check_workspace_membership: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
      check_workspace_slug_exists: {
        Args: { slug_to_check: string }
        Returns: boolean
      }
      debug_user_setup: {
        Args: { p_user_email: string }
        Returns: {
          details: string
          status: string
          step: string
        }[]
      }
      delete_mcp_credential: {
        Args: { p_server_name: string; p_workspace_id: string }
        Returns: boolean
      }
      ensure_unique_org_slug: { Args: never; Returns: string }
      generate_invite_code: { Args: never; Returns: string }
      generate_random_id: { Args: { prefix: string }; Returns: string }
      generate_random_slug: { Args: never; Returns: string }
      get_invited_workspace_ids: {
        Args: { user_email: string }
        Returns: string[]
      }
      get_inviter_ids: { Args: { user_email: string }; Returns: string[] }
      get_mcp_credentials: {
        Args: { p_workspace_id: string }
        Returns: {
          decrypted_env: Json
          server_name: string
        }[]
      }
      get_recent_stripe_errors: {
        Args: { hours_back?: number }
        Returns: {
          customer_id: string
          error_code: string
          error_message: string
          event_type: string
          function_name: string
          occurred_at: string
        }[]
      }
      get_user_workspace_ids: { Args: { p_user_id: string }; Returns: string[] }
      get_webhook_health: { Args: never; Returns: Json }
      get_workspace_billing_account_id: {
        Args: { p_workspace_id: string }
        Returns: string
      }
      get_workspace_credit_balance: {
        Args: { p_workspace_id: string }
        Returns: number
      }
      get_workspace_items: {
        Args: {
          p_entity_type?: string
          p_limit?: number
          p_offset?: number
          p_search_query?: string
          p_title_search?: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_workspace_items_paginated: {
        Args: {
          p_entity_type?: string
          p_limit?: number
          p_offset?: number
          p_search_query?: string
          p_title_search?: string
          p_workspace_id: string
        }
        Returns: {
          created_at: string
          description: string
          entity_data: Json
          entity_id: string
          entity_type: string
          has_more: boolean
          id: string
          labels: string[]
          title: string
          total_count: number
          updated_at: string
        }[]
      }
      get_workspace_items_simple: {
        Args: {
          p_entity_type?: string
          p_limit?: number
          p_offset?: number
          p_search_query?: string
          p_title_search?: string
          p_workspace_id: string
        }
        Returns: {
          created_at: string
          description: string
          entity_data: Json
          entity_id: string
          entity_type: string
          has_more: boolean
          id: string
          labels: string[]
          title: string
          total_count: number
          updated_at: string
        }[]
      }
      get_workspace_items_table: {
        Args: {
          p_entity_type?: string
          p_limit?: number
          p_offset?: number
          p_search_query?: string
          p_title_search?: string
          p_workspace_id: string
        }
        Returns: {
          created_at: string
          description: string
          entity_id: string
          file_type: string
          id: string
          labels: string[]
          metadata: Json
          name: string
          path: string
          size: number
          thumbnail_url: string
          type: string
          updated_at: string
        }[]
      }
      get_workspace_role: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: string
      }
      handle_new_user_manual: {
        Args: { p_email: string; p_user_id: string }
        Returns: undefined
      }
      handle_new_user_setup: {
        Args: { user_record: Record<string, unknown> }
        Returns: undefined
      }
      has_workspace_access: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
      increment_usage: {
        Args: { p_increment?: number; p_usage_type: string; p_user_id: string }
        Returns: undefined
      }
      is_slug_available: {
        Args: { p_entity_type: string; p_exclude_id?: string; p_slug: string }
        Returns: boolean
      }
      is_workspace_admin: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
      is_workspace_admin_or_owner: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
      is_workspace_editor_or_higher: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
      is_workspace_member:
        | {
            Args: { p_user_id: string; p_workspace_id: string }
            Returns: boolean
          }
        | {
            Args: { p_user_id: string; p_workspace_id: string }
            Returns: boolean
          }
      is_workspace_member_by_email: {
        Args: { p_email: string; p_workspace_id: string }
        Returns: boolean
      }
      is_workspace_owner:
        | {
            Args: { p_user_id: string; p_workspace_id: string }
            Returns: boolean
          }
        | {
            Args: { p_user_id: string; p_workspace_id: string }
            Returns: boolean
          }
      log_security_event: {
        Args: {
          p_details?: Json
          p_event_type: string
          p_resource_id?: string
          p_resource_type?: string
          p_success?: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      refresh_user_activity_summary: { Args: never; Returns: undefined }
      reset_monthly_usage: { Args: never; Returns: undefined }
      retry_user_setup: { Args: { p_user_id: string }; Returns: boolean }
      safe_log_error: {
        Args: {
          p_error_code: string
          p_error_message: string
          p_function_name: string
          p_request_data?: Json
          p_user_id: string
        }
        Returns: undefined
      }
      soft_delete_workspace: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      transfer_workspace_ownership: {
        Args: { p_new_owner_id: string; p_workspace_id: string }
        Returns: boolean
      }
      update_api_key_usage: {
        Args: { key_hash_param: string }
        Returns: undefined
      }
      update_storage_usage: {
        Args: { p_size_change_bytes: number; p_user_id: string }
        Returns: undefined
      }
      update_user_plan: {
        Args: { p_plan: string; p_user_id: string }
        Returns: undefined
      }
      upsert_mcp_credential: {
        Args: {
          p_env_keys: string[]
          p_secret_json: Json
          p_server_name: string
          p_workspace_id: string
        }
        Returns: string
      }
      use_invite_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: Json
      }
      user_has_workspace_access: { Args: { ws_id: string }; Returns: boolean }
      validate_api_key: {
        Args: { key_hash_param: string }
        Returns: {
          id: string
          is_valid: boolean
          permissions: Json
          rate_limit: number
          workspace_id: string
        }[]
      }
    }
    Enums: {
      subscription_type: 'free' | 'pro' | 'business'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      subscription_type: ['free', 'pro', 'business'],
    },
  },
} as const
