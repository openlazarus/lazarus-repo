'use client'

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  RiAddCircleLine,
  RiArrowRightSLine,
  RiArrowUpDownLine,
  RiBox3Line,
  RiCheckLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiEyeLine,
  RiEyeOffLine,
  RiFileCopyLine,
  RiLockLine,
  RiLockUnlockLine,
  RiRefreshLine,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { TagButton } from '@/components/ui/button/tag-button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DropOverlay } from '@/components/ui/drop-overlay'
import { ExpandableSearchInput } from '@/components/ui/input'
import Spinner from '@/components/ui/spinner'
import { Tooltip } from '@/components/ui/tooltip'
import { UploadProgressOverlay } from '@/components/ui/upload-progress-overlay'
import { useApprovals } from '@/hooks/core/use-approvals'
import {
  useFileExplorerPreferenceActions,
  useFileExplorerPreferences,
  useFileTreeItemState,
  useLoadWorkspaceFiles,
} from '@/hooks/core/use-file-explorer'
import { useWorkspace } from '@/hooks/core/use-workspace'
import { useDeleteWorkspaceFile } from '@/hooks/features/file/use-delete-workspace-file'
import { useDownloadFile } from '@/hooks/features/file/use-download-file'
import { useLockFile } from '@/hooks/features/file/use-lock-file'
import { useMoveFile } from '@/hooks/features/file/use-move-file'
import { useUnlockFile } from '@/hooks/features/file/use-unlock-file'
import { useUploadWorkspaceFile } from '@/hooks/features/file/use-upload-workspace-file'
import type { Workspace, WorkspaceFile } from '@/hooks/features/workspace/types'
import { useDropZone } from '@/hooks/ui/use-drop-zone'
import { useFileDragging } from '@/hooks/ui/use-file-dragging'
import { useTheme } from '@/hooks/ui/use-theme'
import { useWorkspaceFileSearch } from '@/hooks/workspace/use-workspace-file-search'
import { getFileTypeIconComponent } from '@/lib/file-icons'
import { cn } from '@/lib/utils'
import { VIRTUAL_FOLDER_PATHS } from '@/lib/virtual-folders'
import { useIdentity } from '@/state/identity'
import { SortOption, useFileExplorerStore } from '@/store/file-explorer-store'
import { useFileTabStore } from '@/store/file-tab-store'
import { fileToTaggedItem, useTagStore } from '@/store/tag-store'
import { useUploadProgressStore } from '@/store/upload-progress-store'

import { getFileTypeFromName } from './file-type-detector'

interface UnifiedFileExplorerProps {
  onFileOpen?: (file: WorkspaceFile, workspace: Workspace) => void
  onCreateFile?: () => void
  className?: string
}

const sortOptions = [
  { value: 'name-folders-first' as SortOption, label: 'Name (folders first)' },
  { value: 'name-asc' as SortOption, label: 'Name (A → Z)' },
  { value: 'name-desc' as SortOption, label: 'Name (Z → A)' },
  { value: 'date-desc' as SortOption, label: 'Modified (newest)' },
  { value: 'date-asc' as SortOption, label: 'Modified (oldest)' },
  { value: 'size-desc' as SortOption, label: 'Size (largest)' },
  { value: 'size-asc' as SortOption, label: 'Size (smallest)' },
  { value: 'type' as SortOption, label: 'Type' },
]

// Actions context for callbacks that need to be passed down (delete, lock, download, tag, copy, rename)
// These are component-specific and don't belong in the global store
interface FileExplorerActionsContextType {
  handleDelete: (file: WorkspaceFile, workspace: Workspace) => void
  handleLock: (file: WorkspaceFile, workspace: Workspace) => void
  handleCopyPath: (file: WorkspaceFile) => void
  handleCreateInFolder: (folderPath: string) => void
  handleRename: (
    file: WorkspaceFile,
    workspace: Workspace,
    newName: string,
  ) => Promise<void>
  tagFile: (file: WorkspaceFile) => void
  isFileTagged: (fileId: string) => boolean
  toggleFolderWithLoad: (workspace: Workspace, folderPath: string) => void
  onExternalFileDrop: (files: File[], folderPath: string) => void
  externalDropHandledRef: React.MutableRefObject<boolean>
}

const FileExplorerActionsContext =
  createContext<FileExplorerActionsContextType | null>(null)

const useFileExplorerActions = () => {
  const context = useContext(FileExplorerActionsContext)
  if (!context) {
    throw new Error(
      'useFileExplorerActions must be used within FileExplorerProvider',
    )
  }
  return context
}

// Small badge component for the Approvals count — only mounts for the approvals item
function ApprovalCountBadge() {
  const { pendingCount } = useApprovals()
  if (pendingCount <= 0) return null
  return (
    <span className='ml-1 text-[10px] font-medium text-[hsl(var(--text-secondary))]'>
      ({pendingCount})
    </span>
  )
}

// Check if file is a special view (not a folder)
const virtualFolderSet = new Set<string>(VIRTUAL_FOLDER_PATHS)

const isSpecialView = (file: WorkspaceFile): boolean => {
  return (
    virtualFolderSet.has(file.path) ||
    file.path === '.workspace.json' ||
    file.name === '.workspace.json'
  )
}

// Get display name for a file
const getDisplayName = (file: WorkspaceFile): string => {
  // Special case for workspace config file
  if (file.path === '.workspace.json' || file.name === '.workspace.json') {
    return 'Workspace'
  }
  // Rename "sources" virtual view to "Tools"
  if (file.path === 'sources' || file.name === 'sources') {
    return 'Tools'
  }
  const displayName = (file as any).displayName || file.name
  return displayName.startsWith('+') ? displayName.slice(1) : displayName
}

// Get file icon based on extension
const getFileIcon = (file: WorkspaceFile) => {
  // Check if it's a special view first and map to the correct FileType
  if (isSpecialView(file)) {
    let viewType: any
    switch (file.path) {
      case 'agents':
        viewType = 'agents_collection'
        break
      case 'sources':
        viewType = 'sources_collection'
        break
      case 'activity':
        viewType = 'activity_collection'
        break
      case 'approvals':
        viewType = 'approvals_collection'
        break
      case 'workspace':
      case '.workspace.json':
        viewType = 'workspace_config'
        break
      default:
        viewType = 'other'
    }
    return getFileTypeIconComponent(viewType, 'h-4 w-4')
  }

  // Regular directories don't have icons (they use chevrons)
  if (file.type === 'directory') return null

  const fileType = getFileTypeFromName(file.name)
  // Map file-type-detector FileType to model/file FileType
  let mappedFileType: any = fileType
  if (fileType === 'text' || fileType === 'markdown' || fileType === 'json') {
    mappedFileType = 'document' // Map text types to document
  } else if (fileType === 'word_document') {
    mappedFileType = 'word_document' // Word docs get their own icon
  } else if (fileType === 'presentation') {
    mappedFileType = 'slides' // PowerPoint presentations use slides icon
  } else if (fileType === 'binary' || fileType === 'unsupported') {
    mappedFileType = 'other' // Map binary/unsupported to other
  }
  return getFileTypeIconComponent(mappedFileType, 'h-4 w-4')
}

// Animation configs for smooth Apple-like animations
const springConfig = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8,
}

const smoothEase = [0.32, 0.72, 0, 1] as const // Apple's easing

// Interactive hover/tap wrapper component
const InteractiveLayer = React.memo<{
  children: React.ReactNode
  isSelected: boolean
  isDark: boolean
  className?: string
  onClick?: (e: React.MouseEvent) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}>(
  ({
    children,
    isSelected,
    isDark,
    className,
    onClick,
    onMouseEnter,
    onMouseLeave,
  }) => {
    return (
      <m.div
        className={className}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        whileHover={{
          backgroundColor: isSelected
            ? undefined
            : isDark
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(0, 0, 0, 0.03)',
        }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15 }}>
        {children}
      </m.div>
    )
  },
)
InteractiveLayer.displayName = 'InteractiveLayer'

// Optimized file tree item component - uses Zustand for state management
const FileTreeItem = React.memo<{
  file: WorkspaceFile
  workspace: Workspace
  level: number
  index: number
  onFileOpen?: (file: WorkspaceFile, workspace: Workspace) => void
}>(function FileTreeItem({ file, workspace, level, index, onFileOpen }) {
  const { isDark } = useTheme()
  const {
    handleDelete,
    handleLock,
    handleCopyPath,
    handleCreateInFolder,
    handleRename,
    tagFile,
    isFileTagged,
    toggleFolderWithLoad,
    onExternalFileDrop,
    externalDropHandledRef,
  } = useFileExplorerActions()

  const [moveFile] = useMoveFile(workspace.id)
  const triggerDownload = useDownloadFile(workspace.id, file.path, file.name)

  const [isHovered, setIsHovered] = useState(false)
  const [wasDragging, setWasDragging] = useState(false)
  const [pathCopied, setPathCopied] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [isSubmittingRename, setIsSubmittingRename] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const clickCountRef = useRef(0)

  // Native HTML5 drag-and-drop state for external file drops onto folders
  const [isExternalDragOver, setIsExternalDragOver] = useState(false)
  const externalDragCounter = useRef(0)
  const autoExpandTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const isView = isSpecialView(file)
  const isFolder = file.type === 'directory' && !isView
  const fileId = `${workspace.id}:${file.path}`

  // Use Zustand hooks for granular subscriptions - only re-renders when this item's state changes
  const { isExpanded, isLoading, children } = useFileTreeItemState(fileId)

  // Drag and drop setup
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: fileId,
    disabled: file.isLocked,
    data: { file, workspace },
  })

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: fileId,
    disabled: !isFolder,
    data: { file, workspace },
  })

  // Track drag state to prevent click after drag
  useEffect(() => {
    if (isDragging) {
      setWasDragging(true)
    } else if (wasDragging) {
      const timer = setTimeout(() => setWasDragging(false), 100)
      return () => clearTimeout(timer)
    }
  }, [isDragging, wasDragging])

  // Focus input when entering rename mode
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus()
      // Select filename without extension for files, full name for folders
      const name = getDisplayName(file)
      const dotIndex = name.lastIndexOf('.')
      if (file.type !== 'directory' && dotIndex > 0) {
        renameInputRef.current.setSelectionRange(0, dotIndex)
      } else {
        renameInputRef.current.select()
      }
    }
  }, [isRenaming, file])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
      }
      if (autoExpandTimeoutRef.current) {
        clearTimeout(autoExpandTimeoutRef.current)
      }
    }
  }, [])

  const startRenaming = useCallback(() => {
    if (
      isView ||
      file.isLocked ||
      (file as any).path?.startsWith('/__virtual__/')
    )
      return
    setRenameValue(getDisplayName(file))
    setIsRenaming(true)
  }, [isView, file])

  const cancelRenaming = useCallback(() => {
    setIsRenaming(false)
    setRenameValue('')
  }, [])

  const submitRename = useCallback(async () => {
    const trimmedValue = renameValue.trim()
    const currentName = getDisplayName(file)

    if (!trimmedValue || trimmedValue === currentName) {
      cancelRenaming()
      return
    }

    const parentPath = file.path.substring(0, file.path.lastIndexOf('/')) || ''
    const newPath = parentPath
      ? `${parentPath}/${trimmedValue}`
      : `/${trimmedValue}`

    setIsSubmittingRename(true)
    try {
      await moveFile({ source_path: file.path, destination_path: newPath })
      await handleRename(file, workspace, trimmedValue)
      setIsRenaming(false)
      setRenameValue('')
    } catch (error) {
      console.error('Failed to rename:', error)
    } finally {
      setIsSubmittingRename(false)
    }
  }, [renameValue, file, workspace, moveFile, handleRename, cancelRenaming])

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        submitRename()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        cancelRenaming()
      }
    },
    [submitRename, cancelRenaming],
  )

  // Native HTML5 drag handlers for external file drops onto folders
  const handleNativeDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (!isFolder || !e.dataTransfer?.types?.includes('Files')) return
      externalDragCounter.current += 1
      setIsExternalDragOver(true)

      // Auto-expand folder after 700ms hover
      if (autoExpandTimeoutRef.current) {
        clearTimeout(autoExpandTimeoutRef.current)
      }
      autoExpandTimeoutRef.current = setTimeout(() => {
        if (!isExpanded) {
          toggleFolderWithLoad(workspace, file.path)
        }
      }, 700)
    },
    [isFolder, isExpanded, toggleFolderWithLoad, workspace, file.path],
  )

  const handleNativeDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!isFolder || !e.dataTransfer?.types?.includes('Files')) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    },
    [isFolder],
  )

  const handleNativeDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (!isFolder || !e.dataTransfer?.types?.includes('Files')) return
      externalDragCounter.current -= 1
      if (externalDragCounter.current <= 0) {
        externalDragCounter.current = 0
        setIsExternalDragOver(false)
        if (autoExpandTimeoutRef.current) {
          clearTimeout(autoExpandTimeoutRef.current)
          autoExpandTimeoutRef.current = null
        }
      }
    },
    [isFolder],
  )

  const handleNativeDrop = useCallback(
    (e: React.DragEvent) => {
      if (!isFolder || !e.dataTransfer?.types?.includes('Files')) return
      e.preventDefault()

      // Signal to container that a folder handled this drop
      externalDropHandledRef.current = true

      // Reset local state
      externalDragCounter.current = 0
      setIsExternalDragOver(false)
      if (autoExpandTimeoutRef.current) {
        clearTimeout(autoExpandTimeoutRef.current)
        autoExpandTimeoutRef.current = null
      }

      // Extract files and upload to this folder
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        onExternalFileDrop(files, file.path)
      }
    },
    [isFolder, externalDropHandledRef, onExternalFileDrop, file.path],
  )

  const setNodeRef = useCallback(
    (node: HTMLElement | null) => {
      setDragRef(node)
      if (isFolder) setDropRef(node)
    },
    [setDragRef, setDropRef, isFolder],
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (wasDragging || isDragging || isRenaming) {
        e.preventDefault()
        e.stopPropagation()
        return
      }

      // Track clicks for double-click detection
      clickCountRef.current += 1

      if (clickCountRef.current === 1) {
        // First click - wait to see if it's a double click
        clickTimeoutRef.current = setTimeout(() => {
          clickCountRef.current = 0
          // Single click action
          if (isView || (!isFolder && file.type !== 'directory')) {
            if (onFileOpen) {
              onFileOpen(file, workspace)
            }
          } else if (isFolder) {
            // Only folders expand/collapse - also loads files if needed
            toggleFolderWithLoad(workspace, file.path)
          }
        }, 250) // 250ms is standard double-click threshold
      } else if (clickCountRef.current === 2) {
        // Double click - cancel single click action and start renaming
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current)
          clickTimeoutRef.current = null
        }
        clickCountRef.current = 0

        // Only allow renaming for non-special items
        if (
          !isView &&
          !file.isLocked &&
          !(file as any).path?.startsWith('/__virtual__/')
        ) {
          startRenaming()
        }
      }
    },
    [
      wasDragging,
      isDragging,
      isRenaming,
      isView,
      isFolder,
      toggleFolderWithLoad,
      workspace,
      file,
      onFileOpen,
      startRenaming,
    ],
  )

  return (
    <>
      {/* File/folder item with entrance animation */}
      <m.div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        {...(isFolder
          ? {
              onDragEnter: handleNativeDragEnter,
              onDragOver: handleNativeDragOver,
              onDragLeave: handleNativeDragLeave,
              onDrop: handleNativeDrop,
            }
          : {})}
        initial={{ opacity: 0, x: -20 }}
        animate={{
          opacity: 1,
          x: 0,
          transition: {
            duration: 0.3,
            delay: index * 0.02,
            ease: smoothEase,
          },
        }}
        style={{
          paddingLeft: `${level * 16}px`,
          touchAction: 'none',
        }}>
        {/* Interactive layer for hover/tap */}
        <InteractiveLayer
          isSelected={false}
          isDark={isDark}
          onClick={handleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            'group relative flex items-center gap-2 rounded-md px-2 text-sm transition-all duration-150',
            'h-7 min-h-7 cursor-pointer select-none',
            isDark ? 'text-white/80' : 'text-black/90',
            isDragging && 'opacity-50',
            (isOver || isExternalDragOver) &&
              isFolder &&
              (isDark ? 'bg-white/[0.12]' : 'bg-[#0098FC]/[0.16]'),
          )}>
          {/* Icon - chevron for folders, special icons for views and files */}
          {isFolder ? (
            // Chevron for folders with rotation animation
            <m.div
              className='pointer-events-none flex-shrink-0'
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={springConfig}>
              {getDisplayName(file) === 'Memory package' ? (
                <RiBox3Line className='h-3.5 w-3.5 text-[#0098FC]' />
              ) : (
                <RiArrowRightSLine
                  className={cn(
                    'h-4 w-4',
                    isDark ? 'text-white/60' : 'text-black/60',
                  )}
                />
              )}
            </m.div>
          ) : (
            // Icons for files and special views (no rotation)
            <div className='pointer-events-none flex-shrink-0'>
              {getFileIcon(file)}
            </div>
          )}

          {/* File name or rename input */}
          {isRenaming ? (
            <input
              ref={renameInputRef}
              type='text'
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={submitRename}
              disabled={isSubmittingRename}
              className={cn(
                'flex-1 rounded border bg-transparent px-1 text-sm outline-none',
                isDark
                  ? 'border-white/20 text-white focus:border-[#0098FC]'
                  : 'border-black/20 text-black focus:border-[#0098FC]',
                isSubmittingRename && 'opacity-50',
              )}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className={cn(
                'pointer-events-none flex-1 truncate',
                isDark ? 'text-white' : 'text-black',
              )}>
              {getDisplayName(file)}
              {file.path === 'approvals' && <ApprovalCountBadge />}
            </span>
          )}

          {/* Action buttons on hover */}
          {(file.isLocked ||
            isFileTagged(fileId) ||
            (isHovered && !isDragging)) &&
            !(file as any).path?.startsWith('/__virtual__/') && (
              <m.div
                className='flex items-center gap-1'
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.1 }}>
                {/* Add file button - only show for folders when hovered */}
                {isHovered && isFolder && (
                  <Tooltip content='Create file here'>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCreateInFolder(file.path)
                      }}
                      className='pointer-events-auto flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-400/10'>
                      <RiAddCircleLine className='h-3.5 w-3.5' />
                    </button>
                  </Tooltip>
                )}

                {/* Copy path button - show for all files and folders when hovered */}
                {isHovered && !isView && (
                  <Tooltip content={pathCopied ? 'Copied!' : 'Copy path'}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopyPath(file)
                        setPathCopied(true)
                        setTimeout(() => setPathCopied(false), 2000)
                      }}
                      className='pointer-events-auto flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-400/10'>
                      {pathCopied ? (
                        <RiCheckLine className='h-3.5 w-3.5 text-[#0098FC]' />
                      ) : (
                        <RiFileCopyLine className='h-3.5 w-3.5' />
                      )}
                    </button>
                  </Tooltip>
                )}

                {/* Download button - only show for files (not folders) when hovered */}
                {isHovered && !isView && file.type !== 'directory' && (
                  <Tooltip content='Download'>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        triggerDownload()
                      }}
                      className='pointer-events-auto flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-400/10'>
                      <RiDownloadLine className='h-3.5 w-3.5' />
                    </button>
                  </Tooltip>
                )}

                {/* Delete button - only show when hovered, not locked, and not a virtual folder */}
                {!file.isLocked && isHovered && !isView && (
                  <Tooltip content='Delete'>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(file, workspace)
                      }}
                      className='pointer-events-auto flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-400/10'>
                      <RiDeleteBinLine className='h-3.5 w-3.5' />
                    </button>
                  </Tooltip>
                )}

                {/* Lock button - don't show for virtual folders */}
                {!isView && (
                  <Tooltip content={file.isLocked ? 'Unlock' : 'Lock'}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLock(file, workspace)
                      }}
                      className={cn(
                        'pointer-events-auto flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-colors',
                        file.isLocked
                          ? 'text-amber-500 hover:bg-amber-500/10'
                          : 'text-gray-400 hover:bg-gray-400/10',
                      )}>
                      {file.isLocked ? (
                        <RiLockLine className='h-3.5 w-3.5' />
                      ) : (
                        <RiLockUnlockLine className='h-3.5 w-3.5' />
                      )}
                    </button>
                  </Tooltip>
                )}

                {/* Tag button - always show when hovered or tagged (first on the right) */}
                {/* Show for files and normal folders, but not virtual folders (special views) */}
                {(isHovered || isFileTagged(fileId)) && !isView && (
                  <Tooltip
                    content={isFileTagged(fileId) ? 'Untag' : 'Tag in chat'}>
                    <div className='pointer-events-auto'>
                      <TagButton
                        itemId={fileId}
                        isTagged={isFileTagged(fileId)}
                        size='small'
                        onClick={(e) => {
                          e.stopPropagation()
                          tagFile(file)
                        }}
                      />
                    </div>
                  </Tooltip>
                )}
              </m.div>
            )}
        </InteractiveLayer>
      </m.div>

      {/* Children with smooth expand/collapse animation */}
      {isFolder && isExpanded && (
        <m.div
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: 'auto',
            opacity: 1,
            transition: {
              height: { duration: 0.25, ease: smoothEase },
              opacity: { duration: 0.2 },
            },
          }}
          style={{ overflow: 'hidden' }}>
          {isLoading ? (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='flex items-center justify-center py-2'>
              <Spinner size='sm' />
            </m.div>
          ) : (
            <FileTreeList
              workspace={workspace}
              files={children}
              level={level + 1}
              searchTerm=''
              onFileOpen={onFileOpen}
            />
          )}
        </m.div>
      )}
    </>
  )
})

// Optimized file tree list - only subscribes to config context
const FileTreeList = React.memo<{
  workspace: Workspace
  files: WorkspaceFile[]
  level: number
  searchTerm: string
  onFileOpen?: (file: WorkspaceFile, workspace: Workspace) => void
}>(function FileTreeList({ workspace, files, level, searchTerm, onFileOpen }) {
  // Use Zustand for preferences
  const { showHiddenFiles, sortBy } = useFileExplorerPreferences()

  const processedFiles = useMemo(() => {
    let filtered = files

    if (!showHiddenFiles) {
      filtered = filtered.filter((f) => !f.name.startsWith('.'))
    }

    if (searchTerm) {
      filtered = filtered.filter((f) =>
        getDisplayName(f).toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    return sortFiles(filtered, sortBy)
  }, [files, showHiddenFiles, searchTerm, sortBy])

  if (processedFiles.length === 0) return null

  return (
    <>
      {processedFiles.map((file, index) => (
        <FileTreeItem
          key={file.path}
          file={file}
          workspace={workspace}
          level={level}
          index={index}
          onFileOpen={onFileOpen}
        />
      ))}
    </>
  )
})

// Sort files helper - optimized with pre-computed values
function sortFiles(
  files: WorkspaceFile[],
  sortBy: SortOption,
): WorkspaceFile[] {
  // Pre-compute all values needed for sorting to avoid recalculating during comparisons
  const filesWithMeta = files.map((file) => {
    const isVirtual =
      virtualFolderSet.has(file.path) ||
      file.path === '.workspace.json' ||
      file.name === '.workspace.json'

    const displayName = getDisplayName(file)
    const isMemoryPkg = displayName === 'Memory package'

    // Priority: 0 = virtual, 1 = memory package, 2 = normal
    const priority = isVirtual ? 0 : isMemoryPkg ? 1 : 2

    return {
      file,
      priority,
      displayName,
      displayNameLower: displayName.toLowerCase(),
      isDirectory: file.type === 'directory',
      modifiedTime: file.modifiedAt ? new Date(file.modifiedAt).getTime() : 0,
      size: file.size || 0,
      extension: file.name.split('.').pop()?.toLowerCase() || '',
    }
  })

  // Sort using pre-computed values
  switch (sortBy) {
    case 'name-folders-first':
      filesWithMeta.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.displayName.localeCompare(b.displayName, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      })
      break

    case 'name-asc':
      filesWithMeta.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        return a.displayName.localeCompare(b.displayName, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      })
      break

    case 'name-desc':
      filesWithMeta.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        return b.displayName.localeCompare(a.displayName, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      })
      break

    case 'date-desc':
      filesWithMeta.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        return b.modifiedTime - a.modifiedTime
      })
      break

    case 'date-asc':
      filesWithMeta.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        return a.modifiedTime - b.modifiedTime
      })
      break

    case 'size-desc':
      filesWithMeta.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        return b.size - a.size
      })
      break

    case 'size-asc':
      filesWithMeta.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        return a.size - b.size
      })
      break

    case 'type':
      filesWithMeta.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.extension.localeCompare(b.extension)
      })
      break
  }

  // Extract sorted files
  return filesWithMeta.map((m) => m.file)
}

// Main component
export const UnifiedFileExplorer = React.memo(function UnifiedFileExplorer({
  onFileOpen,
  onCreateFile,
  className,
}: UnifiedFileExplorerProps) {
  const { profile } = useIdentity()
  const {
    workspaces,
    selectedWorkspace,
    selectWorkspace,
    isLoading: loadingWorkspaces,
    isInitialized: workspacesInitialized,
  } = useWorkspace()
  const { isDark } = useTheme()
  // Use new Zustand tag store
  const addTagWithMention = useTagStore((state) => state.addTagWithMention)
  const removeTag = useTagStore((state) => state.removeTag)
  const hasTag = useTagStore((state) => state.hasTag)

  // Current workspace - use selectedWorkspace from the hook which handles auto-selection
  const currentWorkspace = useMemo(() => {
    // selectedWorkspace is already computed by the hook and handles fallback logic
    return selectedWorkspace || workspaces[0] || null
  }, [selectedWorkspace, workspaces])

  const displayWorkspaces = useMemo(() => {
    return currentWorkspace ? [currentWorkspace] : []
  }, [currentWorkspace])

  // Use Zustand store for file explorer state (persisted)
  const { showHiddenFiles, sortBy } = useFileExplorerPreferences()
  const { setShowHiddenFiles, setSortBy } = useFileExplorerPreferenceActions()
  const { loadWorkspaceFiles, toggleFolderWithLoad } = useLoadWorkspaceFiles(
    profile?.id,
  )
  const clearFiles = useFileExplorerStore((state) => state.clearFiles)

  // Local UI state (not persisted)
  const [searchTerm, setSearchTerm] = useState('')
  const { results: searchResults, isSearching: isRecursiveSearching } =
    useWorkspaceFileSearch(currentWorkspace?.id, searchTerm, { minChars: 2 })
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Confirmation dialogs
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    file: WorkspaceFile
    workspace: Workspace
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [lockConfirmation, setLockConfirmation] = useState<{
    file: WorkspaceFile
    workspace: Workspace
    action: 'lock' | 'unlock'
  } | null>(null)
  const [isLocking, setIsLocking] = useState(false)

  // Drag and drop
  const [activeFile, setActiveFile] = useState<{
    file: WorkspaceFile
    workspace: Workspace
  } | null>(null)

  const [uploadError, setUploadError] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  // Atomic file operation hooks — paths/IDs driven by confirmation dialog state
  const [deleteWorkspaceFile] = useDeleteWorkspaceFile(
    deleteConfirmation?.workspace.id ?? '',
    deleteConfirmation?.file.path ?? '',
  )
  const [lockFileHook] = useLockFile(lockConfirmation?.workspace.id ?? '')
  const [unlockFileHook] = useUnlockFile(lockConfirmation?.workspace.id ?? '')
  const [moveCrossWorkspace] = useMoveFile(activeFile?.workspace.id ?? '')
  const [uploadWorkspaceFile] = useUploadWorkspaceFile(
    currentWorkspace?.id ?? '',
  )

  // Ref-based coordination for external file drops on folders vs container
  const externalDropHandledRef = useRef(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  // Handle file open - directly call onFileOpen without updating state
  const handleFileOpen = useCallback(
    (file: WorkspaceFile, workspace: Workspace) => {
      // Only switch workspace if needed, don't update any selection state
      if (workspace.id !== selectedWorkspace?.id) {
        selectWorkspace(workspace.id)
      }
      if (onFileOpen) {
        onFileOpen(file, workspace)
      }
    },
    [selectedWorkspace?.id, selectWorkspace, onFileOpen],
  )

  const handleRefresh = useCallback(async () => {
    if (!currentWorkspace) return

    setIsRefreshing(true)

    // Clear cached files for this workspace and reload
    clearFiles(currentWorkspace.id)

    // Reload root files
    await loadWorkspaceFiles(currentWorkspace, '/')

    // Reload expanded folders
    const expandedFolders = useFileExplorerStore.getState().expandedFolders
    const refreshPromises: Promise<void>[] = []

    expandedFolders.forEach((folderId) => {
      if (folderId.startsWith(currentWorkspace.id + ':')) {
        const folderPath = folderId.split(':')[1]
        refreshPromises.push(loadWorkspaceFiles(currentWorkspace, folderPath))
      }
    })

    await Promise.all(refreshPromises)
    setIsRefreshing(false)
  }, [currentWorkspace, clearFiles, loadWorkspaceFiles])

  const handleDeleteClick = useCallback(
    (file: WorkspaceFile, workspace: Workspace) => {
      if ((file as any).path?.startsWith('/__virtual__/')) return
      setDeleteConfirmation({ file, workspace })
    },
    [],
  )

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirmation || !profile?.id) return

    setIsDeleting(true)
    const { file, workspace } = deleteConfirmation

    try {
      await deleteWorkspaceFile({})

      const parentPath =
        file.path.substring(0, file.path.lastIndexOf('/')) || '/'
      await loadWorkspaceFiles(workspace, parentPath, true)

      setDeleteConfirmation(null)
    } catch (error) {
      console.error('Failed to delete:', error)
    } finally {
      setIsDeleting(false)
    }
  }, [deleteConfirmation, profile?.id, loadWorkspaceFiles])

  const handleLockClick = useCallback(
    (file: WorkspaceFile, workspace: Workspace) => {
      if ((file as any).path?.startsWith('/__virtual__/')) return
      const action = file.isLocked ? 'unlock' : 'lock'
      setLockConfirmation({ file, workspace, action })
    },
    [],
  )

  // Download is handled in FileTreeItem directly via useReadFile hook

  // Handle copying file path to clipboard (relative to workspace)
  const handleCopyPath = useCallback(async (file: WorkspaceFile) => {
    if ((file as any).path?.startsWith('/__virtual__/')) return

    try {
      // Copy the path relative to the workspace (without leading slash)
      const relativePath = file.path.startsWith('/')
        ? file.path.slice(1)
        : file.path
      await navigator.clipboard.writeText(relativePath)
    } catch (error) {
      console.error('Failed to copy path:', error)
    }
  }, [])

  // Handle creating a new file in a specific folder
  const handleCreateInFolder = useCallback((folderPath: string) => {
    window.dispatchEvent(
      new CustomEvent('createNewFile', {
        detail: { directory: folderPath },
      }),
    )
  }, [])

  // Handle renaming a file or folder
  const updateTabFileId = useFileTabStore((state) => state.updateTabFileId)

  // Side-effects only — the API call (moveFile) is done by FileTreeItem via useMoveFile
  const handleRenameFile = useCallback(
    async (file: WorkspaceFile, workspace: Workspace, newName: string) => {
      const parentPath =
        file.path.substring(0, file.path.lastIndexOf('/')) || ''
      const newPath = parentPath ? `${parentPath}/${newName}` : `/${newName}`
      const oldCleanPath = file.path.startsWith('/')
        ? file.path.slice(1)
        : file.path
      const newCleanPath = newPath.startsWith('/') ? newPath.slice(1) : newPath
      const oldFileId = `${workspace.id}/${oldCleanPath}`
      const newFileId = `${workspace.id}/${newCleanPath}`

      window.dispatchEvent(
        new CustomEvent('fileRenamed', { detail: { oldFileId, newFileId } }),
      )
      updateTabFileId(oldFileId, newFileId, newName)
      await loadWorkspaceFiles(workspace, parentPath || '/', true)
    },
    [loadWorkspaceFiles, updateTabFileId],
  )

  const handleLockConfirm = useCallback(async () => {
    if (!lockConfirmation || !profile?.id) return

    setIsLocking(true)
    const { file, workspace, action } = lockConfirmation

    try {
      if (action === 'lock') {
        await lockFileHook({ path: file.path })
      } else {
        await unlockFileHook({ path: file.path })
      }

      const parentPath =
        file.path.substring(0, file.path.lastIndexOf('/')) || '/'
      await loadWorkspaceFiles(workspace, parentPath, true)

      setLockConfirmation(null)
    } catch (error) {
      console.error('Failed to lock/unlock:', error)
    } finally {
      setIsLocking(false)
    }
  }, [lockConfirmation, profile?.id, loadWorkspaceFiles])

  // Handle file tagging/untagging (toggle)
  const handleTagFile = useCallback(
    (file: WorkspaceFile) => {
      if (!currentWorkspace) return

      // Create a file ID from workspace and path
      const fileId = `${currentWorkspace.id}:${file.path}`

      // Check if already tagged
      const alreadyTagged = hasTag(fileId)

      if (alreadyTagged) {
        // Untag the file
        removeTag(fileId)
      } else {
        // Convert WorkspaceFile to TaggedItem and add to store + insert mention
        const taggedItem = fileToTaggedItem(file)
        // Use the full ID with workspace prefix for uniqueness
        taggedItem.id = fileId
        addTagWithMention(taggedItem)
      }
    },
    [addTagWithMention, removeTag, hasTag, currentWorkspace],
  )

  // Check if a file is tagged
  const handleIsFileTagged = useCallback(
    (fileId: string) => {
      return hasTag(fileId)
    },
    [hasTag],
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    if (active.data.current) {
      setActiveFile({
        file: active.data.current.file,
        workspace: active.data.current.workspace,
      })
    }
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      setActiveFile(null)

      if (!over || !profile?.id) return

      const activeData = active.data.current
      const overData = over.data.current

      if (!activeData || !overData) return

      const sourceFile: WorkspaceFile = activeData.file
      const sourceWorkspace: Workspace = activeData.workspace
      const targetFile: WorkspaceFile = overData.file
      const targetWorkspace: Workspace = overData.workspace

      if (sourceWorkspace.id !== targetWorkspace.id) {
        console.warn('Cannot move files between workspaces')
        return
      }

      if (targetFile.type !== 'directory') return
      if (sourceFile.path === targetFile.path) return
      if (
        sourceFile.type === 'directory' &&
        targetFile.path.startsWith(sourceFile.path + '/')
      ) {
        console.warn('Cannot move a folder into itself or its descendants')
        return
      }

      try {
        const fileName = sourceFile.path.split('/').pop() || ''
        const newPath = `${targetFile.path}/${fileName}`

        await moveCrossWorkspace({
          source_path: sourceFile.path,
          destination_path: newPath,
        })

        const sourceParentPath =
          sourceFile.path.substring(0, sourceFile.path.lastIndexOf('/')) || '/'
        await loadWorkspaceFiles(sourceWorkspace, sourceParentPath, true)
        await loadWorkspaceFiles(targetWorkspace, targetFile.path, true)
      } catch (error) {
        console.error('Failed to move file:', error)
      }
    },
    [profile?.id, loadWorkspaceFiles],
  )

  // Upload progress store actions
  const addUpload = useUploadProgressStore((state) => state.addUpload)
  const updateUploadProgress = useUploadProgressStore(
    (state) => state.updateProgress,
  )
  const completeUpload = useUploadProgressStore((state) => state.completeUpload)
  const failUpload = useUploadProgressStore((state) => state.failUpload)

  const handleFileUpload = useCallback(
    async (
      files: FileList,
      targetWorkspace: Workspace,
      targetFolderPath: string = '/',
    ) => {
      if (!profile?.id || files.length === 0) return

      setIsUploading(true)
      setUploadError('')

      // Normalize folder path: ensure it starts with / and doesn't end with / (unless root)
      const normalizedFolder =
        targetFolderPath === '/'
          ? ''
          : targetFolderPath.startsWith('/')
            ? targetFolderPath
            : `/${targetFolderPath}`

      try {
        const uploadPromises = Array.from(files).map(async (file) => {
          // Generate unique upload ID
          const uploadId = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`

          // Add to upload progress store
          addUpload(uploadId, file.name, file.size)

          try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('path', `${normalizedFolder}/${file.name}`)
            await uploadWorkspaceFile(formData)

            completeUpload(uploadId)
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Upload failed'
            failUpload(uploadId, errorMessage)
            throw error
          }
        })

        await Promise.all(uploadPromises)

        // Reload the target folder
        const reloadPath = targetFolderPath === '/' ? '/' : targetFolderPath
        await loadWorkspaceFiles(targetWorkspace, reloadPath, true)

        // Also reload root if uploading to a subfolder (so parent shows updated state)
        if (reloadPath !== '/') {
          await loadWorkspaceFiles(targetWorkspace, '/', true)
        }
      } catch (error) {
        console.error('Failed to upload files:', error)
        setUploadError('Some files failed to upload')
      } finally {
        setIsUploading(false)
      }
    },
    [
      profile?.id,
      loadWorkspaceFiles,
      addUpload,
      updateUploadProgress,
      completeUpload,
      failUpload,
    ],
  )

  // Callback for folder-level external file drops
  const onExternalFileDrop = useCallback(
    (files: File[], folderPath: string) => {
      const targetWorkspace = currentWorkspace || workspaces[0]
      if (!targetWorkspace) {
        setUploadError('No workspace available')
        return
      }
      const dt = new DataTransfer()
      files.forEach((f) => dt.items.add(f))
      handleFileUpload(dt.files, targetWorkspace, folderPath)
    },
    [currentWorkspace, workspaces, handleFileUpload],
  )

  // Subscribe to workspaceFiles so the effect re-runs after cache clears
  const workspaceFiles = useFileExplorerStore((state) => state.workspaceFiles)

  // Auto-load workspace files when workspace changes or cache is cleared
  // Also load files for any folders that were persisted as expanded
  useEffect(() => {
    if (currentWorkspace) {
      const store = useFileExplorerStore.getState()
      const rootKey = `${currentWorkspace.id}:/`

      // Load root files if not already loaded (or after cache clear)
      if (!store.workspaceFiles.has(rootKey)) {
        loadWorkspaceFiles(currentWorkspace, '/')
      }

      // Load files for any expanded folders that don't have files yet
      // This handles the case where expansion state was restored from persistence
      // but the files weren't (since workspaceFiles is not persisted)
      store.expandedFolders.forEach((folderId) => {
        if (folderId.startsWith(`${currentWorkspace.id}:`)) {
          const folderPath = folderId.split(':')[1]
          if (folderPath !== '/' && !store.workspaceFiles.has(folderId)) {
            loadWorkspaceFiles(currentWorkspace, folderPath)
          }
        }
      })
    }
  }, [currentWorkspace, workspaceFiles, loadWorkspaceFiles])

  // File drag and drop — scoped to file explorer container via hook
  const isFileBeingDragged = useFileDragging()
  const { dropZoneProps: explorerDropZoneProps } = useDropZone({
    onFilesDropped: async (files) => {
      // If a folder already handled this drop, skip the root upload
      if (externalDropHandledRef.current) {
        externalDropHandledRef.current = false
        return
      }

      const targetWorkspace = currentWorkspace || workspaces[0]
      if (!targetWorkspace) {
        setUploadError('No workspace available')
        return
      }
      // Convert File[] to FileList-like for handleFileUpload
      const dt = new DataTransfer()
      files.forEach((f) => dt.items.add(f))
      await handleFileUpload(dt.files, targetWorkspace, '/')
    },
  })

  // Actions context value - for component-specific callbacks only
  const actionsContextValue = useMemo<FileExplorerActionsContextType>(
    () => ({
      handleDelete: handleDeleteClick,
      handleLock: handleLockClick,
      handleCopyPath,
      handleCreateInFolder,
      handleRename: handleRenameFile,
      tagFile: handleTagFile,
      isFileTagged: handleIsFileTagged,
      toggleFolderWithLoad,
      onExternalFileDrop,
      externalDropHandledRef,
    }),
    [
      handleDeleteClick,
      handleLockClick,
      handleCopyPath,
      handleCreateInFolder,
      handleRenameFile,
      handleTagFile,
      handleIsFileTagged,
      toggleFolderWithLoad,
      onExternalFileDrop,
    ],
  )

  // Get root files from Zustand store (used by the auto-load effect above)

  return (
    <FileExplorerActionsContext.Provider value={actionsContextValue}>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}>
        <div
          {...explorerDropZoneProps}
          className={cn('relative flex h-full flex-col', className)}>
          {/* Search bar with create button */}
          <m.div
            className='px-2 py-2'
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: smoothEase }}>
            <div className='flex items-center justify-between gap-2'>
              <ExpandableSearchInput
                isExpanded={isSearchExpanded}
                onToggle={() => {
                  setIsSearchExpanded(!isSearchExpanded)
                  if (isSearchExpanded) {
                    setSearchTerm('')
                  }
                }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder='Search files...'
                expandedWidth={160}
                size='small'
                isDark={isDark}
              />

              {/* Create file button */}
              {onCreateFile && (
                <m.button
                  onClick={onCreateFile}
                  disabled={!currentWorkspace}
                  title='New'
                  className={cn(
                    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200',
                    !currentWorkspace && 'cursor-not-allowed opacity-50',
                    isDark
                      ? 'text-white/60 hover:bg-white/[0.05]'
                      : 'text-black/60 hover:bg-black/[0.04]',
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.1 }}>
                  <RiAddCircleLine className='h-[18px] w-[18px]' />
                </m.button>
              )}
            </div>
          </m.div>

          {/* File tree */}
          <div className='relative flex-1 overflow-y-auto px-1'>
            {loadingWorkspaces || !workspacesInitialized ? (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className='flex items-center justify-center py-8'>
                <Spinner size='md' />
              </m.div>
            ) : displayWorkspaces.length === 0 ? (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className='flex items-center justify-center py-8'>
                <div
                  className={cn(
                    'text-sm',
                    isDark ? 'text-white/50' : 'text-black/50',
                  )}>
                  No workspace selected
                </div>
              </m.div>
            ) : isRecursiveSearching && currentWorkspace ? (
              // Recursive search across the whole workspace — flat results.
              <div className='py-1'>
                {searchResults.length === 0 ? (
                  <div
                    className={cn(
                      'px-3 py-6 text-center text-sm',
                      isDark ? 'text-white/40' : 'text-black/40',
                    )}>
                    No files match
                  </div>
                ) : (
                  searchResults.map((file, index) => (
                    <FileTreeItem
                      key={`${currentWorkspace.id}:${file.path}`}
                      file={file}
                      workspace={currentWorkspace}
                      level={0}
                      index={index}
                      onFileOpen={handleFileOpen}
                    />
                  ))
                )}
              </div>
            ) : (
              <div className='py-1'>
                {displayWorkspaces.map((workspace) => {
                  const rootFiles =
                    workspaceFiles.get(`${workspace.id}:/`) || []

                  return (
                    <m.div
                      key={workspace.id}
                      initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ duration: 0.5, ease: smoothEase }}>
                      <FileTreeList
                        workspace={workspace}
                        files={rootFiles}
                        level={0}
                        searchTerm={searchTerm}
                        onFileOpen={handleFileOpen}
                      />
                    </m.div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Bottom controls */}
          <m.div
            className='px-2 py-2'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1, ease: smoothEase }}>
            <div className='flex items-center justify-between gap-1'>
              {/* Sort dropdown */}
              <div className='relative'>
                <m.button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  title={sortOptions.find((opt) => opt.value === sortBy)?.label}
                  className={cn(
                    'flex items-center justify-center rounded-full p-1.5 text-[13px] font-medium transition-all duration-200',
                    isDark
                      ? 'text-white/60 hover:bg-white/[0.05]'
                      : 'text-black/60 hover:bg-black/[0.04]',
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.1 }}>
                  <RiArrowUpDownLine className='h-4 w-4' />
                </m.button>

                {showSortMenu && (
                  <m.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2, ease: smoothEase }}
                    className={cn(
                      'absolute bottom-full left-0 mb-1 w-48 rounded-md border shadow-lg',
                      isDark
                        ? 'border-white/[0.08] bg-black'
                        : 'border-black/[0.08] bg-white',
                    )}>
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value)
                          setShowSortMenu(false)
                        }}
                        className={cn(
                          'w-full px-3 py-1.5 text-left text-[13px] transition-colors first:rounded-t-md last:rounded-b-md',
                          sortBy === option.value
                            ? isDark
                              ? 'bg-white/[0.12] text-white'
                              : 'bg-[#0098FC]/[0.12] text-[#0098FC]'
                            : isDark
                              ? 'text-white/60 hover:bg-white/[0.05]'
                              : 'text-black/60 hover:bg-black/[0.04]',
                        )}>
                        {option.label}
                      </button>
                    ))}
                  </m.div>
                )}
              </div>

              {/* Other controls */}
              <div className='flex items-center gap-1'>
                <m.button
                  onClick={() => setShowHiddenFiles(!showHiddenFiles)}
                  title={
                    showHiddenFiles ? 'Hide hidden files' : 'Show hidden files'
                  }
                  className={cn(
                    'flex items-center justify-center rounded-full p-1.5 text-[13px] font-medium transition-all duration-200',
                    showHiddenFiles
                      ? isDark
                        ? 'bg-white/[0.12] text-white'
                        : 'bg-[#0098FC]/[0.12] text-[#0098FC]'
                      : isDark
                        ? 'text-white/60 hover:bg-white/[0.05]'
                        : 'text-black/60 hover:bg-black/[0.04]',
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.1 }}>
                  {showHiddenFiles ? (
                    <RiEyeLine className='h-4 w-4' />
                  ) : (
                    <RiEyeOffLine className='h-4 w-4' />
                  )}
                </m.button>

                <m.button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  title='Refresh files'
                  className={cn(
                    'flex items-center justify-center rounded-full p-1.5 text-[13px] font-medium transition-all duration-200 disabled:opacity-50',
                    isDark
                      ? 'text-white/60 hover:bg-white/[0.05]'
                      : 'text-black/60 hover:bg-black/[0.04]',
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{ rotate: isRefreshing ? 360 : 0 }}
                  transition={{
                    rotate: {
                      duration: 1,
                      repeat: isRefreshing ? Infinity : 0,
                      ease: 'linear',
                    },
                    scale: { duration: 0.1 },
                  }}>
                  <RiRefreshLine className='h-4 w-4' />
                </m.button>
              </div>
            </div>
          </m.div>

          {/* Confirmation Dialogs */}
          {deleteConfirmation && (
            <ConfirmDialog
              isDark={isDark}
              title='Delete file'
              message={`Are you sure you want to delete "${getDisplayName(deleteConfirmation.file)}"?${deleteConfirmation.file.type === 'directory' ? ' This will delete all files and folders inside it.' : ''}`}
              confirmText='Delete'
              onConfirm={handleDeleteConfirm}
              onCancel={() => setDeleteConfirmation(null)}
              isLoading={isDeleting}
              variant='danger'
            />
          )}

          {lockConfirmation && (
            <ConfirmDialog
              isDark={isDark}
              title={
                lockConfirmation.action === 'lock' ? 'Lock file' : 'Unlock file'
              }
              message={
                lockConfirmation.action === 'lock'
                  ? `Lock "${getDisplayName(lockConfirmation.file)}"? This will prevent all edits, deletions, and moves.${lockConfirmation.file.type === 'directory' ? ' All files and folders inside will also be locked.' : ''}`
                  : `Unlock "${getDisplayName(lockConfirmation.file)}"?${lockConfirmation.file.type === 'directory' ? ' All files and folders inside will also be unlocked.' : ''}`
              }
              confirmText={
                lockConfirmation.action === 'lock' ? 'Lock' : 'Unlock'
              }
              onConfirm={handleLockConfirm}
              onCancel={() => setLockConfirmation(null)}
              isLoading={isLocking}
              variant={
                lockConfirmation.action === 'lock' ? 'danger' : 'default'
              }
            />
          )}

          {/* Upload Progress Overlay */}
          <UploadProgressOverlay isDark={isDark} />
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeFile ? (
            <m.div
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1 text-sm shadow-lg',
                isDark
                  ? 'bg-white/[0.12] text-white'
                  : 'bg-[#0098FC]/[0.16] text-[#0098FC]',
              )}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={springConfig}>
              <div className='flex-shrink-0'>
                {activeFile.file.type === 'directory' &&
                !isSpecialView(activeFile.file) ? (
                  <RiArrowRightSLine
                    className={cn(
                      'h-4 w-4',
                      isDark ? 'text-white/60' : 'text-black/60',
                    )}
                  />
                ) : (
                  getFileIcon(activeFile.file)
                )}
              </div>
              <span>{getDisplayName(activeFile.file)}</span>
            </m.div>
          ) : null}
        </DragOverlay>

        {/* File Upload Overlay */}
        <DropOverlay
          visible={isFileBeingDragged}
          label='Drop files to upload to workspace'
          isUploading={isUploading}
          subtle
        />

        {/* Upload Error */}
        {uploadError && (
          <m.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={springConfig}
            className='absolute bottom-4 left-4 right-4 z-50 flex items-center justify-between gap-2 rounded-lg border px-3 py-2'
            style={{
              backgroundColor: isDark
                ? 'hsl(var(--background))'
                : 'hsl(var(--background))',
              borderColor: 'hsl(var(--destructive))',
            }}>
            <p className='text-sm' style={{ color: 'hsl(var(--destructive))' }}>
              {uploadError}
            </p>
            <button
              onClick={() => setUploadError('')}
              className='flex-shrink-0'
              style={{ color: 'hsl(var(--destructive))' }}>
              <svg
                className='h-4 w-4'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          </m.div>
        )}
      </DndContext>
    </FileExplorerActionsContext.Provider>
  )
})
