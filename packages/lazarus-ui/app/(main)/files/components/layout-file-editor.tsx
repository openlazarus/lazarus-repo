/* eslint-disable no-console, @typescript-eslint/no-unused-vars */
'use client'

// History feature disabled
// import { RiHistoryLine } from '@remixicon/react'
import { RiCheckLine, RiFileCopyLine, RiFileTextLine } from '@remixicon/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { TagButton } from '@/components/ui/button/tag-button'
import {
  Tab as DraggableTab,
  DraggableTabs,
} from '@/components/ui/draggable-tabs'
import Spinner from '@/components/ui/spinner'
import { FileChangeEvent, useFileWatcher } from '@/hooks/core/use-file-watcher'
import { Tab, useTabs } from '@/hooks/core/use-tabs'
import { useTagger } from '@/hooks/core/use-tagger'
import { useWorkspace } from '@/hooks/core/use-workspace'
import { useCreateDirectory } from '@/hooks/features/file/use-create-directory'
import { useTheme } from '@/hooks/ui/use-theme'
import { useOperatingSystem } from '@/hooks/utils/use-os'
import { cn } from '@/lib/utils'
import { VIRTUAL_FILE_TYPES } from '@/lib/virtual-folders'
import { Item } from '@/model/item'
import { useStore } from '@/state/store'
import { useFileExplorerStore } from '@/store/file-explorer-store'

import { CreateFileDialog } from './create-file-dialog'
import { FileSystemEditor } from './file-system-editor'
import {
  FileInfo,
  fileService,
  FileTooLargeError,
  MAX_PREVIEW_BYTES,
  ScopeType,
} from './services/file.service'
// History feature disabled
// import { FileHistoryViewer } from './file-history-viewer'

interface LayoutFileEditorProps {
  userId: string
  teamId?: string
  className?: string
  onBackToFileBrowser?: () => void
}

type SaveStatus = 'saved' | 'saving' | 'error' | 'dirty' | 'unsaved'

interface EditorFile {
  fileInfo: FileInfo
  content: string
  isLoading: boolean
  isDirty: boolean
  isSaving: boolean
  saveStatus: SaveStatus
  saveError?: string
  lastSaved?: Date
  scope: ScopeType
  scopeId: string
  tooLarge?: { size: number | null; limit: number }
}

export function LayoutFileEditor({
  userId,
  teamId,
  className,
  onBackToFileBrowser,
}: LayoutFileEditorProps) {
  const {
    tabs,
    activeTab,
    activeTabId,
    closeTab,
    switchToTab,
    reorderTabsFromArray,
  } = useTabs()
  const { isDark } = useTheme()
  const { selectedWorkspace } = useWorkspace()
  const os = useOperatingSystem()
  const { tagItem, isItemTagged, untagItem } = useTagger()
  const { setItems } = useStore()
  const clearFiles = useFileExplorerStore((state) => state.clearFiles)

  const [openFiles, setOpenFiles] = useState<Map<string, EditorFile>>(new Map())
  const [copiedPath, setCopiedPath] = useState<string | null>(null)
  const [copiedContent, setCopiedContent] = useState<string | null>(null)
  const [fileChangeNotification, setFileChangeNotification] = useState<{
    path: string
    timestamp: string
  } | null>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  // History feature disabled
  // const [showHistory, setShowHistory] = useState(false)

  // New file dialog state
  const [newFileDialogOpen, setNewFileDialogOpen] = useState(false)
  const [targetDirectory, setTargetDirectory] = useState<string>('/')

  // Get OS-specific save shortcut
  const saveShortcut = os === 'MacOS' ? '⌘S' : 'Ctrl+S'

  // Get workspace ID from selected workspace or active editor file
  const activeEditorFileForWorkspace = activeTab
    ? openFiles.get(activeTab.fileId)
    : null
  const workspaceId =
    selectedWorkspace?.id || activeEditorFileForWorkspace?.scopeId

  const [createDirectoryMutation] = useCreateDirectory(workspaceId ?? '')

  // File watcher hook
  const { isConnected } = useFileWatcher({
    workspaceId: workspaceId || '',
    userId: userId,
    enabled: !!workspaceId,
    onFileChange: (event: FileChangeEvent) => {
      console.log('[LayoutFileEditor] File change detected:', event)

      // Handle new file creation - auto-open the file only for the user who created it
      if (
        event.type === 'file:created' &&
        event.path &&
        workspaceId &&
        event.userId &&
        event.userId === userId
      ) {
        console.log(
          '[LayoutFileEditor] Auto-opening newly created file:',
          event.path,
        )

        // Dispatch custom event to open the file
        setTimeout(() => {
          const fileName = event.path!.split('/').pop() || event.path!
          window.dispatchEvent(
            new CustomEvent('openFile', {
              detail: {
                file: {
                  name: fileName,
                  path: event.path,
                  displayName: fileName,
                },
                workspace: {
                  id: workspaceId,
                },
              },
            }),
          )
        }, 500) // Small delay to ensure file is fully written
      }

      // Check if the changed file is currently open
      const openFile = Array.from(openFiles.values()).find(
        (f) => f.fileInfo.path === event.path,
      )

      if (openFile && event.type === 'file:modified') {
        // Show notification
        setFileChangeNotification({
          path: event.path || '',
          timestamp: event.timestamp,
        })
      }
    },
  })

  // Scroll to top when active tab changes
  useEffect(() => {
    if (editorContainerRef.current && activeTab) {
      editorContainerRef.current.scrollTop = 0
    }
  }, [activeTab?.fileId])

  // Load file content when a new tab becomes active
  useEffect(() => {
    const tabFileInfo = (activeTab as Tab)?.fileInfo
    if (!activeTab || !tabFileInfo?.scope || !tabFileInfo?.scopeId) {
      return
    }

    // Don't reload if file is already loaded and not in loading state
    const existingFile = openFiles.get(activeTab.fileId)
    if (existingFile && !existingFile.isLoading) {
      return
    }

    // Create a mock FileInfo from tab data
    const fileInfo: FileInfo = {
      name: activeTab.fileInfo?.name || 'Untitled',
      path: activeTab.fileId,
      size: 0,
      sizeKB: 0,
      modified: new Date().toISOString(),
      isDirectory: false,
      isFile: true,
    }

    // Create editor file entry with loading state - use scope from tab
    const editorFile: EditorFile = {
      fileInfo,
      content: '',
      isLoading: true,
      isDirty: false,
      isSaving: false,
      saveStatus: 'saved',
      scope: tabFileInfo.scope as ScopeType,
      scopeId: tabFileInfo.scopeId,
    }

    setOpenFiles((prev) => new Map(prev.set(activeTab.fileId, editorFile)))

    // Skip loading content for special virtual file types
    const fileType = activeTab.fileInfo?.fileType
    const isVirtualFile = [
      ...VIRTUAL_FILE_TYPES,
      'knowledge_graph',
      'v0_project',
      'sqlite_database',
      'word_document',
      'presentation',
      'spreadsheet',
      'image',
      'pdf',
    ].includes(fileType || '')

    if (isVirtualFile) {
      // For virtual files, just mark as loaded without fetching content
      setOpenFiles((prev) => {
        const updated = new Map(prev)
        const existing = updated.get(activeTab.fileId)
        if (existing) {
          updated.set(activeTab.fileId, {
            ...existing,
            content: '', // Virtual files don't have content
            isLoading: false,
            isDirty: false,
            saveStatus: 'saved',
          })
        }
        return updated
      })
      return
    }

    // Preemptive size check using metadata from the file-explorer entry
    const knownSize = (activeTab.fileInfo as FileInfo | undefined)?.size
    if (typeof knownSize === 'number' && knownSize > MAX_PREVIEW_BYTES) {
      setOpenFiles((prev) => {
        const updated = new Map(prev)
        const existing = updated.get(activeTab.fileId)
        if (existing) {
          updated.set(activeTab.fileId, {
            ...existing,
            content: '',
            isLoading: false,
            isDirty: false,
            saveStatus: 'saved',
            tooLarge: { size: knownSize, limit: MAX_PREVIEW_BYTES },
          })
        }
        return updated
      })
      return
    }

    // Load file content
    const loadFile = async () => {
      try {
        // Use current selected workspace instead of parsing from fileId (which can be stale from localStorage)
        const workspaceIdFromPath = selectedWorkspace?.id || editorFile.scopeId
        // Remove workspace ID prefix from file path
        const pathParts = activeTab.fileId.split('/')
        const filePathWithoutWorkspace = pathParts.slice(1).join('/')

        const fileContent = await fileService.readFile(
          editorFile.scope,
          workspaceIdFromPath, // Use current selected workspace ID
          filePathWithoutWorkspace, // File path without workspace prefix
          userId,
          teamId,
        )

        setOpenFiles((prev) => {
          const updated = new Map(prev)
          const existing = updated.get(activeTab.fileId)
          if (existing) {
            updated.set(activeTab.fileId, {
              ...existing,
              content: fileContent.content,
              isLoading: false,
              isDirty: false, // Ensure file is not dirty when first loaded
              saveStatus: 'saved',
            })
          }
          return updated
        })
      } catch (error) {
        if (error instanceof FileTooLargeError) {
          setOpenFiles((prev) => {
            const updated = new Map(prev)
            const existing = updated.get(activeTab.fileId)
            if (existing) {
              updated.set(activeTab.fileId, {
                ...existing,
                content: '',
                isLoading: false,
                isDirty: false,
                saveStatus: 'saved',
                tooLarge: { size: error.size, limit: error.limit },
              })
            }
            return updated
          })
          return
        }
        console.error('Failed to load file:', error)
        // Remove failed file from editor files
        setOpenFiles((prev) => {
          const updated = new Map(prev)
          updated.delete(activeTab.fileId)
          return updated
        })
      }
    }

    loadFile()
  }, [activeTab?.fileId, userId, teamId])

  // Save file content
  const saveFile = useCallback(
    async (filePath: string) => {
      const editorFile = openFiles.get(filePath)
      if (!editorFile || !editorFile.isDirty || editorFile.isSaving) return

      // Set saving state
      setOpenFiles((prev) => {
        const updated = new Map(prev)
        const existing = updated.get(filePath)
        if (existing) {
          updated.set(filePath, {
            ...existing,
            isSaving: true,
            saveStatus: 'saving',
            saveError: undefined,
          })
        }
        return updated
      })

      try {
        // Extract workspace ID from file path (first segment)
        const pathParts = filePath.split('/')
        const workspaceIdFromPath = pathParts[0] || editorFile.scopeId
        // Remove workspace ID prefix from file path
        const filePathWithoutWorkspace = pathParts.slice(1).join('/')

        const result = await fileService.writeFile(
          editorFile.scope,
          workspaceIdFromPath, // Use workspace ID from path, not scopeId
          filePathWithoutWorkspace, // Remove workspace ID prefix
          editorFile.content,
          userId,
          teamId || '',
        )

        // Success state
        setOpenFiles((prev) => {
          const updated = new Map(prev)
          const existing = updated.get(filePath)
          if (existing) {
            updated.set(filePath, {
              ...existing,
              isDirty: false,
              isSaving: false,
              saveStatus: 'saved',
              lastSaved: result.modified
                ? new Date(result.modified)
                : new Date(),
            })
          }
          return updated
        })

        // Update original content to the saved content
        setOriginalContent(
          (prev) => new Map(prev.set(filePath, editorFile.content)),
        )

        // Show success feedback briefly
        setTimeout(() => {
          setOpenFiles((prev) => {
            const updated = new Map(prev)
            const existing = updated.get(filePath)
            if (existing && !existing.isDirty) {
              updated.set(filePath, {
                ...existing,
                saveStatus: 'saved',
              })
            }
            return updated
          })
        }, 2000)
      } catch (error) {
        console.error('Failed to save file:', error)
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to save file'

        // Error state
        setOpenFiles((prev) => {
          const updated = new Map(prev)
          const existing = updated.get(filePath)
          if (existing) {
            updated.set(filePath, {
              ...existing,
              isSaving: false,
              saveStatus: 'error',
              saveError: errorMessage,
            })
          }
          return updated
        })
      }
    },
    [userId, teamId, openFiles],
  )

  // Store original content for dirty comparison
  const [originalContent, setOriginalContent] = useState<Map<string, string>>(
    new Map(),
  )

  // Update original content when file loads
  useEffect(() => {
    if (!activeTab) return

    const editorFile = openFiles.get(activeTab.fileId)
    if (
      editorFile &&
      !editorFile.isLoading &&
      !originalContent.has(activeTab.fileId)
    ) {
      setOriginalContent(
        (prev) => new Map(prev.set(activeTab.fileId, editorFile.content)),
      )
    }
  }, [activeTab, openFiles, originalContent])

  // Keyboard shortcut for save (Cmd+S / Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (activeTab) {
          saveFile(activeTab.fileId)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, saveFile])

  // Listen for create new file event from sidebar
  useEffect(() => {
    const handleCreateNewFile = (event: Event) => {
      const customEvent = event as CustomEvent<{ directory?: string }>
      const directory = customEvent.detail?.directory || '/'
      setTargetDirectory(directory)
      setNewFileDialogOpen(true)
    }

    window.addEventListener('createNewFile', handleCreateNewFile)
    return () =>
      window.removeEventListener('createNewFile', handleCreateNewFile)
  }, [])

  // Listen for file renamed event to transfer content between old and new fileId keys
  useEffect(() => {
    const handleFileRenamed = (event: Event) => {
      const customEvent = event as CustomEvent<{
        oldFileId: string
        newFileId: string
      }>
      const { oldFileId, newFileId } = customEvent.detail

      // Transfer content from old key to new key in openFiles
      setOpenFiles((prev) => {
        const oldContent = prev.get(oldFileId)
        if (!oldContent) return prev

        const updated = new Map(prev)
        updated.delete(oldFileId)
        updated.set(newFileId, oldContent)
        return updated
      })

      // Transfer original content tracking
      setOriginalContent((prev) => {
        const oldOriginal = prev.get(oldFileId)
        if (!oldOriginal) return prev

        const updated = new Map(prev)
        updated.delete(oldFileId)
        updated.set(newFileId, oldOriginal)
        return updated
      })
    }

    window.addEventListener('fileRenamed', handleFileRenamed)
    return () => window.removeEventListener('fileRenamed', handleFileRenamed)
  }, [])

  // Get active editor file (moved here to use in useEffect below)
  const activeEditorFile = activeTab ? openFiles.get(activeTab.fileId) : null

  // Auto-save after 3 seconds of inactivity
  useEffect(() => {
    if (!activeTab || !activeEditorFile?.isDirty || activeEditorFile.isSaving) {
      return
    }

    const timer = setTimeout(() => {
      saveFile(activeTab.fileId)
    }, 3000)

    return () => clearTimeout(timer)
  }, [
    activeTab,
    activeEditorFile?.content,
    activeEditorFile?.isDirty,
    activeEditorFile?.isSaving,
    saveFile,
  ])

  // Handle tab close
  const handleCloseTab = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId)
      if (!tab) return

      // Remove from editor files
      setOpenFiles((prev) => {
        const updated = new Map(prev)
        updated.delete(tab.fileId)
        return updated
      })

      // Remove from original content
      setOriginalContent((prev) => {
        const updated = new Map(prev)
        updated.delete(tab.fileId)
        return updated
      })

      // Close tab
      closeTab(tabId)
    },
    [tabs, closeTab],
  )

  // Clean up editor files when tabs are closed externally
  useEffect(() => {
    const openTabPaths = new Set(tabs.map((tab) => tab.fileId))
    setOpenFiles((prev) => {
      const updated = new Map()
      Array.from(prev.entries()).forEach(([path, file]) => {
        if (openTabPaths.has(path)) {
          updated.set(path, file)
        }
      })
      return updated
    })
  }, [tabs])

  // Convert tabs to draggable tabs format - memoized to prevent unnecessary re-renders
  const draggableTabs: DraggableTab[] = useMemo(() => {
    return tabs.map((tab) => {
      const editorFile = openFiles.get(tab.fileId)
      // Handle icon - if it's a function, call it to get the ReactElement
      const icon = tab.fileInfo?.icon
      const resolvedIcon = typeof icon === 'function' ? icon() : icon
      return {
        id: tab.id,
        title: tab.fileInfo?.name || 'Untitled',
        icon: resolvedIcon,
        isDirty: editorFile?.isDirty || false,
        closable: true,
        metadata: { tab, editorFile },
      }
    })
  }, [tabs, openFiles])

  // Handle tab reorder
  const handleTabsReorder = useCallback(
    (newTabs: DraggableTab[]) => {
      const orderedTabIds = newTabs.map((tab) => tab.id)
      reorderTabsFromArray(orderedTabIds)
    },
    [reorderTabsFromArray],
  )

  // Render tab bar
  const renderTabBar = () => {
    if (tabs.length === 0) return null

    return (
      <DraggableTabs
        tabs={draggableTabs}
        activeTabId={activeTabId || undefined}
        onTabChange={switchToTab}
        onTabClose={handleCloseTab}
        onTabsReorder={handleTabsReorder}
        fontSize={13}
        isDark={isDark}
      />
    )
  }

  // Create memoized onChange handlers for each tab to prevent unnecessary re-renders
  const handleTabContentChange = useCallback(
    (tabFileId: string) => (content: string) => {
      const original = originalContent.get(tabFileId) || ''

      setOpenFiles((prev) => {
        const updated = new Map(prev)
        const existing = updated.get(tabFileId)
        if (existing) {
          updated.set(tabFileId, {
            ...existing,
            content,
            isDirty: content !== original,
            saveStatus: content !== original ? 'dirty' : 'saved',
          })
        }
        return updated
      })
    },
    [originalContent],
  )

  // Memoize the tab close handler factory
  const handleTabClose = useCallback(
    (tabId: string) => () => {
      closeTab(tabId)
    },
    [closeTab],
  )

  // Handle copying file path to clipboard
  const handleCopyPath = useCallback(async (tab: Tab) => {
    try {
      // Get file path relative to workspace (remove workspace ID prefix)
      const pathParts = tab.fileId.split('/')
      const relativePath = pathParts.slice(1).join('/')
      await navigator.clipboard.writeText(relativePath)
      setCopiedPath(tab.fileId)
      setTimeout(() => setCopiedPath(null), 2000)
    } catch (error) {
      console.error('Failed to copy path:', error)
    }
  }, [])

  // Handle copying file content to clipboard
  const handleCopyContent = useCallback(
    async (tab: Tab) => {
      const editorFile = openFiles.get(tab.fileId)
      if (!editorFile) return

      try {
        await navigator.clipboard.writeText(editorFile.content)
        setCopiedContent(tab.fileId)
        setTimeout(() => setCopiedContent(null), 2000)
      } catch (error) {
        console.error('Failed to copy content:', error)
      }
    },
    [openFiles],
  )

  // Handle tagging/untagging a file
  const handleTagFile = useCallback(
    (tab: Tab) => {
      const fileId = tab.fileId
      const workspaceId = tab.fileId.split('/')[0]
      const alreadyTagged = isItemTagged('current', fileId)

      if (alreadyTagged) {
        untagItem('current', fileId)
      } else {
        // Create an Item object for this file
        const pathParts = tab.fileId.split('/')
        const relativePath = pathParts.slice(1).join('/')
        const fileName = tab.fileInfo?.name || 'Untitled'

        const fileItem: Item = {
          id: fileId,
          type: 'file',
          name: fileName,
          serverId: workspaceId,
          metadata: {
            path: relativePath,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        // Store the item in the global store
        setItems((prev) => ({
          ...prev,
          [fileId]: fileItem,
        }))

        // Tag with 'current' as source (current message being composed)
        tagItem('current', fileId, `@${fileName}`)
      }
    },
    [tagItem, untagItem, isItemTagged, setItems],
  )

  // Check if file is tagged
  const isFileTagged = useCallback(
    (fileId: string) => {
      return isItemTagged('current', fileId)
    },
    [isItemTagged],
  )

  // Render ALL editors but only show the active one - this preserves state across tab switches
  const renderAllEditors = () => {
    if (tabs.length === 0) {
      return (
        <div className='flex h-full items-center justify-center'>
          <div className='flex flex-col items-center text-center'>
            <div
              className='mb-3 font-medium text-[hsl(var(--text-primary))]'
              style={{
                fontSize: 'var(--font-size-15)',
                letterSpacing: 'var(--letter-spacing-h4)',
              }}>
              No file selected
            </div>
            <div
              className='text-[hsl(var(--text-secondary))]'
              style={{
                fontSize: 'var(--font-size-caption)',
                lineHeight: 'var(--line-height-caption)',
              }}>
              Choose a file from the sidebar to view or edit
            </div>
          </div>
        </div>
      )
    }

    return (
      <>
        {tabs.map((tab) => {
          const editorFile = openFiles.get(tab.fileId)
          const isActive = tab.id === activeTabId

          // Don't render anything if file hasn't been loaded yet
          if (!editorFile) {
            return isActive ? (
              <div
                key={tab.id}
                className='flex h-full items-center justify-center'>
                <Spinner size='lg' />
              </div>
            ) : null
          }

          // Show loading spinner only for active tab
          if (editorFile.isLoading && isActive) {
            return (
              <div
                key={tab.id}
                className='flex h-full items-center justify-center'>
                <Spinner size='lg' />
              </div>
            )
          }

          // Skip rendering loading tabs that aren't active
          if (editorFile.isLoading && !isActive) {
            return null
          }

          if (editorFile.tooLarge) {
            if (!isActive) return null
            const { size, limit } = editorFile.tooLarge
            return (
              <div
                key={tab.id}
                className='flex h-full flex-col items-center justify-center gap-2 p-8 text-center'>
                <RiFileTextLine className='h-10 w-10 opacity-50' />
                <div className='text-base font-medium'>
                  File too large to preview
                </div>
                <div className='text-sm opacity-70'>
                  {size != null
                    ? `${fileService.formatFileSize(size)} exceeds the ${fileService.formatFileSize(limit)} preview limit.`
                    : `This file exceeds the ${fileService.formatFileSize(limit)} preview limit.`}
                </div>
              </div>
            )
          }

          return (
            <div
              key={tab.id}
              className='relative h-full'
              style={{
                display: isActive ? 'block' : 'none',
              }}>
              {/* Editor - full height */}
              <div
                ref={isActive ? editorContainerRef : undefined}
                className='h-full overflow-auto'
                style={{
                  opacity: editorFile.isSaving ? 0.6 : 1,
                  pointerEvents: editorFile.isSaving ? 'none' : 'auto',
                  transition: 'opacity 0.2s',
                }}>
                <FileSystemEditor
                  fileName={tab.fileInfo?.name || 'Untitled'}
                  filePath={tab.fileId}
                  workspaceId={tab.fileId.split('/')[0] || editorFile.scopeId}
                  userId={userId}
                  content={editorFile.content}
                  onChange={handleTabContentChange(tab.fileId)}
                  isLocked={tab.fileInfo?.name?.startsWith('+') || false}
                  className='h-full'
                  onCloseTab={handleTabClose(tab.id)}
                />
              </div>

              {/* Top-right pill toolbar - Copy Path, Copy Content, Tag */}
              {/* Hide for virtual viewers (Agents, Sources, Activity, Workspace) and sqlite databases */}
              {!(
                [
                  ...VIRTUAL_FILE_TYPES,
                  'knowledge_graph',
                  'v0_project',
                  'sqlite_database',
                  'workspace_config',
                ].includes(tab.fileInfo?.fileType || '') ||
                tab.fileInfo?.name?.endsWith('.sqlite') ||
                tab.fileInfo?.name?.endsWith('.db')
              ) && (
                <div
                  className={cn(
                    'absolute right-0 top-0 z-20 flex h-8 items-center gap-0.5 rounded-bl-full px-1 pl-3',
                    isDark ? 'bg-white/[0.08]' : 'bg-black/[0.04]',
                  )}>
                  {/* Copy Path Button */}
                  <button
                    onClick={() => handleCopyPath(tab)}
                    title='Copy path'
                    className={cn(
                      'flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-semibold transition-all',
                      copiedPath === tab.fileId
                        ? 'text-[#0098FC]'
                        : isDark
                          ? 'text-white/70 hover:text-white'
                          : 'text-black/50 hover:text-black/80',
                    )}>
                    {copiedPath === tab.fileId ? (
                      <>
                        <RiCheckLine className='h-3.5 w-3.5' />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <RiFileCopyLine className='h-3.5 w-3.5' />
                        <span>Path</span>
                      </>
                    )}
                  </button>

                  {/* Copy Content Button */}
                  <button
                    onClick={() => handleCopyContent(tab)}
                    title='Copy content'
                    className={cn(
                      'flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-semibold transition-all',
                      copiedContent === tab.fileId
                        ? 'text-[#0098FC]'
                        : isDark
                          ? 'text-white/70 hover:text-white'
                          : 'text-black/50 hover:text-black/80',
                    )}>
                    {copiedContent === tab.fileId ? (
                      <>
                        <RiCheckLine className='h-3.5 w-3.5' />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <RiFileTextLine className='h-3.5 w-3.5' />
                        <span>Content</span>
                      </>
                    )}
                  </button>

                  {/* Tag Button */}
                  <TagButton
                    itemId={tab.fileId}
                    isTagged={isFileTagged(tab.fileId)}
                    size='small'
                    onClick={() => handleTagFile(tab)}
                  />
                </div>
              )}

              {/* Bottom status bar */}
              <div className='absolute bottom-4 left-4 right-4 flex items-center justify-between'>
                {/* Last saved indicator - bottom left */}
                {editorFile.lastSaved && (
                  <div className='rounded-md bg-black/5 px-2 py-1 text-xs text-gray-600 backdrop-blur-sm dark:bg-white/5 dark:text-gray-400'>
                    Last saved:{' '}
                    {new Date(editorFile.lastSaved).toLocaleTimeString()}
                  </div>
                )}

                {/* Keyboard shortcut hint - bottom right */}
                {editorFile.isDirty && (
                  <div className='rounded-md bg-black/5 px-2 py-1 text-xs text-gray-600 backdrop-blur-sm dark:bg-white/5 dark:text-gray-400'>
                    Press {saveShortcut} to save
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </>
    )
  }

  // Handle creating a new file
  const handleCreateNewFile = useCallback(
    async (
      fileName: string,
      fileType:
        | 'document'
        | 'word_document'
        | 'presentation'
        | 'spreadsheet'
        | 'script'
        | 'folder'
        | 'database'
        | 'memory'
        | 'agent'
        | 'source',
    ) => {
      if (!workspaceId || !userId) return

      try {
        // For agents and sources, open the creation tab directly
        if (fileType === 'agent' || fileType === 'source') {
          const tabFileType =
            fileType === 'agent' ? 'agent_create' : 'source_create'
          const fileId = `${fileType}/new`

          // Open the creation tab
          window.dispatchEvent(
            new CustomEvent('openFile', {
              detail: {
                file: {
                  name: `New ${fileType === 'agent' ? 'Agent' : 'Tool'}`,
                  path: fileId,
                  displayName: `New ${fileType === 'agent' ? 'Agent' : 'Tool'}`,
                  fileType: tabFileType,
                },
                workspace: {
                  id: workspaceId,
                },
              },
            }),
          )

          setNewFileDialogOpen(false)
          setTargetDirectory('/')
          return
        }

        // Build path using target directory
        const basePath = targetDirectory === '/' ? '' : targetDirectory
        const filePath = `${basePath}/${fileName}`

        // For folders and memory packages, create directory
        if (fileType === 'folder' || fileType === 'memory') {
          await createDirectoryMutation({ path: filePath })
        } else {
          // For files, create with appropriate initial content
          let initialContent = ''
          if (fileType === 'spreadsheet') {
            initialContent = 'Column1,Column2,Column3\n'
          } else if (fileType === 'code') {
            initialContent = '// Start coding here\n'
          } else if (fileType === 'document') {
            initialContent = '# ' + fileName.replace(/\.[^.]*$/, '') + '\n\n'
          } else if (
            fileType === 'word_document' ||
            fileType === 'presentation'
          ) {
            initialContent = '' // Binary formats handled by their viewers
          } else if (fileType === 'database') {
            // Initialize with empty but valid database schema
            const dbName = fileName.replace(/\.[^.]*$/, '')
            initialContent = JSON.stringify(
              {
                $schema: 'lazarus-sqlite-v1',
                type: 'sqlite',
                version: '1.0',
                database: {
                  name: dbName,
                  description: '',
                },
                schema: {
                  tables: [],
                  totalRows: 0,
                },
                data: {},
                metadata: {
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              },
              null,
              2,
            )
          }

          await fileService.writeFile(
            'user',
            workspaceId,
            filePath,
            initialContent,
            userId,
          )
        }

        // Clear the file explorer cache to trigger a refresh
        clearFiles(workspaceId)

        // The file watcher will auto-open the newly created file
        setNewFileDialogOpen(false)
        setTargetDirectory('/')
      } catch (error) {
        console.error('Failed to create file:', error)
      }
    },
    [workspaceId, userId, clearFiles, targetDirectory],
  )

  if (tabs.length === 0) {
    return (
      <>
        <div className='flex h-full items-center justify-center'>
          <div className='text-center'>
            <p className='text-sm text-muted-foreground'>
              Select a file from the sidebar to view its contents
            </p>
          </div>
        </div>

        {/* New File Dialog - must be rendered even when no tabs */}
        <CreateFileDialog
          isOpen={newFileDialogOpen}
          isDark={isDark}
          onConfirm={handleCreateNewFile}
          onClose={() => setNewFileDialogOpen(false)}
        />
      </>
    )
  }

  const handleReloadFile = async () => {
    if (!activeTab || !fileChangeNotification) return

    const editorFile = openFiles.get(activeTab.fileId)
    if (!editorFile) return

    try {
      // Extract workspace ID from file path (first segment)
      const pathParts = activeTab.fileId.split('/')
      const workspaceIdFromPath = pathParts[0] || editorFile.scopeId
      // Remove workspace ID prefix from file path
      const filePathWithoutWorkspace = pathParts.slice(1).join('/')

      const fileContent = await fileService.readFile(
        editorFile.scope,
        workspaceIdFromPath, // Use workspace ID from path, not scopeId
        filePathWithoutWorkspace, // Remove workspace ID prefix
        userId,
        teamId,
      )

      setOpenFiles((prev) => {
        const updated = new Map(prev)
        const existing = updated.get(activeTab.fileId)
        if (existing) {
          updated.set(activeTab.fileId, {
            ...existing,
            content: fileContent.content,
            isDirty: false,
            saveStatus: 'saved',
          })
        }
        return updated
      })

      setOriginalContent(
        (prev) => new Map(prev.set(activeTab.fileId, fileContent.content)),
      )
      setFileChangeNotification(null)
    } catch (error) {
      console.error('Failed to reload file:', error)
    }
  }

  const handleVersionRestore = async () => {
    // Reload the file content after restore
    if (!activeTab) return

    const editorFile = openFiles.get(activeTab.fileId)
    if (!editorFile) return

    try {
      // Extract workspace ID from file path (first segment)
      const pathParts = activeTab.fileId.split('/')
      const workspaceIdFromPath = pathParts[0] || editorFile.scopeId
      // Remove workspace ID prefix from file path
      const filePathWithoutWorkspace = pathParts.slice(1).join('/')

      const fileContent = await fileService.readFile(
        editorFile.scope,
        workspaceIdFromPath, // Use workspace ID from path, not scopeId
        filePathWithoutWorkspace, // Remove workspace ID prefix
        userId,
        teamId,
      )

      setOpenFiles((prev) => {
        const updated = new Map(prev)
        const existing = updated.get(activeTab.fileId)
        if (existing) {
          updated.set(activeTab.fileId, {
            ...existing,
            content: fileContent.content,
            isDirty: false,
            saveStatus: 'saved',
          })
        }
        return updated
      })

      setOriginalContent(
        (prev) => new Map(prev.set(activeTab.fileId, fileContent.content)),
      )
      // History feature disabled
      // setShowHistory(false)
    } catch (error) {
      console.error('Failed to reload file after restore:', error)
    }
  }

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col bg-white dark:bg-[#111112]',
        className,
      )}>
      {/* File change notification */}
      {fileChangeNotification && (
        <div className='flex items-center justify-between border-b bg-yellow-50 px-4 py-2 text-sm dark:border-yellow-800 dark:bg-yellow-900/20'>
          <div className='flex items-center gap-2'>
            <span className='text-yellow-800 dark:text-yellow-200'>
              WARNING: This file was modified externally (by Bot or another
              user)
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={handleReloadFile}
              className='rounded bg-yellow-600 px-3 py-1 text-xs text-white hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-600'>
              Reload File
            </button>
            <button
              onClick={() => setFileChangeNotification(null)}
              className='rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Fixed Header with Tabs */}
      <div
        className={cn(
          'flex h-8 flex-shrink-0 items-center border-b border-[hsl(var(--border))]',
          isDark ? 'bg-[#111112]' : 'bg-[#f5f5f5]',
        )}>
        {/* Tabs */}
        <div className='flex-1 overflow-hidden'>{renderTabBar()}</div>
      </div>

      {/* Scrollable Editor Content - renders all editors, shows only active */}
      <div className='flex-1 overflow-hidden'>{renderAllEditors()}</div>

      {/* New File Dialog */}
      <CreateFileDialog
        isOpen={newFileDialogOpen}
        isDark={isDark}
        onConfirm={handleCreateNewFile}
        onClose={() => setNewFileDialogOpen(false)}
      />
    </div>
  )
}
