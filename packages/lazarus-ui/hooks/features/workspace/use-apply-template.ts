import { useCallback, useState } from 'react'

import { useCreateAgent } from '@/hooks/features/agents/use-create-agent'
import { useCreateDirectory } from '@/hooks/features/file/use-create-directory'
import { useWriteWorkspaceFileContent } from '@/hooks/features/file/use-write-workspace-file-content'
import { useCreateTemplateDatabase } from '@/hooks/features/workspace/use-create-template-database'

interface FolderStructure {
  name: string
  children?: FolderStructure[]
  isFile?: boolean
  content?: string
}

interface Agent {
  name: string
  description: string
}

interface DatabaseColumn {
  name: string
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'DATETIME'
  primaryKey?: boolean
  notNull?: boolean
  unique?: boolean
  default?: string | number | null
  references?: {
    table: string
    column: string
  }
}

interface DatabaseTable {
  name: string
  columns: DatabaseColumn[]
  indexes?: {
    name: string
    columns: string[]
    unique?: boolean
  }[]
  seedData?: Record<string, string | number | boolean | null>[]
}

interface Database {
  name: string
  description: string
  tables: DatabaseTable[]
}

interface TemplateData {
  id: string
  name: string
  folders: FolderStructure[]
  agents: Agent[]
  databases?: Database[]
}

interface ApplyTemplateResult {
  success: boolean
  foldersCreated: number
  agentsCreated: number
  databasesCreated: number
  errors: string[]
}

/**
 * Hook to apply a template to a workspace by creating folders and agents.
 * Workspace-scoped — pass the target workspaceId at hook init so each call
 * routes to the correct workspace VM.
 */
export function useApplyTemplate(workspaceId: string) {
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [createDirectoryCall] = useCreateDirectory(workspaceId)
  const [writeFileCall] = useWriteWorkspaceFileContent(workspaceId)
  const [createAgentCall] = useCreateAgent(workspaceId)
  const [createDatabaseCall] = useCreateTemplateDatabase(workspaceId)

  interface FlattenedItem {
    path: string
    isFile: boolean
    content?: string
  }

  /**
   * Recursively flatten folder structure into paths with file/folder distinction
   */
  const flattenFolders = useCallback(
    (folders: FolderStructure[], parentPath = ''): FlattenedItem[] => {
      const items: FlattenedItem[] = []

      for (const folder of folders) {
        const currentPath = parentPath
          ? `${parentPath}/${folder.name}`
          : folder.name

        items.push({
          path: currentPath,
          isFile: folder.isFile ?? false,
          content: folder.content,
        })

        if (folder.children && folder.children.length > 0) {
          items.push(...flattenFolders(folder.children, currentPath))
        }
      }

      return items
    },
    [],
  )

  const createDirectory = useCallback(
    async (dirPath: string): Promise<{ success: boolean; error?: string }> => {
      try {
        await createDirectoryCall({ path: dirPath } as never)
        return { success: true }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create directory'
        console.error(
          `[useApplyTemplate] Failed to create directory ${dirPath}:`,
          err,
        )
        return { success: false, error: message }
      }
    },
    [createDirectoryCall],
  )

  const createFile = useCallback(
    async (
      filePath: string,
      content: string,
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        await writeFileCall({ path: filePath, content })
        return { success: true }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create file'
        console.error(
          `[useApplyTemplate] Failed to create file ${filePath}:`,
          err,
        )
        return { success: false, error: message }
      }
    },
    [writeFileCall],
  )

  const createAgent = useCallback(
    async (agent: Agent): Promise<{ success: boolean; error?: string }> => {
      try {
        const agentId = agent.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')

        await createAgentCall({
          name: agent.name,
          description: agent.description,
          id: agentId,
          systemPrompt: `You are ${agent.name}. ${agent.description}`,
          allowedTools: [
            'filesystem',
            'read',
            'write',
            'edit',
            'grep',
            'glob',
            'bash',
            'web_search',
            'web_fetch',
          ],
          modelConfig: {
            model: 'claude-opus-4-5',
            temperature: 0.7,
            maxTokens: 4096,
          },
          activeMCPs: [],
          autoTriggerEmail: false,
        } as never)
        return { success: true }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create agent'
        console.error(
          `[useApplyTemplate] Failed to create agent ${agent.name}:`,
          err,
        )
        return { success: false, error: message }
      }
    },
    [createAgentCall],
  )

  const createDatabase = useCallback(
    async (
      database: Database,
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        await createDatabaseCall({
          name: database.name,
          description: database.description,
          tables: database.tables,
        })
        return { success: true }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create database'
        console.error(
          `[useApplyTemplate] Failed to create database ${database.name}:`,
          err,
        )
        return { success: false, error: message }
      }
    },
    [createDatabaseCall],
  )

  /**
   * Apply a template to a workspace
   */
  const applyTemplate = useCallback(
    async (
      template: TemplateData,
      selectedAgentNames: string[],
    ): Promise<ApplyTemplateResult> => {
      setIsApplying(true)
      setError(null)

      const result: ApplyTemplateResult = {
        success: true,
        foldersCreated: 0,
        agentsCreated: 0,
        databasesCreated: 0,
        errors: [],
      }

      try {
        // 1. Create all folders and files
        const items = flattenFolders(template.folders)
        const folders = items.filter((item) => !item.isFile)
        const files = items.filter((item) => item.isFile)

        console.log(
          `[useApplyTemplate] Creating ${folders.length} folders and ${files.length} files for template "${template.name}"`,
        )

        // Create folders first (sequentially to ensure parent folders exist)
        for (const folder of folders) {
          const { success, error: folderError } = await createDirectory(
            folder.path,
          )
          if (success) {
            result.foldersCreated++
          } else if (folderError) {
            result.errors.push(`Folder "${folder.path}": ${folderError}`)
          }
        }

        // Then create files
        for (const file of files) {
          const { success, error: fileError } = await createFile(
            file.path,
            file.content || '',
          )
          if (success) {
            result.foldersCreated++ // Count files in the same metric for simplicity
          } else if (fileError) {
            result.errors.push(`File "${file.path}": ${fileError}`)
          }
        }

        // 2. Create selected agents
        const selectedAgents = template.agents.filter((agent) =>
          selectedAgentNames.includes(agent.name),
        )
        console.log(
          `[useApplyTemplate] Creating ${selectedAgents.length} agents for template "${template.name}"`,
        )

        // Create agents in parallel for better performance
        const agentResults = await Promise.all(
          selectedAgents.map((agent) => createAgent(agent)),
        )

        for (let i = 0; i < agentResults.length; i++) {
          const { success, error: agentError } = agentResults[i]
          if (success) {
            result.agentsCreated++
          } else if (agentError) {
            result.errors.push(
              `Agent "${selectedAgents[i].name}": ${agentError}`,
            )
          }
        }

        // 3. Create databases if defined in template
        if (template.databases && template.databases.length > 0) {
          console.log(
            `[useApplyTemplate] Creating ${template.databases.length} databases for template "${template.name}"`,
          )

          // Create databases sequentially to avoid conflicts
          for (const database of template.databases) {
            const { success, error: dbError } = await createDatabase(database)
            if (success) {
              result.databasesCreated++
            } else if (dbError) {
              result.errors.push(`Database "${database.name}": ${dbError}`)
            }
          }
        }

        // Set overall success based on whether we had critical failures
        result.success = result.errors.length === 0

        console.log('[useApplyTemplate] Template applied:', {
          template: template.name,
          foldersCreated: result.foldersCreated,
          agentsCreated: result.agentsCreated,
          databasesCreated: result.databasesCreated,
          errors: result.errors.length,
        })

        return result
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to apply template'
        setError(message)
        result.success = false
        result.errors.push(message)
        return result
      } finally {
        setIsApplying(false)
      }
    },
    [flattenFolders, createDirectory, createFile, createAgent, createDatabase],
  )

  return {
    applyTemplate,
    isApplying,
    error,
  }
}
