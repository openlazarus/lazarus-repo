'use client'

import { useEffect, useRef } from 'react'

import { DashboardPageLayout } from '@/components/features/dashboard'
import { useTabs } from '@/hooks/core/use-tabs'
import { useWorkspace } from '@/hooks/core/use-workspace'
import { FileType } from '@/model/file'
import { useIdentity } from '@/state/identity'
import { useFileTabStore } from '@/store/file-tab-store'

import { LayoutFileEditor } from './files/components/layout-file-editor'

export default function FilesPage() {
  const { selectedWorkspace } = useWorkspace()
  const { openFileTab, tabs } = useTabs()
  const { profile } = useIdentity()

  // Get current workspace ID from tab store to ensure we're synced
  const tabStoreWorkspaceId = useFileTabStore(
    (state) => state.currentWorkspaceId,
  )

  // Track which workspaces we've already opened onboarding for
  const onboardingOpenedRef = useRef<Set<string>>(new Set())

  // Open get-started tab for workspaces that need onboarding
  useEffect(() => {
    if (!selectedWorkspace || !profile) return

    const workspaceId = selectedWorkspace.id
    const needsOnboarding = (selectedWorkspace as any).needsOnboarding

    // Wait for the tab store to be synced to this workspace
    // This prevents race conditions when switching workspaces
    if (tabStoreWorkspaceId !== workspaceId) {
      console.log('[Onboarding] Waiting for tab store to sync:', {
        tabStoreWorkspaceId,
        workspaceId,
      })
      return
    }

    console.log('[Onboarding] Checking workspace:', {
      workspaceId,
      needsOnboarding,
      tabsLength: tabs.length,
      alreadyOpened: onboardingOpenedRef.current.has(workspaceId),
    })

    // Only open onboarding if:
    // 1. Workspace needs onboarding
    // 2. We haven't already opened it for this workspace in this session
    // 3. Tab store is synced to this workspace (checked above)
    if (needsOnboarding && !onboardingOpenedRef.current.has(workspaceId)) {
      console.log(
        '[Onboarding] Opening workspace config and get-started for workspace:',
        workspaceId,
      )
      onboardingOpenedRef.current.add(workspaceId)

      // Open workspace config tab first
      openFileTab(`${workspaceId}/.workspace.json`, {
        name: 'Workspace',
        fileType: 'workspace_config' as FileType,
        scope: 'user',
        scopeId: workspaceId,
      })

      // Then open get-started tab (this will be the active one)
      openFileTab(`${workspaceId}/get-started`, {
        name: 'Get Started',
        fileType: 'get_started' as FileType,
        scope: 'user',
        scopeId: workspaceId,
      })
    }
  }, [
    selectedWorkspace,
    profile,
    tabs.length,
    openFileTab,
    tabStoreWorkspaceId,
  ])

  // Listen for file open events from the sidebar
  useEffect(() => {
    const handleFileOpen = async (event: CustomEvent) => {
      const { file, workspace } = event.detail

      if (!workspace || !profile) {
        console.error('No workspace or profile available')
        return
      }

      // Determine file type based on extension
      const getFileType = (fileName: string, filePath: string): FileType => {
        // Check for special virtual files first
        // Normalize paths and names for comparison
        const normalizedPath = filePath.toLowerCase()
        const normalizedName = fileName.toLowerCase()

        console.log('[getFileType] Checking file:', {
          fileName,
          filePath,
          normalizedPath,
          normalizedName,
        })

        // Check for virtual collection paths (no longer using __virtual__ prefix)
        if (normalizedPath === 'agents' || normalizedName === 'agents') {
          console.log('[getFileType] -> agents_collection')
          return 'agents_collection' as FileType
        }
        if (normalizedPath === 'sources' || normalizedName === 'sources') {
          console.log('[getFileType] -> sources_collection')
          return 'sources_collection' as FileType
        }
        if (normalizedPath === 'activity' || normalizedName === 'activity') {
          console.log('[getFileType] -> activity_collection')
          return 'activity_collection' as FileType
        }
        if (normalizedPath === 'approvals' || normalizedName === 'approvals') {
          return 'approvals_collection' as FileType
        }

        // Check for workspace config file
        if (
          normalizedPath === '.workspace.json' ||
          normalizedName === '.workspace.json' ||
          normalizedPath.endsWith('/.workspace.json')
        ) {
          console.log('[getFileType] -> workspace_config')
          return 'workspace_config' as FileType
        }

        if (
          normalizedName.includes('knowledge graph') ||
          normalizedName.includes('memory package') ||
          normalizedPath === '.knowledge' ||
          normalizedPath.endsWith('/.knowledge') ||
          normalizedPath.includes('.knowledge/')
        ) {
          return 'knowledge_graph' as FileType
        }

        // Check for v0 projects
        if (fileName.toLowerCase().endsWith('.app')) {
          return 'v0_project' as FileType
        }

        // Check for SQLite databases
        if (
          fileName.toLowerCase().endsWith('.sqlite') ||
          fileName.toLowerCase().endsWith('.db')
        ) {
          return 'sqlite_database' as FileType
        }

        const ext = fileName.split('.').pop()?.toLowerCase()
        switch (ext) {
          case 'md':
          case 'txt':
          case 'doc':
          case 'docx':
            return 'document'
          case 'js':
          case 'jsx':
          case 'ts':
          case 'tsx':
          case 'py':
          case 'java':
          case 'cpp':
          case 'c':
          case 'go':
          case 'rs':
          case 'php':
          case 'rb':
          case 'swift':
          case 'kt':
          case 'scala':
          case 'sh':
          case 'bash':
          case 'zsh':
          case 'fish':
          case 'ps1':
          case 'bat':
          case 'cmd':
          case 'css':
          case 'scss':
          case 'sass':
          case 'less':
          case 'html':
          case 'xml':
          case 'json':
          case 'yaml':
          case 'yml':
          case 'toml':
          case 'ini':
          case 'cfg':
          case 'conf':
            return 'code'
          case 'csv':
          case 'xls':
          case 'xlsx':
            return 'table'
          case 'ppt':
          case 'pptx':
            return 'slides'
          case 'jpg':
          case 'jpeg':
          case 'png':
          case 'gif':
          case 'svg':
          case 'webp':
          case 'bmp':
          case 'ico':
            return 'image'
          case 'mp4':
          case 'avi':
          case 'mov':
          case 'wmv':
          case 'flv':
          case 'webm':
          case 'mkv':
          case 'ogv':
            return 'video'
          case 'mp3':
          case 'wav':
          case 'ogg':
          case 'flac':
          case 'aac':
          case 'm4a':
          case 'wma':
            return 'audio'
          case 'pdf':
            return 'pdf'
          case 'zip':
          case 'tar':
          case 'gz':
          case 'rar':
          case '7z':
          case 'bz2':
          case 'xz':
            return 'archive'
          default:
            return 'document'
        }
      }

      console.log('[handleFileOpen] Opening file:', {
        file,
        workspace,
        filePath: file.path,
        fileName: file.name,
      })

      // Open file in a new tab
      const cleanFilePath = file.path.startsWith('/')
        ? file.path.slice(1)
        : file.path
      const fullPath = `${workspace.id}/${cleanFilePath}`

      // Check if fileType is explicitly provided (e.g., for agent/source creation)
      const detectedFileType =
        file.fileType || getFileType(file.name, file.path)

      // Override display name for special files
      let displayName = file.displayName || file.name
      if (detectedFileType === 'workspace_config') {
        displayName = 'Workspace'
      }
      if (detectedFileType === 'sources_collection') {
        displayName = 'Tools'
      }
      if (detectedFileType === 'source_create') {
        displayName = 'Add Tool'
      }
      if (detectedFileType === 'source_detail') {
        displayName = 'Tool Details'
      }

      const customIcon = file.icon ? `/icons/workspace/${file.icon}` : undefined
      console.log('[handleFileOpen] Opening tab with:', {
        fullPath,
        displayName,
        fileType: detectedFileType,
        explicitFileType: file.fileType,
      })

      await openFileTab(fullPath, {
        name: displayName,
        fileType: detectedFileType,
        scope: 'user',
        scopeId: workspace.id,
      })
    }

    window.addEventListener('openFile', handleFileOpen as any)
    return () => {
      window.removeEventListener('openFile', handleFileOpen as any)
    }
  }, [openFileTab, profile])

  // Always render the tab-based file editor
  // Virtual files (Agents, Sources, Activity) now open as tabs
  if (!profile) return null

  return (
    <DashboardPageLayout hideHeader={true}>
      <div className='h-full'>
        <LayoutFileEditor
          userId={profile.id}
          teamId={(selectedWorkspace as any)?.team_id}
          className='h-full'
        />
      </div>
    </DashboardPageLayout>
  )
}
