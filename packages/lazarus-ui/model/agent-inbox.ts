/**
 * Agent Inbox System Types
 * Email-like messaging system for inter-agent communication
 */

export interface AgentEmail {
  id: string
  threadId?: string // For threading replies
  from: string // Agent ID who sent the email
  to: string[] // Array of recipient agent IDs
  cc?: string[] // CC recipients
  bcc?: string[] // BCC recipients
  subject: string // Email subject/title
  body: string // Email content/body
  attachments?: EmailAttachment[]
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'unread' | 'read' | 'archived' | 'deleted'
  sentAt: string // ISO timestamp
  readAt?: string // When first read
  metadata?: Record<string, any>
  replyTo?: string // Email ID this is replying to
}

export interface EmailAttachment {
  name: string
  type: 'file' | 'link' | 'data'
  content: string // File path, URL, or data content
  mimeType?: string
  size?: number
}

export interface AgentThread {
  id: string
  subject: string
  participants: string[] // All agent IDs in thread
  emailIds: string[] // Ordered list of email IDs in thread
  lastActivity: string
  status: 'active' | 'closed' | 'archived'
  metadata?: Record<string, any>
}

export interface AgentInbox {
  agentId: string
  emails: AgentEmail[]
  threads: AgentThread[]
  unreadCount: number
  lastSync: string
}

export interface AgentDirectory {
  agentId: string
  name: string
  description: string
  avatar?: string // Avatar image URL
  type: 'user' | 'team' | 'system' | 'service'
  status: 'online' | 'offline' | 'busy' | 'away'
  capabilities: string[] // What this agent can do
  workspace?: string // Current workspace
  lastSeen: string
  metadata?: Record<string, any>
}

export interface EmailFilter {
  from?: string
  to?: string
  subject?: string
  status?: AgentEmail['status']
  priority?: AgentEmail['priority']
  dateFrom?: string
  dateTo?: string
  threadId?: string
  hasAttachments?: boolean
}

export interface EmailSearchResult {
  emails: AgentEmail[]
  threads: AgentThread[]
  totalCount: number
  hasMore: boolean
}
