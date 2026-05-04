import { useCallback, useEffect, useState } from 'react'

import {
  MCPService,
  MCPTemplate,
  WorkspaceMCPResponse,
} from '@/services/mcp.service'
import { useIdentity } from '@/state/identity'

export function useMCP() {
  const { profile } = useIdentity()
  const [templates, setTemplates] = useState<Record<string, MCPTemplate>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mcpService, setMCPService] = useState<MCPService | null>(null)

  // Initialize MCP service
  useEffect(() => {
    if (profile?.id) {
      const service = new MCPService()
      setMCPService(service)
    }
  }, [profile?.id])

  // Load user MCP templates
  const loadTemplates = useCallback(async () => {
    if (!mcpService) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await mcpService.getUserMCPTemplates()
      setTemplates(response.templates)
    } catch (err) {
      console.error('Failed to load MCP templates:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to load MCP templates',
      )
    } finally {
      setIsLoading(false)
    }
  }, [mcpService])

  // Load templates on mount
  useEffect(() => {
    if (mcpService) {
      loadTemplates()
    }
  }, [mcpService, loadTemplates])

  // Create or update a template
  const saveTemplate = useCallback(
    async (templateName: string, template: MCPTemplate) => {
      if (!mcpService) {
        throw new Error('MCP service not initialized')
      }

      setIsLoading(true)
      setError(null)

      try {
        await mcpService.createOrUpdateMCPTemplate(templateName, template)
        // Reload templates
        await loadTemplates()
      } catch (err) {
        console.error('Failed to save MCP template:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to save MCP template',
        )
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [mcpService, loadTemplates],
  )

  // Delete a template
  const deleteTemplate = useCallback(
    async (templateName: string) => {
      if (!mcpService) {
        throw new Error('MCP service not initialized')
      }

      setIsLoading(true)
      setError(null)

      try {
        await mcpService.deleteMCPTemplate(templateName)
        // Reload templates
        await loadTemplates()
      } catch (err) {
        console.error('Failed to delete MCP template:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to delete MCP template',
        )
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [mcpService, loadTemplates],
  )

  // Activate template in workspace
  const activateTemplate = useCallback(
    async (templateName: string, workspaceId: string, serverName?: string) => {
      if (!mcpService) {
        throw new Error('MCP service not initialized')
      }

      try {
        await mcpService.activateTemplateInWorkspace(
          templateName,
          workspaceId,
          serverName,
        )
      } catch (err) {
        console.error('Failed to activate MCP template:', err)
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to activate MCP template',
        )
        throw err
      }
    },
    [mcpService],
  )

  // Get workspace MCP config
  const getWorkspaceMCPConfig = useCallback(
    async (workspaceId: string): Promise<WorkspaceMCPResponse | null> => {
      if (!mcpService) return null

      try {
        return await mcpService.getWorkspaceMCPConfig(workspaceId)
      } catch (err) {
        console.error('Failed to get workspace MCP config:', err)
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to get workspace MCP config',
        )
        return null
      }
    },
    [mcpService],
  )

  // Initialize workspace MCP
  const initializeWorkspaceMCP = useCallback(
    async (workspaceId: string) => {
      if (!mcpService) {
        throw new Error('MCP service not initialized')
      }

      try {
        await mcpService.initializeWorkspaceMCP(workspaceId)
      } catch (err) {
        console.error('Failed to initialize workspace MCP:', err)
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to initialize workspace MCP',
        )
        throw err
      }
    },
    [mcpService],
  )

  return {
    templates,
    isLoading,
    error,
    loadTemplates,
    saveTemplate,
    deleteTemplate,
    activateTemplate,
    getWorkspaceMCPConfig,
    initializeWorkspaceMCP,
  }
}
