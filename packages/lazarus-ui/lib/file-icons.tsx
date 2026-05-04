import {
  RiAddLine,
  RiBox3Line,
  RiDatabase2Line,
  RiDiscordFill,
  RiFileCodeLine,
  RiFileExcel2Line,
  RiFileLine,
  RiFilePdfLine,
  RiFileTextLine,
  RiFileWordLine,
  RiFolderZipLine,
  RiFoldersLine,
  RiFunctionLine,
  RiGlobalLine,
  RiHistoryLine,
  RiImageLine,
  RiMailLine,
  RiMapPinLine,
  RiMessageLine,
  RiMindMap,
  RiMusicLine,
  RiPlugLine,
  RiShieldLine,
  RiTeamLine,
  RiUser6Fill,
  RiVercelFill,
  RiVideoLine,
} from '@remixicon/react'
import React from 'react'

import { FileType } from '@/model/file'

/**
 * Get the appropriate Remix icon component for a file type (for tabs)
 * Returns a React element that can be directly rendered
 */
export function getFileTypeIconComponent(
  fileType: FileType,
  className: string = 'h-3.5 w-3.5',
): React.ReactElement {
  const iconClass = className

  switch (fileType) {
    // Document files - Blue like Word
    case 'document':
      return <RiFileWordLine className={`${iconClass} text-[#2B579A]`} />

    // Word documents (.docx) - Blue like Word
    case 'word_document':
      return <RiFileWordLine className={`${iconClass} text-[#2B579A]`} />

    // Presentations (.pptx) - Orange
    case 'presentation':
      return <RiFileTextLine className={`${iconClass} text-[#D97706]`} />

    // Spreadsheet files - Green
    case 'table':
    case 'spreadsheet':
      return <RiFileExcel2Line className={`${iconClass} text-[#217346]`} />

    // Code files - Gray (theme-aware via CSS)
    case 'code':
      return (
        <RiFileCodeLine
          className={`${iconClass} text-black/60 dark:text-white/60`}
        />
      )

    // Database files - Purple
    case 'sqlite_database':
      return <RiDatabase2Line className={`${iconClass} text-[#9333EA]`} />

    // Memory package - Blue box (special marker for backwards compat)
    case 'knowledge_graph':
      return <RiBox3Line className={`${iconClass} text-[#0098FC]`} />

    // V0 Project - Web/Global icon
    case 'v0_project':
      return <RiVercelFill className={`${iconClass} text-[#0098FC]`} />

    // Image files - Pink
    case 'image':
      return <RiImageLine className={`${iconClass} text-[#EC4899]`} />

    // Slides - Orange
    case 'slides':
      return <RiFileTextLine className={`${iconClass} text-[#D97706]`} />

    // Chat - Blue
    case 'chat':
      return <RiMessageLine className={`${iconClass} text-[#0098FC]`} />

    // Email - Red
    case 'email':
      return <RiMailLine className={`${iconClass} text-[#EA4335]`} />

    // Map - Green
    case 'map':
      return <RiMapPinLine className={`${iconClass} text-[#34A853]`} />

    // Math - Purple
    case 'math':
      return <RiFunctionLine className={`${iconClass} text-[#9333EA]`} />

    // Mindmap - Orange
    case 'mindmap':
      return <RiMindMap className={`${iconClass} text-[#F59E0B]`} />

    // PDF - Red
    case 'pdf':
      return <RiFilePdfLine className={`${iconClass} text-[#DC2626]`} />

    // Video - Purple
    case 'video':
      return <RiVideoLine className={`${iconClass} text-[#7C3AED]`} />

    // Audio - Green
    case 'audio':
      return <RiMusicLine className={`${iconClass} text-[#059669]`} />

    // Archive - Gray (theme-aware via CSS)
    case 'archive':
      return (
        <RiFolderZipLine
          className={`${iconClass} text-black/60 dark:text-white/60`}
        />
      )

    // Special collection types (Views)
    case 'agents_collection':
      return <RiTeamLine className={`${iconClass} text-[#0098FC]`} />

    case 'agent_create':
      return <RiAddLine className={`${iconClass} text-[#0098FC]`} />

    case 'agent_detail':
      return <RiUser6Fill className={`${iconClass} text-[#0098FC]`} />

    case 'sources_collection':
      return <RiPlugLine className={`${iconClass} text-[#0098FC]`} />

    case 'source_create':
      return <RiAddLine className={`${iconClass} text-[#0098FC]`} />

    case 'source_detail':
      return <RiPlugLine className={`${iconClass} text-[#0098FC]`} />

    case 'activity_collection':
      return <RiHistoryLine className={`${iconClass} text-[#0098FC]`} />

    case 'approvals_collection':
      return <RiShieldLine className={`${iconClass} text-[#0098FC]`} />

    case 'workspace_collection':
    case 'workspace_config':
      return <RiFoldersLine className={`${iconClass} text-[#0098FC]`} />

    case 'discord_settings':
      return <RiDiscordFill className={`${iconClass} text-[#5865F2]`} />

    case 'agent_config':
    case 'agent_folder':
      return <RiFileCodeLine className={`${iconClass} text-[#9333EA]`} />

    // Default - neutral (theme-aware via CSS)
    default:
      return (
        <RiFileLine
          className={`${iconClass} text-black/60 dark:text-white/60`}
        />
      )
  }
}

/**
 * Get the appropriate Remix icon component for a file type
 */
export function getFileTypeIcon(
  fileType: FileType,
  className: string = 'h-3.5 w-3.5',
): React.ReactElement {
  return getFileTypeIconComponent(fileType, className)
}

/**
 * Get the appropriate Remix icon component for a file type with theme support
 */
export function getFileTypeIconWithTheme(
  fileType: FileType,
  isDark: boolean,
  className: string = 'h-3.5 w-3.5',
): React.ReactElement {
  const iconClass = className

  switch (fileType) {
    // Document files - Blue like Word
    case 'document':
      return <RiFileWordLine className={`${iconClass} text-[#2B579A]`} />

    // Word documents (.docx) - Blue like Word
    case 'word_document':
      return <RiFileWordLine className={`${iconClass} text-[#2B579A]`} />

    // Presentations (.pptx) - Orange
    case 'presentation':
      return <RiFileTextLine className={`${iconClass} text-[#D97706]`} />

    // Spreadsheet files - Green
    case 'table':
    case 'spreadsheet':
      return <RiFileExcel2Line className={`${iconClass} text-[#217346]`} />

    // Code files - Gray (theme-aware)
    case 'code':
      return (
        <RiFileCodeLine
          className={
            isDark ? `${iconClass} text-white/50` : `${iconClass} text-black/40`
          }
        />
      )

    // Database files - Purple
    case 'sqlite_database':
      return <RiDatabase2Line className={`${iconClass} text-[#9333EA]`} />

    // Memory package - Blue box
    case 'knowledge_graph':
      return <RiBox3Line className={`${iconClass} text-[#0098FC]`} />

    // V0 Project - Web/Global icon
    case 'v0_project':
      return <RiGlobalLine className={`${iconClass} text-[#0098FC]`} />

    // Image files - Pink
    case 'image':
      return <RiImageLine className={`${iconClass} text-[#EC4899]`} />

    // Slides - Orange
    case 'slides':
      return <RiFileTextLine className={`${iconClass} text-[#D97706]`} />

    // Default - neutral (theme-aware)
    default:
      return (
        <RiFileLine
          className={
            isDark ? `${iconClass} text-white/60` : `${iconClass} text-black/60`
          }
        />
      )
  }
}
