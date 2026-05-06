import { AgentEmail, AgentInbox } from '@/model/agent-inbox'

/**
 * Agent Inbox Service
 * Manages agent inbox data - emails, threads, and messaging
 * NOTE: Currently uses in-memory storage. Future backend integration will use apiClient.
 */
class AgentInboxService {
  // In-memory storage for development
  // TODO: Replace with proper database/file storage
  private inboxes: Map<string, AgentInbox> = new Map()
  private initialized = false

  /**
   * Get inbox for a specific agent
   */
  async getInbox(agentId: string): Promise<AgentInbox> {
    if (!this.inboxes.has(agentId)) {
      // Initialize empty inbox
      this.inboxes.set(agentId, {
        agentId,
        emails: [],
        threads: [],
        unreadCount: 0,
        lastSync: new Date().toISOString(),
      })
    }

    return this.inboxes.get(agentId)!
  }

  /**
   * Send an email from one agent to another
   */
  async sendEmail(
    email: Omit<AgentEmail, 'id' | 'sentAt'>,
  ): Promise<AgentEmail> {
    console.log('[sendEmail] Creating email:', email.subject)
    const newEmail: AgentEmail = {
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sentAt: new Date().toISOString(),
      ...email,
    }

    // Add to sender's inbox
    const senderInbox = await this.getInbox(email.from)
    console.log(
      `[sendEmail] Adding to sender ${email.from}, current emails:`,
      senderInbox.emails.length,
    )
    senderInbox.emails.push(newEmail)
    console.log(
      `[sendEmail] After push, sender has ${senderInbox.emails.length} emails`,
    )

    // Add to all recipients' inboxes
    for (const recipientId of email.to) {
      const recipientInbox = await this.getInbox(recipientId)
      recipientInbox.emails.push(newEmail)

      // Increment unread count
      if (newEmail.status === 'unread') {
        recipientInbox.unreadCount++
      }

      // Update or create thread
      await this.updateThread(recipientId, newEmail)
    }

    // Update thread for sender
    await this.updateThread(email.from, newEmail)

    return newEmail
  }

  /**
   * Update thread with new email
   */
  private async updateThread(
    agentId: string,
    email: AgentEmail,
  ): Promise<void> {
    const inbox = await this.getInbox(agentId)

    // Find existing thread or create new one
    let thread = inbox.threads.find((t) => t.id === email.threadId)

    if (!thread) {
      // Create new thread
      const threadId =
        email.threadId ||
        `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Determine all participants
      const participants = Array.from(
        new Set([email.from, ...email.to, ...(email.cc || [])]),
      )

      thread = {
        id: threadId,
        subject: email.subject,
        participants,
        emailIds: [email.id],
        lastActivity: email.sentAt,
        status: 'active',
      }

      inbox.threads.push(thread)
    } else {
      // Update existing thread
      if (!thread.emailIds.includes(email.id)) {
        thread.emailIds.push(email.id)
      }
      thread.lastActivity = email.sentAt

      // Add any new participants
      const allParticipants = new Set([
        ...thread.participants,
        email.from,
        ...email.to,
        ...(email.cc || []),
      ])
      thread.participants = Array.from(allParticipants)
    }
  }

  /**
   * Mark email as read
   */
  async markAsRead(agentId: string, emailId: string): Promise<void> {
    const inbox = await this.getInbox(agentId)
    const email = inbox.emails.find((e) => e.id === emailId)

    if (email && email.status === 'unread') {
      email.status = 'read'
      email.readAt = new Date().toISOString()
      inbox.unreadCount = Math.max(0, inbox.unreadCount - 1)
    }
  }

  /**
   * Get all inboxes (for debugging/admin)
   */
  async getAllInboxes(): Promise<Map<string, AgentInbox>> {
    return this.inboxes
  }

  /**
   * Initialize with sample data for testing
   */
  async initializeSampleData(): Promise<void> {
    if (this.initialized) {
      return
    }
    this.initialized = true
    const threadId1 = `thread_${Date.now()}_docs`

    // Sample email 1: Code review request
    await this.sendEmail({
      from: 'code-reviewer',
      to: ['documentation-writer'],
      subject: 'Code Review Request: New API Documentation',
      body: 'Could you please review the documentation for the new REST API endpoints? I want to make sure it aligns with our coding standards.',
      priority: 'normal',
      status: 'unread',
      threadId: threadId1,
    })

    // Sample email 2: Test results
    await this.sendEmail({
      from: 'test-generator',
      to: ['code-reviewer', 'documentation-writer'],
      subject: 'Test Suite Results - All Passing',
      body: 'Great news! All tests are passing after the recent refactoring. Coverage is now at 94%. The integration tests look particularly solid.',
      priority: 'normal',
      status: 'read',
    })

    // Sample email 3: Documentation update (reply to email 1)
    await this.sendEmail({
      from: 'documentation-writer',
      to: ['code-reviewer'],
      subject: 'Re: Code Review Request: New API Documentation',
      body: "I've reviewed the documentation and it looks good overall. I have a few suggestions for improving clarity in the authentication section.",
      priority: 'normal',
      status: 'unread',
      threadId: threadId1,
    })

    // Sample email 4: High priority bug
    await this.sendEmail({
      from: 'code-reviewer',
      to: ['test-generator'],
      subject: 'URGENT: Security Vulnerability Found',
      body: 'Found a potential SQL injection vulnerability in the user input validation. This needs immediate attention.',
      priority: 'urgent',
      status: 'unread',
    })

    // Sample email 5: Documentation request
    await this.sendEmail({
      from: 'test-generator',
      to: ['documentation-writer'],
      subject: 'Testing Guide Needed',
      body: 'Can you create a testing guide for the new integration test framework? It would help onboard new contributors.',
      priority: 'normal',
      status: 'read',
    })
  }
}

// Singleton instance
export const agentInboxService = new AgentInboxService()
