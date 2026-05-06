import { useCallback } from 'react'

import type { Workspace, WorkspaceFile } from '@/hooks/features/workspace/types'
import { WorkspaceService } from '@/services/workspace.service'
import { useFileExplorerStore } from '@/store/file-explorer-store'

// Stable empty array to avoid creating new references
const EMPTY_FILES: WorkspaceFile[] = []

/**
 * Hook to get file explorer preferences (showHiddenFiles, sortBy)
 * Only re-renders when preferences change
 */
export function useFileExplorerPreferences() {
  const showHiddenFiles = useFileExplorerStore((state) => state.showHiddenFiles)
  const sortBy = useFileExplorerStore((state) => state.sortBy)
  return { showHiddenFiles, sortBy }
}

/**
 * Hook to get preference setters
 * Returns stable function references
 */
export function useFileExplorerPreferenceActions() {
  const setShowHiddenFiles = useFileExplorerStore(
    (state) => state.setShowHiddenFiles,
  )
  const setSortBy = useFileExplorerStore((state) => state.setSortBy)
  return { setShowHiddenFiles, setSortBy }
}

/**
 * Hook to check if a specific folder is expanded
 * Only re-renders when this specific folder's state changes
 *
 * Returns a boolean directly from the selector so Zustand can properly
 * compare primitive values and trigger re-renders when the state changes.
 */
export function useIsFolderExpanded(folderId: string): boolean {
  return useFileExplorerStore((state) => state.expandedFolders.has(folderId))
}

/**
 * Hook to check if a specific folder is loading
 * Only re-renders when this specific folder's loading state changes
 *
 * Returns a boolean directly from the selector so Zustand can properly
 * compare primitive values and trigger re-renders when the state changes.
 */
export function useIsFolderLoading(folderId: string): boolean {
  return useFileExplorerStore((state) => state.loadingFiles.has(folderId))
}

/**
 * Hook to get files for a specific folder
 * Only re-renders when this specific folder's files change
 * Uses stable empty array reference to prevent infinite loops
 */
export function useFolderFiles(folderId: string): WorkspaceFile[] {
  const files = useFileExplorerStore((state) =>
    state.workspaceFiles.get(folderId),
  )
  return files ?? EMPTY_FILES
}

/**
 * Hook to get folder actions (toggle, expand, collapse)
 * Returns stable function references
 */
export function useFolderActions() {
  const toggleFolder = useFileExplorerStore((state) => state.toggleFolder)
  const expandFolder = useFileExplorerStore((state) => state.expandFolder)
  const collapseFolder = useFileExplorerStore((state) => state.collapseFolder)
  return { toggleFolder, expandFolder, collapseFolder }
}

/**
 * Hook to get file loading actions
 * Returns stable function references
 */
export function useFileLoadingActions() {
  const setLoading = useFileExplorerStore((state) => state.setLoading)
  const setFiles = useFileExplorerStore((state) => state.setFiles)
  const clearFiles = useFileExplorerStore((state) => state.clearFiles)
  return { setLoading, setFiles, clearFiles }
}

/**
 * Hook that provides a function to load files for a workspace folder
 * Handles loading state and caching automatically
 */
export function useLoadWorkspaceFiles(profileId: string | undefined) {
  const setLoading = useFileExplorerStore((state) => state.setLoading)
  const setFiles = useFileExplorerStore((state) => state.setFiles)
  const getFiles = useFileExplorerStore((state) => state.getFiles)

  const loadWorkspaceFiles = useCallback(
    async (
      workspace: Workspace,
      path: string = '/',
      forceRefresh: boolean = false,
    ) => {
      if (!profileId) return

      const folderId = `${workspace.id}:${path}`

      // Skip if already have files cached (unless force refresh)
      if (!forceRefresh) {
        const existingFiles = getFiles(folderId)
        if (existingFiles.length > 0) return
      }

      // Skip if already loading this folder (dedup concurrent requests)
      const store = useFileExplorerStore.getState()
      if (store.loadingFiles.has(folderId)) return

      setLoading(folderId, true)

      try {
        const service = new WorkspaceService()
        const response = await service.listFiles(workspace.id, path)
        setFiles(folderId, response.files)
      } catch (error) {
        console.error('Failed to load files:', error)
      } finally {
        setLoading(folderId, false)
      }
    },
    [profileId, setLoading, setFiles, getFiles],
  )

  const toggleFolderWithLoad = useCallback(
    (workspace: Workspace, folderPath: string) => {
      const folderId = `${workspace.id}:${folderPath}`
      const store = useFileExplorerStore.getState()

      if (store.isExpanded(folderId)) {
        store.collapseFolder(folderId)
      } else {
        store.expandFolder(folderId)
        // Load files if not already loaded
        if (store.getFiles(folderId).length === 0) {
          loadWorkspaceFiles(workspace, folderPath)
        }
      }
    },
    [loadWorkspaceFiles],
  )

  return { loadWorkspaceFiles, toggleFolderWithLoad }
}

/**
 * Combined hook for file tree item - provides all needed state and actions
 * Optimized to only subscribe to relevant state
 */
export function useFileTreeItemState(fileId: string) {
  const isExpanded = useIsFolderExpanded(fileId)
  const isLoading = useIsFolderLoading(fileId)
  const children = useFolderFiles(fileId)

  return { isExpanded, isLoading, children }
}
