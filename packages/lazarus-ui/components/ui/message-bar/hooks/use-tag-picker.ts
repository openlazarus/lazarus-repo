'use client'

import { useCallback, useMemo, useState } from 'react'

import { useItems } from '@/hooks/core/use-items'
import { useWorkspace } from '@/hooks/core/use-workspace'
import { useUploadDocument } from '@/hooks/features/file/use-upload-document'
import { useAppNavigator } from '@/hooks/features/use-app-navigator'
import type { WorkspaceFile } from '@/hooks/features/workspace/types'
import { useMediaPicker } from '@/hooks/ui/interaction/use-media-picker'
import { useWorkspaceFileSearch } from '@/hooks/workspace/use-workspace-file-search'
import { useWorkspaceFiles } from '@/hooks/workspace/use-workspace-files'
import { createFile } from '@/model/file'
import { Item } from '@/model/item'
import { useStoreEssentials } from '@/state/store'
import { itemToTaggedItem, useTagStore } from '@/store/tag-store'

export interface TagPickerOptions {
  recentItemsCount?: number
  acceptedFileTypes?: string
}

export interface TagPickerResult {
  isMenuOpen: boolean
  toggleMenu: () => void
  closeMenu: () => void
  handleLocalFileUpload: () => void
  navigateToWorkspace: () => void
  recentItems: Item[]
  loadingRecentItems: boolean
  tagRecentItem: (item: Item) => void
  mediaPickerState: {
    selectedFiles: any[]
    error: string | null
    fileInputRef: React.RefObject<HTMLInputElement>
    handleFileSelect: (e: any) => void
  }
  processUploadedFile: () => void
  currentPath: string
  navigateIntoFolder: (path: string) => void
  navigateUp: () => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  isSearching: boolean
}

/** Convert WorkspaceFile[] to Item[], preserving directory info in metadata */
function workspaceFilesToItems(files: WorkspaceFile[]): Item[] {
  return files.map((f) =>
    createFile({
      id: f.path,
      name: f.displayName || f.name,
      path: f.path,
      size: f.size,
      updatedAt: f.modifiedAt,
      metadata: { isDirectory: f.type === 'directory' },
    }),
  )
}

/**
 * Hook for managing tag picking through various sources.
 * Composes useWorkspaceFiles (folder browse) and useWorkspaceFileSearch (recursive search).
 */
export function useTagPicker(options: TagPickerOptions = {}): TagPickerResult {
  const {
    recentItemsCount = 50,
    acceptedFileTypes = 'image/*,application/pdf',
  } = options

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [currentPath, setCurrentPath] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Core hooks
  const { items: storeItems } = useItems()
  const { selectedWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const workspaceId = selectedWorkspace?.id
  const addTagWithMention = useTagStore((state) => state.addTagWithMention)
  const { changeStudioTab } = useAppNavigator()
  const { activeWorkspaceId } = useStoreEssentials()

  // --- Data sources ---

  // 1. Folder browser: lists files in currentPath
  const { sorted: browseFiles, loading: loadingBrowse } = useWorkspaceFiles(
    workspaceId,
    { path: currentPath },
  )

  // 2. Recursive search: fires when searchTerm >= 2 chars
  const {
    results: searchResults,
    loading: loadingSearch,
    isSearching,
  } = useWorkspaceFileSearch(workspaceId, searchTerm)

  // Convert to Item[]
  const browseItems = useMemo(
    () => workspaceFilesToItems(browseFiles),
    [browseFiles],
  )
  const searchItems = useMemo(
    () => workspaceFilesToItems(searchResults),
    [searchResults],
  )

  // Decide which items to show:
  // - Searching? → show search results
  // - Inside a folder? → show folder contents only
  // - Root? → merge store items + browse files
  const allItems = useMemo(() => {
    if (isSearching) return searchItems

    if (currentPath) return browseItems

    const itemMap = new Map<string, Item>()
    for (const item of storeItems) itemMap.set(item.id, item)
    for (const file of browseItems) itemMap.set(file.id, file)
    return Array.from(itemMap.values())
  }, [isSearching, searchItems, currentPath, browseItems, storeItems])

  // Sort: folders first, then by date
  const recentItems = useMemo(
    () =>
      [...allItems]
        .sort((a, b) => {
          const aIsDir = a.metadata?.isDirectory ? 1 : 0
          const bIsDir = b.metadata?.isDirectory ? 1 : 0
          if (aIsDir !== bIsDir) return bIsDir - aIsDir
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
        })
        .slice(0, recentItemsCount),
    [allItems, recentItemsCount],
  )

  // --- Upload ---

  const {
    fileInputRef,
    selectedFiles,
    handleFileSelect,
    error,
    clearSelection,
  } = useMediaPicker({ accept: acceptedFileTypes, multiple: false })

  const [uploadDocument] = useUploadDocument(
    activeWorkspaceId || '',
    async (_data, _variables, createdFile) => {
      clearSelection()
      closeMenu()
      if (createdFile) {
        addTagWithMention(itemToTaggedItem(createdFile))
      }
    },
  )

  // --- Actions ---

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev)
  }, [])

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false)
    setCurrentPath('')
    setSearchTerm('')
  }, [])

  const handleLocalFileUpload = useCallback(() => {
    fileInputRef.current?.click()
    closeMenu()
  }, [fileInputRef, closeMenu])

  const navigateToWorkspace = useCallback(() => {
    changeStudioTab('workspace')
    closeMenu()
  }, [changeStudioTab, closeMenu])

  const navigateIntoFolder = useCallback((path: string) => {
    setCurrentPath(path)
    setSearchTerm('')
  }, [])

  const navigateUp = useCallback(() => {
    if (!currentPath) return
    const parts = currentPath.split('/')
    parts.pop()
    setCurrentPath(parts.join('/'))
  }, [currentPath])

  const tagRecentItem = useCallback(
    (item: Item) => {
      addTagWithMention(itemToTaggedItem(item))
      closeMenu()
    },
    [addTagWithMention, closeMenu],
  )

  const processUploadedFile = useCallback(
    async (file?: File) => {
      if (!activeWorkspaceId) return
      try {
        const fileToUpload =
          file || (selectedFiles.length > 0 ? selectedFiles[0].file : null)
        if (!fileToUpload) return

        const fileId =
          Date.now().toString(36) + Math.random().toString(36).substring(2, 8)

        await uploadDocument({
          file: fileToUpload,
          path: `files/${fileId}`,
          name: fileToUpload.name,
          metadata: {
            originalName: fileToUpload.name,
            size: fileToUpload.size,
            type: fileToUpload.type,
          },
        })
      } catch (err) {
        console.error('Error initiating upload:', err)
      }
    },
    [activeWorkspaceId, uploadDocument, selectedFiles],
  )

  const handleFileSelectAndProcess = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        const file = files[0]
        handleFileSelect(e)
        await processUploadedFile(file)
      }
    },
    [handleFileSelect, processUploadedFile],
  )

  return {
    isMenuOpen,
    toggleMenu,
    closeMenu,
    handleLocalFileUpload,
    navigateToWorkspace,
    recentItems,
    loadingRecentItems: loadingBrowse || loadingSearch || workspaceLoading,
    tagRecentItem,
    processUploadedFile,
    currentPath,
    navigateIntoFolder,
    navigateUp,
    searchTerm,
    setSearchTerm,
    isSearching,
    mediaPickerState: {
      selectedFiles,
      error,
      fileInputRef,
      handleFileSelect: handleFileSelectAndProcess,
    },
  }
}
