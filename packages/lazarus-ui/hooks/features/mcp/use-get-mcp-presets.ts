'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'

import type { MCPPresetsResponse } from './types'

export const useGetMcpPresets = () =>
  useAuthGetWorkspaceApi<MCPPresetsResponse>({ path: '/api/mcp/presets' })
