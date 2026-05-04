/* eslint-disable no-console */
'use client'

import React, { useEffect, useState } from 'react'

import { AgentDetailView } from '@/components/features/agents/agent-detail-view'
import { CreateAgentWizard } from '@/components/features/agents/create-agent-wizard'
import { MindmapEditor } from '@/components/features/editors'
import { AddSourceView } from '@/components/features/sources/add-source-view'
import { MCPSourceDetail } from '@/components/features/sources/mcp-source-detail'
import { Source } from '@/components/features/sources/types'
import {
  getFileTypeFromName as getLexicalFileType,
  FileType as LexicalFileType,
  UnifiedLexicalEditor,
} from '@/components/ui/lexical/unified-lexical-editor'
import { EnhancedSlidesEditor } from '@/components/ui/slides/editor/enhanced-slides-editor'
import { DiscordSettings } from '@/components/workspace/discord-settings'
import { DocxViewer } from '@/components/workspace/docx/docx-viewer'
import { ExcelViewer } from '@/components/workspace/excel/excel-viewer'
import { ImageViewer } from '@/components/workspace/image/image-viewer'
import { PdfViewer } from '@/components/workspace/pdf/pdf-viewer'
import { PptxViewer } from '@/components/workspace/pptx/pptx-viewer'
import { SQLiteSchemaViewer } from '@/components/workspace/sqlite/sqlite-schema-viewer'
import { V0ProjectView } from '@/components/workspace/v0/v0-project-view'
import { WorkspaceConfigViewer } from '@/components/workspace/workspace-config-viewer'
import { useAuth } from '@/hooks/auth/use-auth'
import { useAppEvents } from '@/hooks/core/use-app-events'
import { useCreateAgent } from '@/hooks/features/agents/use-create-agent'
import { useAddMcpServer } from '@/hooks/features/mcp/use-add-mcp-server'
import { useDeleteMcpServer } from '@/hooks/features/mcp/use-delete-mcp-server'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'
import { VIRTUAL_FILE_TYPES } from '@/lib/virtual-folders'
import { ClaudeCodeAgent } from '@/model/claude-code-agent'

import { MemoryExplorer } from '@/components/features/knowledge/memory-explorer'
import { FilePreview } from './file-preview'
import { getFileTypeFromName } from './file-type-detector'
import { ActivityDetailViewer } from './viewers/activity-detail-viewer'
import { ActivityViewer } from './viewers/activity-viewer'
import { AgentsViewer } from './viewers/agents-viewer'
import { ApprovalsViewer } from './viewers/approvals-viewer'
import { GetStartedViewer } from './viewers/get-started-viewer'
import { SourcesViewer } from './viewers/sources-viewer'

interface FileSystemEditorProps {
  fileName: string
  filePath: string
  workspaceId: string
  userId?: string
  content: string
  onChange: (content: string) => void
  isWorkflowDocument?: boolean
  isLocked?: boolean
  className?: string
  onCloseTab?: () => void
}

// Simple adapter that uses the same editor logic as studio but works with file system
// Memoized to prevent remounting when parent re-renders
export const FileSystemEditor = React.memo(function FileSystemEditor({
  fileName,
  filePath,
  workspaceId,
  userId: userIdProp,
  content,
  onChange,
  isWorkflowDocument = false,
  isLocked = false,
  className,
  onCloseTab,
}: FileSystemEditorProps) {
  const { isDark } = useTheme()
  const { session } = useAuth()
  const { emit } = useAppEvents()
  const userId = userIdProp || session?.user?.id

  const [createAgent] = useCreateAgent(workspaceId)
  const [pendingAddServer, setPendingAddServer] = useState<{
    name: string
    config: any
  } | null>(null)
  const [pendingDeleteServer, setPendingDeleteServer] = useState('')
  const [addCustomServer] = useAddMcpServer(
    workspaceId,
    pendingAddServer?.name ?? '',
  )
  const [deleteCustomServer] = useDeleteMcpServer(
    workspaceId,
    pendingDeleteServer,
  )

  useEffect(() => {
    if (!pendingAddServer) return
    addCustomServer(pendingAddServer.config)
      .then(() => {
        emit('sourceCreated', pendingAddServer.name)
        onCloseTab?.()
      })
      .catch((err) => {
        console.error('Failed to add server:', err)
        alert(
          `Failed to add server: ${err instanceof Error ? err.message : 'Unknown error'}`,
        )
      })
      .finally(() => setPendingAddServer(null))
  }, [pendingAddServer])

  useEffect(() => {
    if (!pendingDeleteServer) return
    deleteCustomServer({})
      .then(() => {
        emit('sourceDeleted', { sourceName: pendingDeleteServer })
        onCloseTab?.()
      })
      .catch((err) => {
        console.error('Failed to delete source:', err)
      })
      .finally(() => setPendingDeleteServer(''))
  }, [pendingDeleteServer])

  // Check both fileName and filePath for type detection
  const fileTypeFromName = getFileTypeFromName(fileName)
  const fileTypeFromPath = getFileTypeFromName(filePath)

  // Priority: virtual files and special types from path take precedence
  const specialTypes = [
    ...VIRTUAL_FILE_TYPES,
    'knowledge_graph',
    'v0_project',
    'sqlite_database',
    'agent_config',
    'spreadsheet',
    'word_document',
    'presentation',
  ]

  const fileType = specialTypes.includes(fileTypeFromPath)
    ? fileTypeFromPath
    : specialTypes.includes(fileTypeFromName)
      ? fileTypeFromName
      : fileTypeFromPath

  console.log('[FileSystemEditor] File type detection:', {
    filePath,
    fileName,
    fileTypeFromName,
    fileTypeFromPath,
    finalFileType: fileType,
    workspaceId,
    userId,
  })

  // Handle special file types with dedicated viewers
  switch (fileType) {
    case 'agents_collection':
      console.log(
        '[FileSystemEditor] Agents collection virtual file detected:',
        {
          fileName,
          filePath,
          workspaceId,
        },
      )
      return (
        <div className={className}>
          <AgentsViewer workspaceId={workspaceId} />
        </div>
      )

    case 'agent_create':
      console.log('[FileSystemEditor] Agent create detected:', {
        fileName,
        filePath,
        workspaceId,
      })

      const handleSaveAgent = async (agentData: Partial<ClaudeCodeAgent>) => {
        const data = await createAgent(agentData)
        if (data) {
          emit('agentCreated', (data as any).agent)
          onCloseTab?.()
          const agentId = (data as any).agent?.id
          if (agentId) {
            window.dispatchEvent(
              new CustomEvent('openFile', {
                detail: {
                  file: {
                    path: `agent/${agentId}`,
                    name: (data as any).agent?.name || agentId,
                    fileType: 'agent_detail',
                  },
                  workspace: { id: workspaceId },
                },
              }),
            )
          }
        }
      }

      return (
        <div className={cn(className, 'h-full')}>
          <CreateAgentWizard
            onSave={handleSaveAgent}
            onClose={() => {
              // Close the tab when cancel is clicked
              onCloseTab?.()
            }}
          />
        </div>
      )

    case 'agent_detail': {
      // Extract agent ID from path (format: workspace/agent/{agentId})
      const agentId = filePath.split('/agent/')[1]?.split('/')[0] || ''
      console.log('[FileSystemEditor] Agent detail detected:', {
        fileName,
        filePath,
        agentId,
        workspaceId,
      })
      return (
        <div className={className}>
          <AgentDetailView
            agentId={agentId}
            workspaceId={workspaceId}
            isDark={isDark}
          />
        </div>
      )
    }

    case 'sources_collection':
      console.log(
        '[FileSystemEditor] Sources collection virtual file detected:',
        {
          fileName,
          filePath,
          workspaceId,
        },
      )
      return (
        <div className={className}>
          <SourcesViewer workspaceId={workspaceId} />
        </div>
      )

    case 'source_create':
      console.log('[FileSystemEditor] Source create detected:', {
        fileName,
        filePath,
        workspaceId,
      })

      const handleAddSource = async (name: string, config: any) => {
        setPendingAddServer({ name, config })
      }

      const handleCloseAddSource = () => {
        onCloseTab?.()
      }

      return (
        <div className={className}>
          <AddSourceView
            onClose={handleCloseAddSource}
            onAdd={handleAddSource}
          />
        </div>
      )

    case 'source_detail': {
      // Extract source name from path (format: workspace/source/{sourceName})
      const sourceName = filePath.split('/source/')[1]?.split('/')[0] || ''
      console.log('[FileSystemEditor] Source detail detected:', {
        fileName,
        filePath,
        sourceName,
        workspaceId,
      })

      // Create a minimal source object for the detail view
      // The component will fetch the full data
      const source: Source = {
        id: sourceName,
        name: sourceName,
        type: 'source',
        status: 'connected',
        serverId: 'default',
        metadata: {},
        has_env: false,
        enabled: true,
        command: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const handleDeleteSource = async (name: string) => {
        setPendingDeleteServer(name)
      }

      return (
        <div className={className}>
          <MCPSourceDetail
            serverName={sourceName}
            source={source}
            workspaceId={workspaceId}
            isDark={isDark}
            onToggle={async () => {
              // Toggle handled by component
            }}
            onDelete={handleDeleteSource}
            onRefresh={async () => {
              // Refresh handled by component
            }}
            onBack={() => {
              // Back handled by tab system
            }}
          />
        </div>
      )
    }

    case 'approvals_collection':
      return (
        <div className={className}>
          <ApprovalsViewer workspaceId={workspaceId} />
        </div>
      )

    case 'activity_collection':
      console.log(
        '[FileSystemEditor] Activity collection virtual file detected:',
        {
          fileName,
          filePath,
          workspaceId,
        },
      )
      return (
        <div className={className}>
          <ActivityViewer workspaceId={workspaceId} />
        </div>
      )

    case 'activity_detail': {
      // Extract activity log ID from path (format: workspace/activity/{logId})
      const activityLogId = filePath.split('/activity/')[1]?.split('/')[0] || ''
      console.log('[FileSystemEditor] Activity detail detected:', {
        fileName,
        filePath,
        activityLogId,
        workspaceId,
      })
      return (
        <div className={cn(className, 'h-full')}>
          <ActivityDetailViewer
            logId={activityLogId}
            workspaceId={workspaceId}
          />
        </div>
      )
    }

    case 'workspace_collection':
      console.log(
        '[FileSystemEditor] Workspace collection virtual file detected:',
        {
          fileName,
          filePath,
          workspaceId,
        },
      )
      return (
        <div className={className}>
          <WorkspaceConfigViewer
            workspaceId={workspaceId}
            filePath={filePath}
            userId={userId || ''}
          />
        </div>
      )

    case 'knowledge_graph':
      console.log('[FileSystemEditor] knowledge_graph folder detected:', {
        fileName,
        filePath,
        userId,
      })
      return (
        <div className={className}>
          <MemoryExplorer
            key={`memory-explorer-${isDark ? 'dark' : 'light'}`}
            workspaceId={workspaceId}
            userId={userId || 'efc4553d-bcc9-41a4-b617-acb21037af7c'}
          />
        </div>
      )

    case 'v0_project':
      // Extract project name from filename (remove .app extension)
      const projectName = fileName.replace(/\.app$/i, '')
      console.log('[FileSystemEditor] v0 project (.app) detected:', {
        fileName,
        projectName,
        filePath,
      })
      return (
        <div className={className}>
          <V0ProjectView
            workspaceId={workspaceId}
            projectId={projectName}
            filePath={filePath}
          />
        </div>
      )

    case 'sqlite_database':
      // Extract database name from filename (remove .db extension)
      const dbName = fileName.replace(/\.db$/i, '')
      console.log('[FileSystemEditor] SQLite database detected:', {
        fileName,
        dbName,
        filePath,
      })
      return (
        <div className={className}>
          <SQLiteSchemaViewer
            workspaceId={workspaceId}
            databasePath={filePath}
            databaseName={dbName}
          />
        </div>
      )

    case 'workspace_config':
      console.log('[FileSystemEditor] Workspace config detected:', {
        fileName,
        filePath,
        workspaceId,
      })
      return (
        <div className={className}>
          <WorkspaceConfigViewer
            workspaceId={workspaceId}
            filePath={filePath}
            userId={userId ?? ''}
          />
        </div>
      )

    case 'discord_settings': {
      const connectionId = filePath.split('/').pop() || ''
      return (
        <div className={className}>
          <div className='mx-auto max-w-2xl p-6'>
            <DiscordSettings
              connectionId={connectionId}
              onBack={() => onCloseTab?.()}
            />
          </div>
        </div>
      )
    }

    case 'agent_config':
      // Extract agent ID from file path (e.g., agents/pricing/config.agent.json -> pricing)
      const agentIdMatch =
        filePath.match(/agents\/([^/]+)\/config\.agent\.json/) ||
        filePath.match(/\.system\/agents\/([^/]+)\/config\.agent\.json/)
      const agentId = agentIdMatch ? agentIdMatch[1] : 'unknown'
      console.log('[FileSystemEditor] Agent config detected:', {
        fileName,
        filePath,
        agentId,
      })
      return (
        <div className={className}>
          <AgentDetailView
            agentId={agentId}
            workspaceId={workspaceId}
            isDark={isDark}
          />
        </div>
      )

    case 'image':
      console.log('[FileSystemEditor] Image file detected:', {
        fileName,
        filePath,
      })
      return (
        <div className={className}>
          <ImageViewer
            filePath={filePath}
            fileName={fileName}
            workspaceId={workspaceId}
          />
        </div>
      )

    case 'pdf':
      console.log('[FileSystemEditor] PDF document detected:', {
        fileName,
        filePath,
      })
      return (
        <div className={className}>
          <PdfViewer
            workspaceId={workspaceId}
            filePath={filePath}
            fileName={fileName}
          />
        </div>
      )

    case 'spreadsheet':
      console.log('[FileSystemEditor] Spreadsheet (xlsx/xls) detected:', {
        fileName,
        filePath,
      })
      return (
        <div className={className}>
          <ExcelViewer
            workspaceId={workspaceId}
            filePath={filePath}
            fileName={fileName}
            userId={userId}
          />
        </div>
      )

    case 'word_document':
      console.log('[FileSystemEditor] Word document detected:', {
        fileName,
        filePath,
      })
      return (
        <div className={className}>
          <DocxViewer
            workspaceId={workspaceId}
            filePath={filePath}
            fileName={fileName}
          />
        </div>
      )

    case 'presentation':
      console.log('[FileSystemEditor] PowerPoint presentation detected:', {
        fileName,
        filePath,
      })
      return (
        <div className={className}>
          <PptxViewer
            workspaceId={workspaceId}
            filePath={filePath}
            fileName={fileName}
          />
        </div>
      )

    case 'get_started':
      console.log('[FileSystemEditor] Get started onboarding view detected:', {
        fileName,
        filePath,
        workspaceId,
      })
      return (
        <div className={className}>
          <GetStartedViewer
            onComplete={() => {
              // Close the tab after completing onboarding
              onCloseTab?.()
            }}
          />
        </div>
      )
  }

  // Get the Lexical file type for unified handling
  const lexicalFileType = getLexicalFileType(fileName)

  // Handle special non-editable file types
  if (fileType === 'mindmap') {
    return (
      <div className='relative h-full w-full'>
        <MindmapEditor
          key={filePath}
          content={content}
          onChange={onChange}
          lastModified={new Date()}
        />
      </div>
    )
  }

  if (fileType === 'slides') {
    return (
      <div className='relative h-full w-full'>
        <EnhancedSlidesEditor
          key={filePath}
          value={content}
          onChange={onChange}
          className='h-full'
        />
      </div>
    )
  }

  // Handle file types that Lexical can't edit
  const editableTypes: LexicalFileType[] = [
    'document',
    'markdown',
    'code',
    'csv',
    'table',
    'json',
    'text',
  ]

  if (
    !editableTypes.includes(lexicalFileType) &&
    lexicalFileType !== 'unknown'
  ) {
    return (
      <div className={className}>
        <FilePreview fileName={fileName} fileType={fileType} />
      </div>
    )
  }

  // Use the Unified Lexical Editor for all supported file types
  return (
    <div className='relative h-full w-full'>
      {isLocked && (
        <div className='absolute left-0 right-0 top-0 z-10 flex items-center gap-2 border-b bg-amber-500/10 px-4 py-2 text-sm text-amber-600 dark:text-amber-500'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-4 w-4'
            viewBox='0 0 24 24'
            fill='currentColor'>
            <path d='M12 1L21.5 6.5V17.5L12 23L2.5 17.5V6.5L12 1ZM12 3.311L4.5 7.653V16.347L12 20.689L19.5 16.347V7.653L12 3.311ZM11 11H13V16H11V11ZM11 7H13V9H11V7Z' />
          </svg>
          This file is locked and cannot be edited.
        </div>
      )}
      <UnifiedLexicalEditor
        key={filePath}
        content={content}
        onChange={isLocked ? undefined : onChange}
        fileType={lexicalFileType}
        fileName={fileName}
        isWorkflowDocument={isWorkflowDocument}
        placeholder={`Start editing ${fileName}...`}
        editorKey={filePath}
      />
    </div>
  )
})
