'use client'

import { useMemo } from 'react'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'

export type ContributionDay = {
  date: Date
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

const buildContributionDays = (
  countsByDate: Record<string, number>,
  year: number,
): ContributionDay[] => {
  const days: ContributionDay[] = []
  const values = Object.values(countsByDate)
  const maxCount = values.length > 0 ? Math.max(...values) : 1

  const current = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0]
    const count = countsByDate[dateStr] || 0
    const normalized = count / maxCount
    let level: 0 | 1 | 2 | 3 | 4 = 0
    if (count > 0) {
      if (normalized >= 0.75) level = 4
      else if (normalized >= 0.5) level = 3
      else if (normalized >= 0.25) level = 2
      else level = 1
    }
    days.push({ date: new Date(current), count, level })
    current.setDate(current.getDate() + 1)
  }

  return days
}

export const useContributionData = (workspaceId: string, year?: number) => {
  const currentYear = year || new Date().getFullYear()

  const { data } = useAuthGetWorkspaceApi<{
    success: boolean
    counts: Record<string, number>
  }>({
    path: '/api/workspaces/activity/contributions',
    params: { workspaceId, year: currentYear },
    enabled: !!workspaceId,
  })

  const contributionData = useMemo(
    () => buildContributionDays(data?.counts ?? {}, currentYear),
    [data?.counts, currentYear],
  )

  return { contributionData, year: currentYear }
}
