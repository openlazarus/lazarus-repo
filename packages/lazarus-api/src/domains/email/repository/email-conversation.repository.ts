import { supabase } from '@infrastructure/database/supabase'
import type { IEmailConversationRepository } from './email-conversation.repository.interface'
import type {
  ConversationRow,
  ConversationInsert,
  MessageInsert,
  MessageRow,
} from '@domains/email/types/email-conversation.types'

// ---------------------------------------------------------------------------
// Supabase implementation of the repository interface
// ---------------------------------------------------------------------------

export class EmailConversationRepository implements IEmailConversationRepository {
  async findConversationByMessageId(
    workspaceId: string,
    agentId: string,
    emailMessageId: string,
  ): Promise<ConversationRow | null> {
    const { data: msg } = await supabase
      .from('email_messages')
      .select('email_conversation_id')
      .eq('email_message_id', emailMessageId)
      .limit(1)
      .single()

    if (!msg) return null

    const { data: conv } = await supabase
      .from('email_conversations')
      .select('id, message_count, thread_root_message_id')
      .eq('id', msg.email_conversation_id)
      .eq('workspace_id', workspaceId)
      .eq('agent_id', agentId)
      .single()

    if (!conv) return null
    return { ...conv, message_count: conv.message_count ?? 0 }
  }

  async findConversationBySubjectSender(
    workspaceId: string,
    agentId: string,
    normalizedSubject: string,
    senderEmail: string,
    since: string,
  ): Promise<ConversationRow | null> {
    const { data } = await supabase
      .from('email_conversations')
      .select('id, message_count, thread_root_message_id')
      .eq('workspace_id', workspaceId)
      .eq('agent_id', agentId)
      .eq('normalized_subject', normalizedSubject)
      .eq('sender_email', senderEmail)
      .gte('last_message_at', since)
      .order('last_message_at', { ascending: false })
      .limit(1)
      .single()

    if (!data) return null
    return { ...data, message_count: data.message_count ?? 0 }
  }

  async createConversation(row: ConversationInsert): Promise<string> {
    const { data, error } = await supabase
      .from('email_conversations')
      .insert(row)
      .select('id')
      .single()

    if (error || !data) {
      throw new Error(`Failed to create conversation: ${error?.message}`)
    }
    return data.id
  }

  async insertMessage(row: MessageInsert): Promise<string> {
    const { data, error } = await supabase.from('email_messages').insert(row).select('id').single()

    if (error || !data) {
      throw new Error(`Failed to store email message: ${error?.message}`)
    }
    return data.id
  }

  async incrementMessageCount(conversationId: string): Promise<void> {
    const { data: conv } = await supabase
      .from('email_conversations')
      .select('message_count')
      .eq('id', conversationId)
      .single()

    const now = new Date().toISOString()
    await supabase
      .from('email_conversations')
      .update({
        message_count: ((conv?.message_count as number) || 0) + 1,
        last_message_at: now,
        updated_at: now,
      })
      .eq('id', conversationId)
  }

  async getMessages(conversationId: string, limit: number): Promise<MessageRow[]> {
    const { data, error } = await supabase
      .from('email_messages')
      .select('sender_email, sender_name, content, is_from_bot, created_at, attachments')
      .eq('email_conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) throw new Error(`Failed to fetch messages: ${error.message}`)
    return (data || []).map((row) => ({
      ...row,
      content: row.content ?? '',
      is_from_bot: row.is_from_bot ?? false,
      created_at: row.created_at ?? new Date().toISOString(),
      attachments: (row.attachments ?? []) as MessageRow['attachments'],
    }))
  }

  async getMessageIds(conversationId: string): Promise<string[]> {
    const { data } = await supabase
      .from('email_messages')
      .select('email_message_id')
      .eq('email_conversation_id', conversationId)
      .not('email_message_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)

    return (data || []).map((m) => m.email_message_id).filter(Boolean) as string[]
  }

  async getThreadRoot(conversationId: string): Promise<string | null> {
    const { data } = await supabase
      .from('email_conversations')
      .select('thread_root_message_id')
      .eq('id', conversationId)
      .single()

    return data?.thread_root_message_id || null
  }
}

export const emailConversationRepository: IEmailConversationRepository =
  new EmailConversationRepository()
