'use client'

import {
  RiArrowRightLine,
  RiDeleteBinLine,
  RiLogoutBoxLine,
  RiMailLine,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { WorkspaceAppearanceEditor } from '@/components/features/workspaces/workspace-appearance-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import Spinner from '@/components/ui/spinner'
import { WorkspaceIntegrationsSection } from '@/components/workspace/workspace-integrations-section'
import { useAuth } from '@/hooks/auth/use-auth'
import { useWorkspace } from '@/hooks/core/use-workspace'
import { useAuthSupabaseMutation } from '@/hooks/data/use-auth-supabase-mutation'
import { useAuthSupabaseQuery } from '@/hooks/data/use-auth-supabase-query'
import { useDeleteWorkspace } from '@/hooks/features/workspace/use-delete-workspace'
import { useGetWorkspaceConfig } from '@/hooks/features/workspace/use-get-workspace-config'
import {
  useWorkspaceInvitations,
  useWorkspaceMembers,
} from '@/hooks/features/workspace/use-team-workspaces'
import { useTransferWorkspace } from '@/hooks/features/workspace/use-transfer-workspace'
import { useUpdateWorkspaceConfig } from '@/hooks/features/workspace/use-update-workspace-config'
import { useValidateWorkspaceConfigSlug } from '@/hooks/features/workspace/use-validate-workspace-config-slug'
import { useTheme } from '@/hooks/ui/use-theme'
import { useDebounce } from '@/hooks/utils/use-debounce'
import { cn } from '@/lib/utils'
import { WorkspaceRole } from '@/model/workspace'

interface WorkspaceConfigViewerProps {
  workspaceId: string
  filePath: string
  userId: string
}

interface WorkspaceConfig {
  slug: string
  name?: string
  description?: string
  avatar?: string | null
  color?: string | null
  createdAt: string
  updatedAt: string
  version: string
}

export function WorkspaceConfigViewer({
  workspaceId,
  userId,
}: WorkspaceConfigViewerProps) {
  const { isDark } = useTheme()
  const { profile } = useAuth()
  const router = useRouter()
  const { refreshWorkspaces, workspaces, selectWorkspace } = useWorkspace()
  const [config, setConfig] = useState<WorkspaceConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editedSlug, setEditedSlug] = useState('')
  const [editedName, setEditedName] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  // Validation
  const [slugValidation, setSlugValidation] = useState<{
    valid: boolean
    error?: string
  } | null>(null)
  const [validating, setValidating] = useState(false)
  const debouncedSlug = useDebounce(editedSlug, 500)

  // Copy state
  const [copied, setCopied] = useState(false)

  // Appearance state
  const [avatar, setAvatar] = useState<string | null>(null)
  const [color, setColor] = useState<string | null>(null)

  // Members state
  const {
    members,
    loading: membersLoading,
    updateMemberRole,
    removeMember,
    leaveWorkspace,
    refetch: refetchMembers,
  } = useWorkspaceMembers(workspaceId)
  const { invitations, sendInvitation, cancelInvitation } =
    useWorkspaceInvitations(workspaceId)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('editor')
  const [isSendingInvite, setIsSendingInvite] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  // Helper to generate a slug from name
  const generateSlugFromName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .slice(0, 64) // Limit to 64 characters
  }

  // Handle name change with auto-slug generation
  const handleNameChange = (newName: string) => {
    setEditedName(newName)
    // Auto-generate slug if user hasn't manually edited it
    if (!slugManuallyEdited) {
      const generatedSlug = generateSlugFromName(newName)
      if (generatedSlug) {
        setEditedSlug(generatedSlug)
      }
    }
  }

  // Handle slug change (marks as manually edited)
  const handleSlugChange = (newSlug: string) => {
    setEditedSlug(newSlug.toLowerCase())
    setSlugManuallyEdited(true)
  }

  // Delete/Transfer/Leave state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [transferToUserId, setTransferToUserId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isTransferring, setIsTransferring] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  // Workspace owner info
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const isOwner = profile?.id === ownerId

  const [updateAppearance] = useAuthSupabaseMutation<
    null,
    { avatar?: string | null; color?: string | null }
  >(
    async (supabase, updates) => {
      const { error } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', workspaceId)
      return { data: null, error }
    },
    {
      onError: (err) => console.error('Failed to update workspace:', err),
    },
  )

  const handleAvatarChange = async (newAvatar: string | null) => {
    setAvatar(newAvatar)
    await updateAppearance({ avatar: newAvatar })
    refreshWorkspaces()
  }

  const handleColorChange = async (newColor: string | null) => {
    setColor(newColor)
    await updateAppearance({ color: newColor })
    refreshWorkspaces()
  }

  // Load workspace config via workspace-scoped hook
  const {
    data: configData,
    loading: configLoading,
    error: configError,
    mutate: refetchConfig,
  } = useGetWorkspaceConfig(workspaceId)

  useEffect(() => {
    setLoading(configLoading)
  }, [configLoading])

  useEffect(() => {
    if (configError) {
      const msg =
        configError instanceof Error
          ? configError.message
          : 'Failed to load config'
      setError(msg)
    } else {
      setError(null)
    }
  }, [configError])

  useEffect(() => {
    const cfg = configData?.config
    if (!cfg) return

    setConfig(cfg)
    setEditedSlug(cfg.slug)
    setEditedName(cfg.name || '')
    setEditedDescription(cfg.description || '')

    const nameToSlug = (name: string): string =>
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 64)
    const generatedFromName = cfg.name ? nameToSlug(cfg.name) : ''
    const slugMatchesName = generatedFromName && cfg.slug === generatedFromName
    setSlugManuallyEdited(!slugMatchesName)
  }, [configData])

  // Appearance and owner are not on the workspace VM — load from Supabase
  const { data: appearance } = useAuthSupabaseQuery<{
    avatar: string | null
    color: string | null
    owner_id: string | null
  }>(workspaceId ? ['workspace-appearance', workspaceId] : null, (supabase) =>
    supabase
      .from('workspaces')
      .select('avatar, color, owner_id')
      .eq('id', workspaceId)
      .single(),
  )

  useEffect(() => {
    if (!appearance) return
    setAvatar(appearance.avatar)
    setColor(appearance.color)
    setOwnerId(appearance.owner_id)
  }, [appearance])

  const [validateSlugCall] = useValidateWorkspaceConfigSlug(workspaceId)
  const [updateConfig] = useUpdateWorkspaceConfig(workspaceId)
  const [transferWorkspace] = useTransferWorkspace(workspaceId)
  const [deleteWorkspaceCall] = useDeleteWorkspace(workspaceId)

  // Validate slug when debounced value changes
  useEffect(() => {
    if (!isEditing || !debouncedSlug) return
    if (debouncedSlug === config?.slug) {
      setSlugValidation({ valid: true })
      return
    }

    let cancelled = false
    setValidating(true)
    validateSlugCall({ slug: debouncedSlug })
      .then((data) => {
        if (cancelled) return
        setSlugValidation(
          data ?? { valid: false, error: 'Failed to validate slug' },
        )
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Failed to validate slug:', err)
        setSlugValidation({ valid: false, error: 'Failed to validate slug' })
      })
      .finally(() => {
        if (!cancelled) setValidating(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedSlug, isEditing, config?.slug, validateSlugCall])

  const handleSave = async () => {
    if (!config) return
    if (!slugValidation?.valid && editedSlug !== config.slug) return

    const hasIdentityChanges =
      editedSlug !== config.slug ||
      editedName !== (config.name || '') ||
      editedDescription !== (config.description || '')

    if (!hasIdentityChanges) {
      setIsEditing(false)
      return
    }

    try {
      setSaving(true)
      const updated = (await updateConfig({
        slug: editedSlug,
        name: editedName || undefined,
        description: editedDescription || undefined,
      } as never)) as { config?: WorkspaceConfig } | undefined

      if (updated?.config) {
        setConfig(updated.config)
      }
      setIsEditing(false)
      await refetchConfig()
      refreshWorkspaces()
    } catch (err) {
      console.error('Failed to save config:', err)
      setError(err instanceof Error ? err.message : 'Failed to save config')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (!config) return
    setEditedSlug(config.slug)
    setEditedName(config.name || '')
    setEditedDescription(config.description || '')
    setIsEditing(false)
    setSlugValidation(null)
    setSlugManuallyEdited(false)
  }

  const handleCopyEmailDomain = () => {
    if (!config) return
    const emailDomain = process.env.NEXT_PUBLIC_EMAIL_DOMAIN || 'mail.example.com'
    const domain = `*@${config.slug}.${emailDomain}`
    navigator.clipboard.writeText(domain)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='flex items-center gap-3'>
          <Spinner size='sm' />
          <span
            className={cn(
              'text-sm',
              isDark ? 'text-white/50' : 'text-black/50',
            )}>
            Loading workspace configuration...
          </span>
        </div>
      </div>
    )
  }

  if (error && !config) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='text-center'>
          <p className='text-destructive'>
            {error || 'Failed to load workspace configuration'}
          </p>
        </div>
      </div>
    )
  }

  if (!config) return null

  return (
    <m.div
      className='min-h-screen px-6 py-6'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}>
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
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
              <h1 className='text-[18px] font-semibold leading-snug tracking-[-0.02em]'>
                Workspace configuration
              </h1>
              <p
                className={cn(
                  'mt-1 text-[13px] leading-relaxed',
                  isDark ? 'text-white/50' : 'text-black/50',
                )}>
                Configure your workspace identity and email routing
              </p>
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
              {isEditing ? (
                <>
                  <Button
                    onClick={handleCancel}
                    disabled={saving}
                    variant='secondary'
                    size='small'
                    shape='pill'>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={
                      saving ||
                      (!slugValidation?.valid && editedSlug !== config.slug) ||
                      validating
                    }
                    variant='active'
                    size='small'
                    shape='pill'
                    loading={saving}>
                    Save
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant='secondary'
                  size='small'
                  shape='pill'>
                  Edit
                </Button>
              )}
            </m.div>
          </m.div>
        </div>

        {/* Workspace Identity Section */}
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
            Identity
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
              <span className='w-24 font-mono text-[12px] opacity-50'>
                slug
              </span>
              <div className='flex-1'>
                {isEditing ? (
                  <div className='space-y-2'>
                    <Input
                      type='text'
                      value={editedSlug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder='workspace-slug'
                      variant='ghost'
                      isDark={isDark}
                      disabled={saving}
                      className='font-mono text-[12px]'
                    />
                    {validating && (
                      <p className='text-[11px] opacity-50'>
                        Validating slug...
                      </p>
                    )}
                    {!validating && slugValidation && !slugValidation.valid && (
                      <p className='text-[11px] text-red-500'>
                        {slugValidation.error}
                      </p>
                    )}
                    {!validating &&
                      slugValidation?.valid &&
                      editedSlug !== config.slug && (
                        <p className='text-[11px] text-emerald-600'>
                          Slug is available
                        </p>
                      )}
                    <p className='text-[11px] opacity-50'>
                      Only lowercase letters, numbers, and hyphens (3-64
                      characters)
                    </p>
                  </div>
                ) : (
                  <div className='font-mono text-[12px]'>{config.slug}</div>
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
              <span className='w-24 font-mono text-[12px] opacity-50'>
                name
              </span>
              <div className='flex-1'>
                {isEditing ? (
                  <Input
                    type='text'
                    value={editedName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder='Display name (optional)'
                    variant='ghost'
                    isDark={isDark}
                    disabled={saving}
                    className='text-[12px]'
                  />
                ) : (
                  <div className='text-[12px]'>
                    {config.name || <span className='opacity-50'>Not set</span>}
                  </div>
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
              <span className='w-24 font-mono text-[12px] opacity-50'>
                description
              </span>
              <div className='flex-1'>
                {isEditing ? (
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder='Workspace description (optional)'
                    className={cn(
                      'w-full rounded-lg border bg-transparent px-3 py-2 text-[12px] font-medium',
                      'focus:outline-none focus:ring-2 focus:ring-[#0098FC]',
                      'transition-all duration-200',
                      'min-h-[60px] resize-y',
                      isDark
                        ? 'border-white/10 text-white placeholder:text-white/30'
                        : 'border-black/10 text-black placeholder:text-black/30',
                    )}
                    disabled={saving}
                  />
                ) : (
                  <div className='text-[12px]'>
                    {config.description || (
                      <span className='opacity-50'>Not set</span>
                    )}
                  </div>
                )}
              </div>
            </m.div>
          </m.div>
        </m.div>

        {/* Appearance Section */}
        <m.div
          className={cn(
            'border-t py-6',
            isDark ? 'border-white/5' : 'border-black/5',
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: 0.45,
            ease: [0.22, 1, 0.36, 1],
          }}>
          <m.h2
            className='mb-4 text-[14px] font-medium'
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}>
            Appearance
          </m.h2>
          {isEditing ? (
            <WorkspaceAppearanceEditor
              workspaceId={workspaceId}
              workspaceName={config.name || config.slug}
              avatar={avatar}
              color={color}
              onAvatarChange={handleAvatarChange}
              onColorChange={handleColorChange}
              isDark={isDark}
            />
          ) : (
            <div className='flex items-center gap-4'>
              {/* Workspace Icon Preview */}
              <div
                className={cn(
                  'h-16 w-16 flex-shrink-0 overflow-hidden rounded-full',
                  !avatar && !color && (isDark ? 'bg-white/10' : 'bg-black/5'),
                )}>
                {avatar ? (
                  <img
                    src={avatar}
                    alt=''
                    className='h-full w-full object-cover'
                  />
                ) : color ? (
                  <div
                    className='flex h-full w-full items-center justify-center text-xl font-semibold text-white'
                    style={{ backgroundColor: color }}>
                    {(config.name || config.slug)?.charAt(0).toUpperCase() ||
                      'W'}
                  </div>
                ) : (
                  <div
                    className={cn(
                      'flex h-full w-full items-center justify-center text-xl font-semibold',
                      isDark ? 'text-white/40' : 'text-black/30',
                    )}>
                    {(config.name || config.slug)?.charAt(0).toUpperCase() ||
                      'W'}
                  </div>
                )}
              </div>
              <div className='flex flex-col gap-1'>
                <p
                  className={cn(
                    'text-[12px]',
                    isDark ? 'text-white/50' : 'text-black/50',
                  )}>
                  {avatar
                    ? 'Custom avatar'
                    : color
                      ? 'Custom color'
                      : 'Default appearance'}
                </p>
                <p
                  className={cn(
                    'text-[11px]',
                    isDark ? 'text-white/30' : 'text-black/30',
                  )}>
                  Click Edit to change
                </p>
              </div>
            </div>
          )}
        </m.div>

        {/* Email Domain Section */}
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
          <div className='mb-4 flex items-center justify-between'>
            <m.h2
              className='text-[14px] font-medium'
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.6 }}>
              Email routing
            </m.h2>
            <Button
              onClick={handleCopyEmailDomain}
              variant='secondary'
              size='small'
              shape='pill'>
              {copied ? 'Copied' : 'Copy domain'}
            </Button>
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
              <span className='w-24 font-mono text-[12px] opacity-50'>
                domain
              </span>
              <div className='flex-1'>
                <div className='font-mono text-[12px]'>
                  *@{config.slug}.{process.env.NEXT_PUBLIC_EMAIL_DOMAIN || 'mail.example.com'}
                </div>
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
              <span className='w-24 font-mono text-[12px] opacity-50'>
                example
              </span>
              <div className='flex-1'>
                <div className='font-mono text-[11px] opacity-50'>
                  {'{agent-id}'}@{config.slug}.{process.env.NEXT_PUBLIC_EMAIL_DOMAIN || 'mail.example.com'}
                </div>
              </div>
            </m.div>
          </m.div>
        </m.div>

        {/* Integrations Section */}
        <m.div
          className={cn(
            'border-t py-6',
            isDark ? 'border-white/5' : 'border-black/5',
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: 0.58,
            ease: [0.22, 1, 0.36, 1],
          }}>
          <m.h2
            className='mb-4 text-[14px] font-medium'
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.63 }}>
            Integrations
          </m.h2>
          <WorkspaceIntegrationsSection workspaceId={workspaceId} />
        </m.div>

        {/* Metadata Section */}
        <m.div
          className={cn(
            'border-t py-6',
            isDark ? 'border-white/5' : 'border-black/5',
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: 0.6,
            ease: [0.22, 1, 0.36, 1],
          }}>
          <m.h2
            className='mb-4 text-[14px] font-medium'
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.65 }}>
            Metadata
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
                  delayChildren: 0.7,
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
              <span className='w-24 font-mono text-[12px] opacity-50'>
                created
              </span>
              <div className='flex-1'>
                <div className='font-mono text-[12px]'>
                  {new Date(config.createdAt).toLocaleString()}
                </div>
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
              <span className='w-24 font-mono text-[12px] opacity-50'>
                updated
              </span>
              <div className='flex-1'>
                <div className='font-mono text-[12px]'>
                  {new Date(config.updatedAt).toLocaleString()}
                </div>
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
              <span className='w-24 font-mono text-[12px] opacity-50'>
                version
              </span>
              <div className='flex-1'>
                <div className='font-mono text-[12px]'>{config.version}</div>
              </div>
            </m.div>
          </m.div>
        </m.div>

        {/* Members Section */}
        <m.div
          className={cn(
            'border-t py-6',
            isDark ? 'border-white/5' : 'border-black/5',
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: 0.65,
            ease: [0.22, 1, 0.36, 1],
          }}>
          <m.h2
            className='mb-4 text-[14px] font-medium'
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.7 }}>
            Members
          </m.h2>

          {/* Invite new member */}
          <div className='mb-6'>
            <div className='flex items-center gap-2'>
              <Input
                type='email'
                placeholder='Email address'
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value)
                  if (inviteError) setInviteError(null)
                }}
                variant='ghost'
                isDark={isDark}
                className='flex-1 text-[12px]'
              />
              <Select
                value={inviteRole}
                onValueChange={(value) => setInviteRole(value as WorkspaceRole)}
                isDark={isDark}
                variant='ghost'
                size='small'>
                <option value='admin'>Admin</option>
                <option value='developer'>Developer</option>
                <option value='editor'>Editor</option>
                <option value='member'>Member</option>
                <option value='viewer'>Viewer</option>
              </Select>
              <Button
                onClick={async () => {
                  if (!inviteEmail) return
                  setInviteError(null)
                  try {
                    setIsSendingInvite(true)
                    await sendInvitation(inviteEmail, inviteRole)
                    setInviteEmail('')
                  } catch (err) {
                    const message =
                      err instanceof Error
                        ? err.message
                        : 'Failed to send invitation'
                    setInviteError(message)
                  } finally {
                    setIsSendingInvite(false)
                  }
                }}
                disabled={!inviteEmail || isSendingInvite}
                variant='secondary'
                size='small'
                shape='pill'
                loading={isSendingInvite}
                iconLeft={<RiMailLine className='h-3 w-3' />}>
                Invite
              </Button>
            </div>
            <div className='relative h-0'>
              {inviteError && (
                <p
                  className={cn(
                    'absolute left-0 top-1 text-[12px]',
                    isDark ? 'text-red-400' : 'text-red-600',
                  )}>
                  {inviteError}
                </p>
              )}
            </div>
          </div>

          {/* Pending invitations */}
          {invitations.length > 0 && (
            <div className='mb-6'>
              <h3
                className={cn(
                  'mb-2 text-[11px] font-medium uppercase tracking-wider',
                  isDark ? 'text-white/40' : 'text-black/40',
                )}>
                Pending invitations
              </h3>
              <div className='space-y-0'>
                {invitations.map((invitation, index) => (
                  <m.div
                    key={invitation.id}
                    className={cn(
                      'flex items-center justify-between border-b py-3',
                      isDark ? 'border-white/5' : 'border-black/5',
                      index === 0 &&
                        (isDark
                          ? 'border-t border-t-white/5'
                          : 'border-t border-t-black/5'),
                    )}
                    initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.05,
                      ease: [0.22, 1, 0.36, 1],
                    }}>
                    <div className='flex items-center gap-3'>
                      <RiMailLine
                        className={cn(
                          'h-4 w-4',
                          isDark ? 'text-white/40' : 'text-black/40',
                        )}
                      />
                      <span className='text-[13px]'>{invitation.email}</span>
                      <span
                        className={cn(
                          'text-[11px]',
                          isDark ? 'text-white/40' : 'text-black/40',
                        )}>
                        {invitation.role}
                      </span>
                    </div>
                    <Button
                      onClick={() => cancelInvitation(invitation.id)}
                      variant='secondary'
                      size='small'
                      shape='pill'>
                      Cancel
                    </Button>
                  </m.div>
                ))}
              </div>
            </div>
          )}

          {/* Current members */}
          <div>
            {membersLoading ? (
              <div className='flex items-center gap-2 py-4'>
                <Spinner size='sm' />
                <span
                  className={cn(
                    'text-[12px]',
                    isDark ? 'text-white/50' : 'text-black/50',
                  )}>
                  Loading members...
                </span>
              </div>
            ) : (
              <div className='space-y-0'>
                {members.map((member, index) => (
                  <m.div
                    key={member.id}
                    className={cn(
                      'flex items-center justify-between border-b py-3',
                      isDark ? 'border-white/5' : 'border-black/5',
                      index === 0 &&
                        (isDark
                          ? 'border-t border-t-white/5'
                          : 'border-t border-t-black/5'),
                    )}
                    initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.05,
                      ease: [0.22, 1, 0.36, 1],
                    }}>
                    <div className='flex items-center gap-3'>
                      {member.profile?.avatar &&
                      member.profile.avatar.trim() !== '' ? (
                        <img
                          src={member.profile.avatar}
                          alt=''
                          className='h-7 w-7 rounded-full object-cover'
                        />
                      ) : (
                        <div
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-medium',
                            isDark ? 'bg-white/10' : 'bg-black/5',
                          )}>
                          {member.profile?.first_name?.charAt(0) ||
                            member.profile?.email?.charAt(0)?.toUpperCase() ||
                            '?'}
                        </div>
                      )}
                      <div>
                        <div className='text-[13px]'>
                          {member.profile?.first_name ||
                          member.profile?.last_name
                            ? `${member.profile.first_name || ''} ${member.profile.last_name || ''}`.trim()
                            : member.profile?.email || 'Unknown'}
                        </div>
                        {member.profile?.email &&
                          (member.profile?.first_name ||
                            member.profile?.last_name) && (
                            <div
                              className={cn(
                                'text-[11px]',
                                isDark ? 'text-white/40' : 'text-black/40',
                              )}>
                              {member.profile.email}
                            </div>
                          )}
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      {member.role === 'owner' ? (
                        <span
                          className={cn(
                            'text-[11px] font-medium',
                            isDark ? 'text-white/50' : 'text-black/50',
                          )}>
                          Owner
                        </span>
                      ) : isOwner ? (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(value) =>
                              updateMemberRole(member.user_id, value)
                            }
                            isDark={isDark}
                            variant='ghost'
                            size='small'>
                            <option value='admin'>Admin</option>
                            <option value='developer'>Developer</option>
                            <option value='editor'>Editor</option>
                            <option value='member'>Member</option>
                            <option value='viewer'>Viewer</option>
                          </Select>
                          <m.button
                            onClick={() => removeMember(member.user_id)}
                            className={cn(
                              'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
                              isDark
                                ? 'text-white/40 hover:bg-white/5 hover:text-red-400'
                                : 'text-black/40 hover:bg-black/5 hover:text-red-500',
                            )}
                            whileTap={{ scale: 0.95 }}>
                            <RiDeleteBinLine className='h-4 w-4' />
                          </m.button>
                        </>
                      ) : (
                        <span
                          className={cn(
                            'text-[11px]',
                            isDark ? 'text-white/40' : 'text-black/40',
                          )}>
                          {member.role}
                        </span>
                      )}
                    </div>
                  </m.div>
                ))}
              </div>
            )}
          </div>
        </m.div>

        {/* Transfer ownership section - Only for owner */}
        {isOwner && (
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
              className='mb-2 text-[14px] font-medium'
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.75 }}>
              Transfer ownership
            </m.h2>
            <p
              className={cn(
                'mb-4 text-[12px]',
                isDark ? 'text-white/50' : 'text-black/50',
              )}>
              Transfer this workspace to another member. You will become an
              admin after the transfer.
            </p>
            <div className='flex items-center gap-2'>
              <Select
                value={transferToUserId || ''}
                onValueChange={(value) => setTransferToUserId(value || null)}
                isDark={isDark}
                variant='ghost'
                size='small'
                className='flex-1'>
                <option value=''>Select a member...</option>
                {members
                  .filter(
                    (m) => m.role !== 'owner' && m.user_id !== profile?.id,
                  )
                  .map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.profile?.first_name || member.profile?.last_name
                        ? `${member.profile.first_name || ''} ${member.profile.last_name || ''}`.trim()
                        : member.profile?.email || member.user_id}
                    </option>
                  ))}
              </Select>
              <Button
                onClick={() => setShowTransferModal(true)}
                disabled={!transferToUserId}
                variant='secondary'
                size='small'
                shape='pill'
                iconLeft={<RiArrowRightLine className='h-3 w-3' />}>
                Transfer
              </Button>
            </div>
          </m.div>
        )}

        {/* Danger zone - Only for owner */}
        {isOwner && (
          <m.div
            className={cn(
              'border-t py-6',
              isDark ? 'border-white/5' : 'border-black/5',
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.75,
              ease: [0.22, 1, 0.36, 1],
            }}>
            <m.h2
              className='mb-2 text-[14px] font-medium text-red-500'
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.8 }}>
              Danger zone
            </m.h2>
            <p
              className={cn(
                'mb-4 text-[12px]',
                isDark ? 'text-white/50' : 'text-black/50',
              )}>
              Permanently delete this workspace and all its data. This action
              cannot be undone.
            </p>
            <Button
              onClick={() => setShowDeleteModal(true)}
              variant='destructive'
              size='small'
              shape='pill'
              iconLeft={<RiDeleteBinLine className='h-3 w-3' />}>
              Delete workspace
            </Button>
          </m.div>
        )}

        {/* Leave workspace - Only for non-owners */}
        {!isOwner && ownerId && (
          <m.div
            className={cn(
              'border-t py-6',
              isDark ? 'border-white/5' : 'border-black/5',
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.75,
              ease: [0.22, 1, 0.36, 1],
            }}>
            <m.h2
              className='mb-2 text-[14px] font-medium'
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.8 }}>
              Leave workspace
            </m.h2>
            <p
              className={cn(
                'mb-4 text-[12px]',
                isDark ? 'text-white/50' : 'text-black/50',
              )}>
              Remove yourself from this workspace. You will lose access to all
              workspace files and data.
            </p>
            <Button
              onClick={() => setShowLeaveModal(true)}
              variant='secondary'
              size='small'
              shape='pill'
              iconLeft={<RiLogoutBoxLine className='h-3 w-3' />}>
              Leave workspace
            </Button>
          </m.div>
        )}
      </m.div>

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        isDark={isDark}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          try {
            setIsDeleting(true)
            await deleteWorkspaceCall(undefined as never)
            await refreshWorkspaces()
            // Switch to first available workspace or show empty state
            const remainingWorkspaces = workspaces.filter(
              (ws) => ws.id !== workspaceId,
            )
            if (remainingWorkspaces.length > 0) {
              selectWorkspace(remainingWorkspaces[0].id)
            }
            router.push('/')
          } catch (err) {
            console.error('Failed to delete workspace:', err)
          } finally {
            setIsDeleting(false)
            setShowDeleteModal(false)
          }
        }}
        title='Delete workspace'
        message={`Are you sure you want to delete "${config.name || config.slug}"? This will permanently delete all data including items, conversations, and files. This action cannot be undone.`}
        confirmText='Delete workspace'
        variant='destructive'
        isLoading={isDeleting}
      />

      {/* Transfer confirmation modal */}
      <ConfirmModal
        isOpen={showTransferModal}
        isDark={isDark}
        onClose={() => setShowTransferModal(false)}
        onConfirm={async () => {
          if (!transferToUserId) return
          try {
            setIsTransferring(true)
            await transferWorkspace({ newOwnerId: transferToUserId })
            await refreshWorkspaces()
            refetchMembers()
            setOwnerId(transferToUserId)
            setTransferToUserId(null)
          } catch (err) {
            console.error('Failed to transfer workspace:', err)
          } finally {
            setIsTransferring(false)
            setShowTransferModal(false)
          }
        }}
        title='Transfer ownership'
        message={`Are you sure you want to transfer ownership of "${config.name || config.slug}" to ${members.find((m) => m.user_id === transferToUserId)?.profile?.email || 'this user'}? You will become an admin of this workspace.`}
        confirmText='Transfer ownership'
        isLoading={isTransferring}
      />

      {/* Leave workspace confirmation modal */}
      <ConfirmModal
        isOpen={showLeaveModal}
        isDark={isDark}
        onClose={() => setShowLeaveModal(false)}
        onConfirm={async () => {
          try {
            setIsLeaving(true)
            await leaveWorkspace()

            // Refresh workspaces and navigate away
            await refreshWorkspaces()
            // Switch to first available workspace or show empty state
            const remainingWorkspaces = workspaces.filter(
              (ws) => ws.id !== workspaceId,
            )
            if (remainingWorkspaces.length > 0) {
              selectWorkspace(remainingWorkspaces[0].id)
            }
            router.push('/')
          } catch (err) {
            console.error('Failed to leave workspace:', err)
          } finally {
            setIsLeaving(false)
            setShowLeaveModal(false)
          }
        }}
        title='Leave workspace'
        message={`Are you sure you want to leave "${config.name || config.slug}"? You will lose access to all files and data in this workspace. You can be invited back by an admin.`}
        confirmText='Leave workspace'
        isLoading={isLeaving}
      />
    </m.div>
  )
}
