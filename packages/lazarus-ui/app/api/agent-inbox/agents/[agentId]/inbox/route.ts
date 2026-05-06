import { NextRequest, NextResponse } from 'next/server'

import { agentInboxService } from '@/services/agent-inbox.service'

// Ensure sample data is initialized
let dataInitialized = false

/**
 * GET /api/agent-inbox/agents/[agentId]/inbox
 * Returns the inbox for a specific agent with all threads and emails
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  try {
    const { agentId } = await params

    // Initialize sample data once per process
    if (!dataInitialized) {
      await agentInboxService.initializeSampleData()
      dataInitialized = true
    }

    const inbox = await agentInboxService.getInbox(agentId)

    return NextResponse.json(inbox)
  } catch (error) {
    console.error(`Failed to fetch inbox for agent:`, error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch inbox',
      },
      { status: 500 },
    )
  }
}
