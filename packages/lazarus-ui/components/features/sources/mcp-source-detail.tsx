'use client'

import {
  RiAlertLine,
  RiCheckLine,
  RiCloseLine,
  RiCodeSSlashLine,
  RiDatabase2Line,
  RiDeleteBinLine,
  RiEyeLine,
  RiEyeOffLine,
  RiFolderLine,
  RiGitBranchLine,
  RiGlobalLine,
  RiRefreshLine,
  RiServerLine,
  RiSettings3Line,
  RiShieldCheckLine,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import Image from 'next/image'
import { memo, useEffect, useState } from 'react'

import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FileInput } from '@/components/ui/file-input'
import { Input } from '@/components/ui/input'
import Spinner from '@/components/ui/spinner'
import { Toggle } from '@/components/ui/toggle'
import { Tooltip } from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/auth/use-auth'
import { useWorkspace } from '@/hooks/core/use-workspace'
import type {
  ConnectionTestResult,
  MCPOAuthState,
  MCPPreset,
} from '@/hooks/features/mcp/types'
import { useGetMcpPresets } from '@/hooks/features/mcp/use-get-mcp-presets'
import { useGetMcpSources } from '@/hooks/features/mcp/use-get-mcp-sources'
import { useReconnectServer } from '@/hooks/features/mcp/use-mcp-reconnect'
import { useTestMcpConnection } from '@/hooks/features/mcp/use-test-mcp-connection'
import { useUpdateMcpServer } from '@/hooks/features/mcp/use-update-mcp-server'
import { useUpdateMcpServerEnv } from '@/hooks/features/mcp/use-update-mcp-server-env'
import { useUploadMcpCredential } from '@/hooks/features/mcp/use-upload-mcp-credential'
import { getSourceLogoPath } from '@/lib/source-logos'
import { cn } from '@/lib/utils'

import { OAuthAuthorization } from './oauth-authorization'
import { ToolsList } from './tools-list'
import { Source } from './types'

// Icon mapping function
const getSourceIcon = (name: string) => {
  const lowerName = name.toLowerCase()

  if (lowerName.includes('file') || lowerName.includes('filesystem')) {
    return RiFolderLine
  }
  if (lowerName.includes('git')) {
    return RiGitBranchLine
  }
  if (
    lowerName.includes('database') ||
    lowerName.includes('sqlite') ||
    lowerName.includes('postgres')
  ) {
    return RiDatabase2Line
  }
  if (
    lowerName.includes('fetch') ||
    lowerName.includes('web') ||
    lowerName.includes('http')
  ) {
    return RiGlobalLine
  }
  if (lowerName.includes('code') || lowerName.includes('github')) {
    return RiCodeSSlashLine
  }
  if (lowerName.includes('server')) {
    return RiServerLine
  }

  return RiSettings3Line
}

interface MCPSourceDetailProps {
  serverName: string
  source: Source
  workspaceId?: string // Deprecated: workspace ID now comes from useWorkspace hook
  isDark: boolean
  onToggle: (name: string, enabled: boolean) => Promise<void>
  onDelete: (name: string) => Promise<void>
  onRefresh: () => Promise<void>
  onBack: () => void
}

export const MCPSourceDetail = memo(
  ({
    serverName,
    source,
    isDark,
    onToggle,
    onDelete,
    onRefresh,
    onBack,
  }: MCPSourceDetailProps) => {
    const { session } = useAuth()
    const { selectedWorkspace } = useWorkspace()
    const userId = session?.user?.id
    const workspaceId = selectedWorkspace?.id
    const [connectionTest, setConnectionTest] =
      useState<ConnectionTestResult | null>(null)
    const [testingConnection, setTestingConnection] = useState(false)
    const [toggling, setToggling] = useState(false)
    const [isExiting, setIsExiting] = useState(false)
    const [transitionData, setTransitionData] = useState<any>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editedCategory, setEditedCategory] = useState(source.category || '')
    const [editedDescription, setEditedDescription] = useState(
      source.description || '',
    )
    const [editedCommand, setEditedCommand] = useState(source.command || '')
    const [editedArgs, setEditedArgs] = useState(source.args?.join(' ') || '')
    const [editedEnv, setEditedEnv] = useState<Record<string, string>>(
      source.env || {},
    )
    const [showEnvValues, setShowEnvValues] = useState<Record<string, boolean>>(
      {},
    )
    const [isEditingEnv, setIsEditingEnv] = useState(false)
    const [preset, setPreset] = useState<MCPPreset | null>(null)
    const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set())
    const [sourceData, setSourceData] = useState(source)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showReconnectConfirm, setShowReconnectConfirm] = useState(false)
    const [reconnectMessage, setReconnectMessage] = useState<string | null>(
      null,
    )
    const [reconnect, { loading: reconnecting }] =
      useReconnectServer(serverName)
    const [oauthState, setOAuthState] = useState<MCPOAuthState | undefined>(
      source.oauthState,
    )
    const [requiresOAuth, setRequiresOAuth] = useState(
      source.requiresOAuth ?? false,
    )
    const [authInstructions, setAuthInstructions] = useState<
      string | undefined
    >(source.authInstructions)

    const { data: sourcesData, mutate: mutateSources } = useGetMcpSources(
      workspaceId ?? '',
    )
    const { data: presetsData } = useGetMcpPresets()
    const [testConnectionMutation] = useTestMcpConnection(
      workspaceId ?? '',
      serverName,
    )
    const [updateServerMutation] = useUpdateMcpServer(
      workspaceId ?? '',
      serverName,
    )
    const [updateServerEnvMutation] = useUpdateMcpServerEnv(
      workspaceId ?? '',
      serverName,
    )
    const [uploadCredentialMutation] = useUploadMcpCredential(workspaceId ?? '')

    // Check for logo first (by preset_id or server name)
    const logoPath = getSourceLogoPath(sourceData.preset_id, serverName)
    const IconComponent = getSourceIcon(serverName)

    // Sync source data from SWR when available
    useEffect(() => {
      if (!sourcesData) return
      const serverData = sourcesData.availableServers.find(
        (s) => s.name === serverName,
      )
      if (!serverData) return
      setSourceData((prev) => ({
        ...prev,
        ...serverData,
        command: (serverData as any).command || '',
        args: (serverData as any).args || [],
        category: serverData.category || '',
        description: serverData.description || '',
        env: (serverData as any).env || {},
        has_env: !!(
          (serverData as any).env &&
          Object.keys((serverData as any).env).length > 0
        ),
        preset_id: (serverData as any).preset_id,
      }))
      setEditedCommand((serverData as any).command || '')
      setEditedArgs((serverData as any).args?.join(' ') || '')
      setEditedCategory(serverData.category || '')
      setEditedDescription(serverData.description || '')
      setEditedEnv((serverData as any).env || {})
      if ((serverData as any).requiresOAuth !== undefined)
        setRequiresOAuth((serverData as any).requiresOAuth)
      if ((serverData as any).oauthState)
        setOAuthState((serverData as any).oauthState)
      if ((serverData as any).authInstructions)
        setAuthInstructions((serverData as any).authInstructions)
    }, [sourcesData, serverName])

    useEffect(() => {
      // Check for transition data
      const data = sessionStorage.getItem('source-transition')
      if (data) {
        const parsed = JSON.parse(data)
        if (Date.now() - parsed.timestamp < 1000) {
          setTransitionData(parsed)
        }
        sessionStorage.removeItem('source-transition')
      }
    }, [])

    useEffect(() => {
      if (sourceData.enabled && workspaceId && userId) {
        testConnection()
      }
    }, [sourceData.enabled, workspaceId, userId])

    // Derive preset from SWR presets data
    useEffect(() => {
      if (!presetsData || !sourceData.preset_id) return
      const found = presetsData.presets.find(
        (p) => p.id === sourceData.preset_id,
      )
      setPreset(found ?? null)
    }, [presetsData, sourceData.preset_id])

    const testConnection = async () => {
      if (!workspaceId) return
      setTestingConnection(true)
      try {
        const result = await testConnectionMutation({})
        if (result) setConnectionTest(result)
      } catch (err) {
        setConnectionTest({
          connected: false,
          error: 'Failed to test connection',
          serverName: serverName,
          toolsCount: 0,
          tools: [],
          serverInfo: { enabled: sourceData.enabled },
        })
      } finally {
        setTestingConnection(false)
      }
    }

    const handleToggle = async (checked: boolean) => {
      setToggling(true)
      try {
        await onToggle(serverName, checked)
      } finally {
        setToggling(false)
      }
    }

    const handleSave = async () => {
      if (!workspaceId) {
        console.error('No workspace ID available')
        return
      }

      try {
        // Build update payload with edited values
        const updatePayload: any = {}

        if (editedDescription !== source.description) {
          updatePayload.description = editedDescription
        }
        if (editedCategory !== source.category) {
          updatePayload.category = editedCategory
        }
        if (editedCommand !== source.command) {
          updatePayload.command = editedCommand
        }
        const newArgs = editedArgs.trim().split(/\s+/).filter(Boolean)
        const currentArgs = source.args?.join(' ') || ''
        if (editedArgs !== currentArgs) {
          updatePayload.args = newArgs
        }

        // Only make API call if something changed
        if (Object.keys(updatePayload).length > 0) {
          await updateServerMutation(updatePayload)
          await onRefresh()
        }

        setIsEditing(false)
      } catch (err) {
        console.error('Failed to save changes:', err)
        // TODO: Show error toast
      }
    }

    const handleSaveEnv = async () => {
      if (!workspaceId) {
        console.error('No workspace ID available')
        return
      }

      try {
        await updateServerEnvMutation({ env: editedEnv })
        await onRefresh()
        setIsEditingEnv(false)
        testConnection()
      } catch (err) {
        console.error('Failed to save environment variables:', err)
      }
    }

    const handleFileUpload = async (
      envKey: string,
      file: File,
    ): Promise<void> => {
      if (!workspaceId || !userId) {
        console.error('No workspace selected')
        return
      }

      try {
        setUploadingFiles((prev) => new Set(prev).add(envKey))

        const formData = new FormData()
        formData.append('file', file)
        formData.append('serverName', serverName)
        formData.append('envKey', envKey)

        const data = (await uploadCredentialMutation(formData)) as any

        // Update env var with the file path
        setEditedEnv({
          ...editedEnv,
          [envKey]: data.filePath,
        })
      } catch (error) {
        console.error('Error uploading file:', error)
        alert('Failed to upload credential file. Please try again.')
      } finally {
        setUploadingFiles((prev) => {
          const newSet = new Set(prev)
          newSet.delete(envKey)
          return newSet
        })
      }
    }

    const handleBack = () => {
      setIsExiting(true)
      setTimeout(() => {
        onBack()
      }, 150)
    }

    const formatDate = (dateString?: string) => {
      if (!dateString) return 'Never'
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    return (
      <m.div
        className='min-h-screen px-6 py-6'
        initial={{ opacity: 0 }}
        animate={{ opacity: isExiting ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}>
        <m.div
          initial={{
            opacity: 0,
            scale: transitionData ? 0.95 : 1,
            y: transitionData ? 40 : 20,
          }}
          animate={{
            opacity: isExiting ? 0 : 1,
            scale: isExiting ? 0.95 : 1,
            y: isExiting ? -20 : 0,
          }}
          transition={{
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}>
          {/* Header */}
          <div className='mb-8'>
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className='flex items-start justify-between gap-6'>
              {/* Title and description */}
              <div className='min-w-0 flex-1'>
                <m.div
                  layoutId={`source-title-${serverName}`}
                  transition={{ duration: 0.4 }}
                  className='flex items-center gap-3'>
                  {/* Icon/Logo */}
                  <div
                    className={cn(
                      'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                      isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]',
                    )}>
                    {logoPath ? (
                      <Image
                        src={logoPath}
                        alt={serverName}
                        width={24}
                        height={24}
                        className='h-6 w-6 object-contain'
                      />
                    ) : (
                      <IconComponent
                        size={20}
                        className={isDark ? 'text-white/70' : 'text-black/70'}
                      />
                    )}
                  </div>
                  <div>
                    <h1 className='text-[18px] font-semibold leading-snug tracking-[-0.02em]'>
                      {serverName}
                    </h1>
                    {isEditing ? (
                      <Input
                        type='text'
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        placeholder='Add description...'
                        variant='ghost'
                        isDark={isDark}
                        className='mt-1 text-[13px]'
                      />
                    ) : (
                      editedDescription && (
                        <p
                          className={cn(
                            'mt-1 text-[13px] leading-relaxed',
                            isDark ? 'text-white/50' : 'text-black/50',
                          )}>
                          {editedDescription}
                        </p>
                      )
                    )}
                  </div>
                </m.div>
              </div>

              {/* Action buttons */}
              <m.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.3,
                  delay: 0.25,
                  type: 'spring',
                  stiffness: 300,
                  damping: 24,
                }}
                className='flex flex-shrink-0 items-center gap-2'>
                <Toggle
                  checked={sourceData.enabled}
                  onChange={handleToggle}
                  disabled={toggling}
                  size='small'
                  variant='gradient'
                  isDark={isDark}
                />
                {isEditing ? (
                  <button
                    onClick={handleSave}
                    className={cn(
                      'rounded-full px-4 py-1.5 text-[12px] font-medium transition-all',
                      isDark
                        ? 'bg-white/10 text-white/70 hover:bg-white/15'
                        : 'bg-black/10 text-black/70 hover:bg-black/15',
                    )}>
                    Save
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className={cn(
                      'rounded-full px-4 py-1.5 text-[12px] font-medium transition-all',
                      isDark
                        ? 'bg-white/10 text-white/70 hover:bg-white/15'
                        : 'bg-black/10 text-black/70 hover:bg-black/15',
                    )}>
                    Edit
                  </button>
                )}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full transition-all',
                    isDark
                      ? 'text-red-400 hover:bg-red-500/20'
                      : 'text-red-500 hover:bg-red-500/10',
                  )}>
                  <RiDeleteBinLine size={14} />
                </button>
              </m.div>
            </m.div>
          </div>

          {/* Configuration Section */}
          <m.div
            className={cn(
              'border-t py-6',
              isDark ? 'border-white/5' : 'border-black/5',
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.4,
              ease: [0.22, 1, 0.36, 1],
            }}>
            <m.h2
              className='mb-4 text-[14px] font-medium'
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.45 }}>
              Configuration
            </m.h2>
            <m.div
              className='space-y-3'
              initial='hidden'
              animate='visible'
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.05,
                    delayChildren: 0.5,
                  },
                },
              }}>
              <m.div
                className='flex items-start gap-3 text-[13px]'
                variants={{
                  hidden: { opacity: 0, x: -20, filter: 'blur(4px)' },
                  visible: {
                    opacity: 1,
                    x: 0,
                    filter: 'blur(0px)',
                    transition: {
                      duration: 0.4,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  },
                }}>
                <span className='w-16 font-mono text-[12px] opacity-50'>
                  command
                </span>
                <div className='flex-1'>
                  {isEditing ? (
                    <Input
                      type='text'
                      value={editedCommand}
                      onChange={(e) => setEditedCommand(e.target.value)}
                      placeholder='Command...'
                      variant='ghost'
                      isDark={isDark}
                      className='font-mono text-[12px]'
                    />
                  ) : (
                    <div className='font-mono text-[12px]'>{editedCommand}</div>
                  )}
                </div>
              </m.div>

              <m.div
                className='flex items-start gap-3 text-[13px]'
                variants={{
                  hidden: { opacity: 0, x: -20, filter: 'blur(4px)' },
                  visible: {
                    opacity: 1,
                    x: 0,
                    filter: 'blur(0px)',
                    transition: {
                      duration: 0.4,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  },
                }}>
                <span className='w-16 font-mono text-[12px] opacity-50'>
                  args
                </span>
                <div className='flex-1'>
                  {isEditing ? (
                    <Input
                      type='text'
                      value={editedArgs}
                      onChange={(e) => setEditedArgs(e.target.value)}
                      placeholder='Arguments...'
                      variant='ghost'
                      isDark={isDark}
                      className='font-mono text-[12px]'
                    />
                  ) : (
                    <div className='font-mono text-[12px]'>{editedArgs}</div>
                  )}
                </div>
              </m.div>

              <m.div
                className='flex items-start gap-3 text-[13px]'
                variants={{
                  hidden: { opacity: 0, x: -20, filter: 'blur(4px)' },
                  visible: {
                    opacity: 1,
                    x: 0,
                    filter: 'blur(0px)',
                    transition: {
                      duration: 0.4,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  },
                }}>
                <span className='w-16 font-mono text-[12px] opacity-50'>
                  category
                </span>
                <div className='flex-1'>
                  {isEditing ? (
                    <Input
                      type='text'
                      value={editedCategory}
                      onChange={(e) => setEditedCategory(e.target.value)}
                      placeholder='Add category...'
                      variant='ghost'
                      isDark={isDark}
                      className='font-mono text-[11px]'
                    />
                  ) : (
                    editedCategory && (
                      <span className='font-mono text-[11px]'>
                        {editedCategory}
                      </span>
                    )
                  )}
                </div>
              </m.div>

              <m.div
                className='flex items-start gap-3 text-[13px]'
                variants={{
                  hidden: { opacity: 0, x: -20, filter: 'blur(4px)' },
                  visible: {
                    opacity: 1,
                    x: 0,
                    filter: 'blur(0px)',
                    transition: {
                      duration: 0.4,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  },
                }}>
                <span className='w-16 font-mono text-[12px] opacity-50'>
                  updated
                </span>
                <div className='flex-1'>
                  <div className='text-[13px]'>
                    {formatDate(sourceData.updated_at)}
                  </div>
                </div>
              </m.div>
            </m.div>
          </m.div>

          {/* Environment Variables Section */}
          {sourceData.has_env && (
            <m.div
              className={cn(
                'border-t py-6',
                isDark ? 'border-white/5' : 'border-black/5',
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}>
              <div className='mb-4 flex items-center justify-between'>
                <m.h2
                  className='text-[14px] font-medium'
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.55 }}>
                  Environment variables
                </m.h2>
                {isEditingEnv ? (
                  <button
                    onClick={handleSaveEnv}
                    className={cn(
                      'rounded-full px-4 py-1.5 text-[12px] font-medium transition-all',
                      isDark
                        ? 'bg-white/10 text-white/70 hover:bg-white/15'
                        : 'bg-black/10 text-black/70 hover:bg-black/15',
                    )}>
                    Save
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingEnv(true)}
                    className={cn(
                      'rounded-full px-4 py-1.5 text-[12px] font-medium transition-all',
                      isDark
                        ? 'bg-white/10 text-white/70 hover:bg-white/15'
                        : 'bg-black/10 text-black/70 hover:bg-black/15',
                    )}>
                    Edit
                  </button>
                )}
              </div>
              <m.div
                className='space-y-3'
                initial='hidden'
                animate='visible'
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.6,
                    },
                  },
                }}>
                {Object.entries(editedEnv).map(([key, value]) => {
                  const schema = preset?.env_schema?.[key]
                  const isFileType =
                    schema?.type === 'file' ||
                    value.includes('/.mcp-credentials/')

                  return (
                    <m.div
                      key={key}
                      className='flex items-center gap-3 text-[13px]'
                      variants={{
                        hidden: { opacity: 0, x: -20, filter: 'blur(4px)' },
                        visible: {
                          opacity: 1,
                          x: 0,
                          filter: 'blur(0px)',
                          transition: {
                            duration: 0.4,
                            ease: [0.22, 1, 0.36, 1],
                          },
                        },
                      }}>
                      <span
                        className='min-w-[140px] max-w-[200px] flex-shrink-0 truncate font-mono text-[11px] opacity-50'
                        title={key}>
                        {key}
                      </span>
                      <div className='flex min-w-0 flex-1 items-center gap-2'>
                        {isEditingEnv ? (
                          isFileType ? (
                            <FileInput
                              accept='.json'
                              maxSize={5 * 1024 * 1024}
                              disabled={uploadingFiles.has(key)}
                              isDark={isDark}
                              variant='ghost'
                              onFileSelect={(file) =>
                                handleFileUpload(key, file)
                              }
                              helperText={
                                value
                                  ? `Current: ${value.split('/').pop()}`
                                  : schema?.description ||
                                    'Upload your credential file'
                              }
                            />
                          ) : (
                            <Input
                              type={showEnvValues[key] ? 'text' : 'password'}
                              value={value}
                              onChange={(e) =>
                                setEditedEnv({
                                  ...editedEnv,
                                  [key]: e.target.value,
                                })
                              }
                              variant='ghost'
                              isDark={isDark}
                              className='min-w-0 flex-1 font-mono text-[12px]'
                            />
                          )
                        ) : (
                          <div className='min-w-0 flex-1 truncate font-mono text-[12px]'>
                            {isFileType
                              ? value.split('/').pop()
                              : showEnvValues[key]
                                ? value
                                : '••••••••'}
                          </div>
                        )}
                        {!isFileType && (
                          <button
                            onClick={() =>
                              setShowEnvValues({
                                ...showEnvValues,
                                [key]: !showEnvValues[key],
                              })
                            }
                            className={cn(
                              'flex-shrink-0 rounded p-1 transition-colors',
                              isDark
                                ? 'hover:bg-white/10'
                                : 'hover:bg-black/10',
                            )}>
                            {showEnvValues[key] ? (
                              <RiEyeOffLine size={14} />
                            ) : (
                              <RiEyeLine size={14} />
                            )}
                          </button>
                        )}
                      </div>
                    </m.div>
                  )
                })}
              </m.div>
            </m.div>
          )}

          {/* OAuth Authorization Section */}
          {requiresOAuth && workspaceId && (
            <m.div
              className={cn(
                'border-t py-6',
                isDark ? 'border-white/5' : 'border-black/5',
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.52,
                ease: [0.22, 1, 0.36, 1],
              }}>
              <m.h2
                className='mb-4 text-[14px] font-medium'
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.57 }}>
                Authorization
              </m.h2>
              <OAuthAuthorization
                workspaceId={workspaceId}
                serverName={serverName}
                oauthState={oauthState}
                authInstructions={authInstructions}
                isDark={isDark}
                onAuthorizationComplete={() => {
                  // Refresh source data after authorization
                  onRefresh()
                }}
              />
            </m.div>
          )}

          {/* Connection Status Section */}
          <m.div
            className={cn(
              'border-t py-6',
              isDark ? 'border-white/5' : 'border-black/5',
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.55,
              ease: [0.22, 1, 0.36, 1],
            }}>
            <m.h2
              className='mb-4 text-[14px] font-medium'
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.6 }}>
              Connection test
            </m.h2>
            <m.div
              initial='hidden'
              animate='visible'
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.03,
                    delayChildren: 0.65,
                  },
                },
              }}>
              {testingConnection ? (
                <m.div
                  className='flex items-center gap-3'
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: {
                        duration: 0.3,
                        ease: [0.22, 1, 0.36, 1],
                      },
                    },
                  }}>
                  <Spinner size='sm' />
                </m.div>
              ) : connectionTest ? (
                <div className='space-y-2'>
                  <m.div
                    className='flex items-center gap-3 text-[13px]'
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: {
                          duration: 0.3,
                          ease: [0.22, 1, 0.36, 1],
                        },
                      },
                    }}>
                    {connectionTest.connected ? (
                      <>
                        <RiCheckLine size={16} className='text-[#0098FC]' />
                        <span className='text-[13px] text-[#0098FC]'>
                          Server reachable
                        </span>
                        {connectionTest.latencyMs && (
                          <span
                            className={cn(
                              'font-mono text-[11px]',
                              isDark ? 'text-white/30' : 'text-black/30',
                            )}>
                            ({Math.round(connectionTest.latencyMs)}ms)
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <RiCloseLine
                          size={16}
                          className={cn(
                            isDark ? 'text-white/40' : 'text-black/40',
                          )}
                        />
                        <span
                          className={cn(
                            'text-[13px]',
                            isDark ? 'text-white/40' : 'text-black/40',
                          )}>
                          Not connected
                        </span>
                      </>
                    )}
                  </m.div>

                  {connectionTest.toolsCount > 0 && (
                    <m.div
                      className='flex items-center gap-3 text-[13px]'
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          transition: {
                            duration: 0.3,
                            ease: [0.22, 1, 0.36, 1],
                          },
                        },
                      }}>
                      <span className='font-mono text-[12px] opacity-50'>
                        Available tools
                      </span>
                      <span className='text-[18px] font-semibold'>
                        {connectionTest.toolsCount}
                      </span>
                    </m.div>
                  )}

                  {connectionTest.connected &&
                    connectionTest.credentialsValid === true && (
                      <m.div
                        className='flex items-center gap-3 text-[13px]'
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          visible: {
                            opacity: 1,
                            y: 0,
                            transition: {
                              duration: 0.3,
                              ease: [0.22, 1, 0.36, 1],
                            },
                          },
                        }}>
                        <RiShieldCheckLine
                          size={16}
                          className='text-emerald-500'
                        />
                        <div className='flex flex-col'>
                          <span className='text-[13px] text-emerald-500'>
                            Credentials verified
                          </span>
                          {connectionTest.validationTool && (
                            <span
                              className={cn(
                                'text-[10px]',
                                isDark ? 'text-white/25' : 'text-black/25',
                              )}>
                              Tested with: {connectionTest.validationTool}
                            </span>
                          )}
                        </div>
                      </m.div>
                    )}

                  {connectionTest.connected &&
                    connectionTest.credentialsValid === false && (
                      <m.div
                        className='flex items-start gap-3 text-[13px]'
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          visible: {
                            opacity: 1,
                            y: 0,
                            transition: {
                              duration: 0.3,
                              ease: [0.22, 1, 0.36, 1],
                            },
                          },
                        }}>
                        <RiAlertLine
                          size={16}
                          className='mt-0.5 shrink-0 text-amber-500'
                        />
                        <div className='flex flex-col gap-0.5'>
                          <span className='text-[13px] text-amber-500'>
                            Server reachable, but credentials appear invalid
                          </span>
                          {connectionTest.credentialsError && (
                            <span
                              className={cn(
                                'text-[11px] leading-tight',
                                isDark ? 'text-white/40' : 'text-black/40',
                              )}>
                              {connectionTest.credentialsError}
                            </span>
                          )}
                          {connectionTest.validationTool && (
                            <span
                              className={cn(
                                'text-[10px]',
                                isDark ? 'text-white/25' : 'text-black/25',
                              )}>
                              Tested with: {connectionTest.validationTool}
                            </span>
                          )}
                        </div>
                      </m.div>
                    )}

                  {connectionTest.error && (
                    <m.div
                      className='mt-2 rounded bg-red-500/10 p-2 text-[12px] text-red-500'
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          transition: {
                            duration: 0.3,
                            ease: [0.22, 1, 0.36, 1],
                          },
                        },
                      }}>
                      {connectionTest.error}
                    </m.div>
                  )}
                </div>
              ) : (
                <m.div
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: {
                        duration: 0.3,
                        ease: [0.22, 1, 0.36, 1],
                      },
                    },
                  }}>
                  <button
                    onClick={testConnection}
                    className={cn(
                      'rounded-full px-4 py-1.5 text-[12px] font-medium transition-all',
                      isDark
                        ? 'bg-white/10 text-white/70 hover:bg-white/15'
                        : 'bg-black/10 text-black/70 hover:bg-black/15',
                    )}>
                    Test connection
                  </button>
                </m.div>
              )}

              {/* Reconnect button */}
              <m.div
                className='mt-4 flex items-center gap-2'
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.3,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  },
                }}>
                <button
                  onClick={() => setShowReconnectConfirm(true)}
                  disabled={reconnecting}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-medium transition-all',
                    isDark
                      ? 'bg-white/10 text-white/70 hover:bg-white/15'
                      : 'bg-black/10 text-black/70 hover:bg-black/15',
                  )}>
                  {reconnecting ? (
                    <Spinner size='sm' />
                  ) : (
                    <RiRefreshLine size={13} />
                  )}
                  Reconnect
                </button>
                <Tooltip content='Kills stale MCP processes and forces new ones to use the latest config on next execution'>
                  <span
                    className={cn(
                      'cursor-help text-[12px]',
                      isDark ? 'text-white/30' : 'text-black/30',
                    )}>
                    ?
                  </span>
                </Tooltip>
                {reconnectMessage && (
                  <span
                    className={cn(
                      'text-[12px]',
                      isDark ? 'text-white/50' : 'text-black/50',
                    )}>
                    {reconnectMessage}
                  </span>
                )}
              </m.div>
            </m.div>
          </m.div>

          {/* Tools List */}
          {connectionTest?.tools && connectionTest.tools.length > 0 && (
            <m.div
              className={cn(
                'border-t py-6',
                isDark ? 'border-white/5' : 'border-black/5',
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.7,
                ease: [0.22, 1, 0.36, 1],
              }}>
              <m.h2
                className='mb-4 text-[14px] font-medium'
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.75 }}>
                Available tools ({connectionTest.toolsCount})
              </m.h2>
              <ToolsList tools={connectionTest.tools} isDark={isDark} />
            </m.div>
          )}

          {/* Reconnect Confirmation Modal */}
          {showReconnectConfirm && (
            <ConfirmDialog
              isDark={isDark}
              title='Reconnect server'
              message={`This will restart the "${serverName}" MCP server connection. Any active agent executions using this server may be interrupted.`}
              confirmText='Reconnect'
              onConfirm={async () => {
                setShowReconnectConfirm(false)
                const result = await reconnect()
                if (result?.message) {
                  setReconnectMessage(result.message)
                  setTimeout(() => setReconnectMessage(null), 5000)
                }
                // Re-test connection so user sees updated status
                testConnection()
              }}
              onCancel={() => setShowReconnectConfirm(false)}
              isLoading={reconnecting}
            />
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <ConfirmDialog
              isDark={isDark}
              title='Delete tool'
              message={`Are you sure you want to delete "${serverName}"? This will remove the tool and all its configuration.`}
              confirmText='Delete'
              onConfirm={async () => {
                setIsDeleting(true)
                try {
                  await onDelete(serverName)
                } finally {
                  setIsDeleting(false)
                  setShowDeleteConfirm(false)
                }
              }}
              onCancel={() => setShowDeleteConfirm(false)}
              isLoading={isDeleting}
              variant='danger'
            />
          )}
        </m.div>
      </m.div>
    )
  },
)

MCPSourceDetail.displayName = 'MCPSourceDetail'
