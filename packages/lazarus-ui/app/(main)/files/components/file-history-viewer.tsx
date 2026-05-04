'use client'

import { RiCloseLine } from '@remixicon/react'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

import { fileService, ScopeType } from './services/file.service'

interface FileVersion {
  versionId: string
  timestamp: string
  modifiedBy: string
  modifierType: 'user' | 'bot' | 'agent'
  size: number
  checksum: string
  message?: string
}

interface FileHistoryViewerProps {
  scope: ScopeType
  scopeId: string
  filePath: string
  userId: string
  teamId?: string
  onRestore?: (versionId: string) => void
  onClose?: () => void
}

export function FileHistoryViewer({
  scope,
  scopeId,
  filePath,
  userId,
  teamId,
  onRestore,
  onClose,
}: FileHistoryViewerProps) {
  const [versions, setVersions] = useState<FileVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState<FileVersion | null>(
    null,
  )
  const [versionContent, setVersionContent] = useState<string | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    loadHistory()
  }, [scope, scopeId, filePath])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const history = await fileService.getFileHistory(
        scope,
        scopeId,
        filePath,
        userId,
        teamId,
      )
      setVersions(history.versions)
    } catch (error) {
      console.error('Failed to load file history:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadVersionContent = async (version: FileVersion) => {
    try {
      setLoadingContent(true)
      setSelectedVersion(version)
      const versionData = await fileService.getFileVersion(
        scope,
        scopeId,
        filePath,
        version.versionId,
        userId,
        teamId,
      )
      setVersionContent(versionData.content)
    } catch (error) {
      console.error('Failed to load version content:', error)
      setVersionContent(null)
    } finally {
      setLoadingContent(false)
    }
  }

  const handleRestore = async (versionId: string) => {
    if (
      !window.confirm(
        'Are you sure you want to restore this version? This will create a new version with this content.',
      )
    ) {
      return
    }

    try {
      setRestoring(true)
      await fileService.restoreFileVersion(
        scope,
        scopeId,
        filePath,
        versionId,
        userId,
        teamId,
      )

      // Reload history to show the new version
      await loadHistory()

      // Clear selected version
      setSelectedVersion(null)
      setVersionContent(null)

      // Notify parent
      if (onRestore) {
        onRestore(versionId)
      }
    } catch (error) {
      console.error('Failed to restore version:', error)
    } finally {
      setRestoring(false)
    }
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatSize = (bytes: number) => {
    return fileService.formatFileSize(bytes)
  }

  const getModifierBadgeColor = (type: 'user' | 'bot' | 'agent') => {
    switch (type) {
      case 'user':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'bot':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'agent':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    }
  }

  if (loading) {
    return (
      <div className='flex h-full items-center justify-center p-8'>
        <div className='text-center'>
          <div className='mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900 dark:border-gray-100' />
          <p className='text-sm text-gray-500'>Loading version history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between border-b p-4'>
        <div>
          <h2 className='text-lg font-semibold'>Version History</h2>
          <p className='text-sm text-gray-500'>{filePath}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className='rounded-md p-1.5 text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            title='Close'>
            <RiCloseLine className='h-5 w-5' />
          </button>
        )}
      </div>

      <div className='flex flex-1 overflow-hidden'>
        {/* Version List */}
        <div className='w-1/3 overflow-auto border-r'>
          {versions.length === 0 ? (
            <div className='p-4 text-center text-sm text-gray-500'>
              No version history available
            </div>
          ) : (
            <div className='divide-y'>
              {versions.map((version, index) => (
                <button
                  key={version.versionId}
                  onClick={() => loadVersionContent(version)}
                  className={cn(
                    'w-full p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-900',
                    selectedVersion?.versionId === version.versionId &&
                      'bg-blue-50 dark:bg-blue-950',
                  )}>
                  <div className='mb-2 flex items-center gap-2'>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        getModifierBadgeColor(version.modifierType),
                      )}>
                      {version.modifierType}
                    </span>
                    {index === 0 && (
                      <span className='rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200'>
                        Latest
                      </span>
                    )}
                  </div>
                  <div className='mb-1 text-sm font-medium'>
                    {formatDate(version.timestamp)}
                  </div>
                  <div className='mb-1 text-xs text-gray-500'>
                    {version.modifiedBy}
                  </div>
                  <div className='text-xs text-gray-400'>
                    {formatSize(version.size)}
                  </div>
                  {version.message && (
                    <div className='mt-2 text-xs text-gray-600 dark:text-gray-400'>
                      {version.message}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Version Content */}
        <div className='flex flex-1 flex-col'>
          {!selectedVersion ? (
            <div className='flex h-full items-center justify-center text-sm text-gray-500'>
              Select a version to view its content
            </div>
          ) : loadingContent ? (
            <div className='flex h-full items-center justify-center'>
              <div className='text-center'>
                <div className='mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900 dark:border-gray-100' />
                <p className='text-sm text-gray-500'>
                  Loading version content...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Content Header */}
              <div className='flex items-center justify-between border-b p-4'>
                <div>
                  <div className='text-sm font-medium'>
                    Version from {formatDate(selectedVersion.timestamp)}
                  </div>
                  <div className='text-xs text-gray-500'>
                    {selectedVersion.modifiedBy}
                  </div>
                </div>
                <button
                  onClick={() => handleRestore(selectedVersion.versionId)}
                  disabled={restoring}
                  className='rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50'>
                  {restoring ? 'Restoring...' : 'Restore This Version'}
                </button>
              </div>

              {/* Content Display */}
              <div className='flex-1 overflow-auto p-4'>
                <pre className='rounded bg-gray-50 p-4 text-sm dark:bg-gray-900'>
                  <code>{versionContent}</code>
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
