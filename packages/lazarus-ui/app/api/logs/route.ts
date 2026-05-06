import { NextRequest, NextResponse } from 'next/server'

import { Log } from '@/model/log'
import { generateMockLogs } from '@/utils/mock/mock-logs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Parse query parameters
    const userId = searchParams.get('user_id') || 'user-1'
    const offset = parseInt(searchParams.get('offset') || '0')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const actors = searchParams.get('actors')?.split(',').filter(Boolean) || []
    const actorTypes =
      searchParams.get('actor_types')?.split(',').filter(Boolean) || []
    const types = searchParams.get('types')?.split(',').filter(Boolean) || []
    const apps = searchParams.get('apps')?.split(',').filter(Boolean) || []
    const workspaces =
      searchParams.get('workspaces')?.split(',').filter(Boolean) || []
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || []
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // Generate mock data - each workspace gets unique logs (no duplication)
    const mockWorkspaces = [
      'chen-business-taxes-mgjpcj6d',
      'rodriguez-household-taxes-mgjpcj6i',
      'williams-llc-tax-documents-mgjpcj6p',
      'johnson-family-taxes-2024-mgjpcj5x',
      'martinez-corp-tax-filing-mgjpcj67',
      'customer-support---csi-tax-agency-mgjpcj5g',
      'company-business-intelligence-mgjpcj6x',
    ]

    // Generate 10-12 unique logs per workspace - each log appears ONLY ONCE
    const allLogs = mockWorkspaces.flatMap((wsId) => generateMockLogs(12, wsId))

    // Apply filters
    let filteredLogs: Log[] = [...allLogs]

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filteredLogs = filteredLogs.filter(
        (log) =>
          log.title.toLowerCase().includes(searchLower) ||
          log.memoryLog?.toLowerCase().includes(searchLower) ||
          log.systemLog?.toLowerCase().includes(searchLower),
      )
    }

    // Actor filter
    if (actors.length > 0) {
      filteredLogs = filteredLogs.filter((log) => actors.includes(log.actor.id))
    }

    // Actor type filter
    if (actorTypes.length > 0) {
      filteredLogs = filteredLogs.filter((log) =>
        actorTypes.includes(log.actor.type),
      )
    }

    // Log type filter
    if (types.length > 0) {
      filteredLogs = filteredLogs.filter((log) => types.includes(log.type))
    }

    // Workspace filter
    if (workspaces.length > 0) {
      filteredLogs = filteredLogs.filter((log) =>
        workspaces.includes(log.workspaceId),
      )
    }

    // Apps filter
    if (apps.length > 0) {
      filteredLogs = filteredLogs.filter((log) =>
        log.apps?.some((app) => apps.includes(app.name)),
      )
    }

    // Tags filter
    if (tags.length > 0) {
      filteredLogs = filteredLogs.filter((log) =>
        log.metadata?.tags?.some((tag) => tags.includes(tag)),
      )
    }

    // Date range filter
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      filteredLogs = filteredLogs.filter((log) => {
        const logDate = new Date(log.timestamp)
        return logDate >= start && logDate <= end
      })
    }

    // Sort by timestamp descending (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // Pagination
    const total = filteredLogs.length
    const paginatedLogs = filteredLogs.slice(offset, offset + limit)
    const hasMore = offset + limit < total

    // Return response
    return NextResponse.json({
      logs: paginatedLogs,
      total,
      has_more: hasMore,
      offset,
      limit,
    })
  } catch (error) {
    console.error('Error in /api/logs:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}
