'use client'

import { RiArrowLeftLine, RiLoader4Line, RiShieldLine } from '@remixicon/react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { MultiSelect } from '@/components/ui/multi-select'
import { Select } from '@/components/ui/select'
import { Toggle } from '@/components/ui/toggle'
import {
  CapabilityConfig,
  DiscordManagementCapability,
  DiscordRole,
  useDiscordSettings,
} from '@/hooks/features/workspace/use-discord-settings'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'

interface DiscordSettingsProps {
  connectionId: string
  onBack: () => void
}

const CAPABILITY_LABELS: Record<
  DiscordManagementCapability,
  { label: string; description: string }
> = {
  channel_create: {
    label: 'Create Channels',
    description: 'Create text, voice, and category channels',
  },
  channel_delete: {
    label: 'Delete Channels',
    description: 'Delete existing channels',
  },
  channel_modify: {
    label: 'Modify Channels',
    description: 'Rename, move, and set channel permissions',
  },
  role_create: {
    label: 'Create Roles',
    description: 'Create new server roles',
  },
  role_delete: {
    label: 'Delete Roles',
    description: 'Delete existing server roles',
  },
  role_modify: {
    label: 'Modify Roles',
    description: 'Rename roles and change their permissions',
  },
  role_assign: {
    label: 'Assign Roles',
    description: 'Add or remove roles from server members',
  },
}

const CAPABILITIES: DiscordManagementCapability[] = [
  'channel_create',
  'channel_delete',
  'channel_modify',
  'role_create',
  'role_delete',
  'role_modify',
  'role_assign',
]

function RolePicker({
  selectedRoleIds,
  availableRoles,
  onChange,
  isDark,
}: {
  selectedRoleIds: string[]
  availableRoles: DiscordRole[]
  onChange: (roleIds: string[]) => void
  isDark: boolean
}) {
  const options = availableRoles.map((role) => ({
    value: role.id,
    label: role.name,
    color: role.color,
  }))

  return (
    <div className='mt-2'>
      <MultiSelect
        options={options}
        value={selectedRoleIds}
        onChange={onChange}
        placeholder='Select roles...'
        isDark={isDark}
        size='small'
      />
    </div>
  )
}

function CapabilityCard({
  capability,
  config,
  roles,
  isDark,
  onUpdate,
}: {
  capability: DiscordManagementCapability
  config: CapabilityConfig | undefined
  roles: DiscordRole[]
  isDark: boolean
  onUpdate: (config: CapabilityConfig) => void
}) {
  const { label, description } = CAPABILITY_LABELS[capability]
  const isEnabled = config?.enabled ?? false
  const allowedBy = config?.allowedBy ?? 'everyone'
  const roleIds = config?.roleIds ?? []

  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        isDark
          ? 'border-white/5 bg-white/[0.02]'
          : 'border-black/5 bg-black/[0.01]',
      )}>
      <div className='flex items-start justify-between gap-3'>
        <div className='flex-1'>
          <div className='text-[13px] font-medium'>{label}</div>
          <div
            className={cn(
              'text-[11px]',
              isDark ? 'text-white/40' : 'text-black/40',
            )}>
            {description}
          </div>
        </div>
        <Toggle
          size='small'
          isDark={isDark}
          checked={isEnabled}
          onChange={(checked) =>
            onUpdate({ enabled: checked, allowedBy, roleIds })
          }
        />
      </div>

      {isEnabled && (
        <div className='mt-3'>
          <div
            className={cn(
              'text-[11px] font-medium',
              isDark ? 'text-white/50' : 'text-black/50',
            )}>
            Who can trigger this?
          </div>
          <Select
            isDark={isDark}
            size='small'
            value={allowedBy}
            onValueChange={(value) =>
              onUpdate({
                enabled: true,
                allowedBy: value as 'everyone' | 'roles',
                roleIds,
              })
            }
            className='mt-1'>
            <option value='everyone'>Everyone</option>
            <option value='roles'>Users with specific roles</option>
          </Select>

          {allowedBy === 'roles' && (
            <RolePicker
              selectedRoleIds={roleIds}
              availableRoles={roles}
              onChange={(newRoleIds) =>
                onUpdate({
                  enabled: true,
                  allowedBy: 'roles',
                  roleIds: newRoleIds,
                })
              }
              isDark={isDark}
            />
          )}
        </div>
      )}
    </div>
  )
}

export function DiscordSettings({
  connectionId,
  onBack,
}: DiscordSettingsProps) {
  const { isDark } = useTheme()
  const { data, roles, channels, loading, saving, error, updateSettings } =
    useDiscordSettings(connectionId)
  const [saveNotification, setSaveNotification] = useState<string | null>(null)
  const [showReauthModal, setShowReauthModal] = useState(false)
  const [reauthReason, setReauthReason] = useState<'capabilities' | 'admin'>(
    'capabilities',
  )

  // Local draft state — changes are only persisted on explicit save
  const [draftInteractionAccess, setDraftInteractionAccess] = useState<{
    allowedBy: 'everyone' | 'roles'
    roleIds?: string[]
  } | null>(null)
  const [draftCapabilities, setDraftCapabilities] = useState<Partial<
    Record<DiscordManagementCapability, CapabilityConfig>
  > | null>(null)
  const [draftChannelWhitelist, setDraftChannelWhitelist] = useState<
    string[] | null
  >(null)
  const [channelMode, setChannelMode] = useState<'all' | 'specific' | null>(
    null,
  )

  // Derive current values: draft if edited, otherwise from server
  const interactionAccess = draftInteractionAccess ??
    data?.settings.interactionAccess ?? { allowedBy: 'everyone' as const }
  const capabilities =
    draftCapabilities ?? data?.settings.managementCapabilities ?? {}

  const [requestAdmin, setRequestAdmin] = useState(false)

  const hasChanges =
    draftInteractionAccess !== null ||
    draftCapabilities !== null ||
    draftChannelWhitelist !== null ||
    channelMode !== null

  const handleReauthorize = () => {
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
    if (!clientId) return
    const permissions = requestAdmin
      ? data?.requiredPermissionsWithAdmin
      : data?.requiredPermissions
    const params = new URLSearchParams({
      client_id: clientId,
      permissions: permissions || '274877975552',
      scope: 'bot applications.commands',
    })
    window.open(
      `https://discord.com/api/oauth2/authorize?${params.toString()}`,
      '_blank',
    )
    setShowReauthModal(false)
  }

  const handleSave = async () => {
    const updates: Record<string, any> = {}
    if (draftInteractionAccess)
      updates.interactionAccess = draftInteractionAccess
    if (draftCapabilities) updates.managementCapabilities = draftCapabilities
    const resolvedMode =
      channelMode ??
      ((data?.settings.channelWhitelist ?? []).length > 0 ? 'specific' : 'all')
    if (channelMode !== null || draftChannelWhitelist !== null) {
      updates.channelWhitelist =
        resolvedMode === 'all'
          ? []
          : (draftChannelWhitelist ?? data?.settings.channelWhitelist ?? [])
    }

    const hasCapabilityChanges = draftCapabilities !== null

    try {
      await updateSettings(updates)
      setDraftInteractionAccess(null)
      setDraftCapabilities(null)
      setDraftChannelWhitelist(null)
      setChannelMode(null)
      setSaveNotification('Settings saved')
      setTimeout(() => setSaveNotification(null), 2000)

      if (hasCapabilityChanges) {
        setReauthReason('capabilities')
        setShowReauthModal(true)
      }
    } catch {
      setSaveNotification('Failed to save')
      setTimeout(() => setSaveNotification(null), 3000)
    }
  }

  if (loading) {
    return (
      <div className='flex items-center gap-2 py-8'>
        <RiLoader4Line className='h-4 w-4 animate-spin text-foreground/40' />
        <span
          className={cn(
            'text-[12px]',
            isDark ? 'text-white/50' : 'text-black/50',
          )}>
          Loading Discord settings...
        </span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className='space-y-3'>
        <Button
          variant='link'
          size='small'
          iconLeft={<RiArrowLeftLine className='h-3.5 w-3.5' />}
          onClick={onBack}>
          Back
        </Button>
        <p
          className={cn(
            'text-[12px]',
            isDark ? 'text-white/50' : 'text-black/50',
          )}>
          {error || 'Discord connection not found'}
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-5'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Button
            variant='link'
            size='small'
            iconLeft={<RiArrowLeftLine className='h-3.5 w-3.5' />}
            onClick={onBack}>
            Back
          </Button>
          <span className='text-[13px] font-medium'>
            Discord Settings — {data.guildName}
          </span>
        </div>
        <div className='flex items-center gap-2'>
          {saveNotification && (
            <span
              className={cn(
                'text-[11px]',
                saveNotification.includes('Failed')
                  ? 'text-red-500'
                  : 'text-green-500',
              )}>
              {saveNotification}
            </span>
          )}
          <Button
            variant='secondary'
            size='small'
            shape='pill'
            disabled={!hasChanges || saving}
            onClick={handleSave}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Interaction Access */}
      <div>
        <div className='mb-2 flex items-center gap-1.5'>
          <RiShieldLine
            className={cn(
              'h-3.5 w-3.5',
              isDark ? 'text-white/50' : 'text-black/50',
            )}
          />
          <span
            className={cn(
              'text-[12px] font-semibold uppercase tracking-wider',
              isDark ? 'text-white/50' : 'text-black/50',
            )}>
            Interaction Access
          </span>
        </div>
        <div
          className={cn(
            'rounded-lg border p-3',
            isDark
              ? 'border-white/5 bg-white/[0.02]'
              : 'border-black/5 bg-black/[0.01]',
          )}>
          <div className='text-[13px] font-medium'>
            Who can interact with the agent?
          </div>
          <div
            className={cn(
              'mb-2 text-[11px]',
              isDark ? 'text-white/40' : 'text-black/40',
            )}>
            Controls which Discord users can mention or DM the bot to trigger
            agent executions
          </div>
          <Select
            isDark={isDark}
            size='small'
            value={interactionAccess.allowedBy}
            onValueChange={(value) =>
              setDraftInteractionAccess({
                allowedBy: value as 'everyone' | 'roles',
                roleIds: interactionAccess.roleIds ?? [],
              })
            }>
            <option value='everyone'>Everyone</option>
            <option value='roles'>Users with specific roles</option>
          </Select>

          {interactionAccess.allowedBy === 'roles' && (
            <RolePicker
              selectedRoleIds={interactionAccess.roleIds ?? []}
              availableRoles={roles}
              onChange={(roleIds) =>
                setDraftInteractionAccess({ allowedBy: 'roles', roleIds })
              }
              isDark={isDark}
            />
          )}
        </div>
      </div>

      {/* Channel Restriction */}
      {(() => {
        const serverWhitelist = data?.settings.channelWhitelist ?? []
        const currentWhitelist = draftChannelWhitelist ?? serverWhitelist
        const currentMode =
          channelMode ?? (serverWhitelist.length > 0 ? 'specific' : 'all')
        const channelOptions = channels.map((ch) => ({
          value: ch.id,
          label: ch.parentName
            ? `${ch.parentName} > #${ch.name}`
            : `#${ch.name}`,
        }))

        return (
          <div>
            <div
              className={cn(
                'mb-2 text-[12px] font-semibold uppercase tracking-wider',
                isDark ? 'text-white/50' : 'text-black/50',
              )}>
              Channel Restriction
            </div>
            <div
              className={cn(
                'rounded-lg border p-3',
                isDark
                  ? 'border-white/5 bg-white/[0.02]'
                  : 'border-black/5 bg-black/[0.01]',
              )}>
              <div className='text-[13px] font-medium'>
                Which channels can the bot respond in?
              </div>
              <div
                className={cn(
                  'mb-2 text-[11px]',
                  isDark ? 'text-white/40' : 'text-black/40',
                )}>
                By default the bot responds in all channels. Select specific
                channels to restrict it.
              </div>
              <Select
                isDark={isDark}
                size='small'
                value={currentMode}
                onValueChange={(value) => {
                  setChannelMode(value as 'all' | 'specific')
                  if (value === 'all') {
                    setDraftChannelWhitelist([])
                  }
                }}>
                <option value='all'>All channels</option>
                <option value='specific'>Specific channels only</option>
              </Select>

              {currentMode === 'specific' && (
                <MultiSelect
                  options={channelOptions}
                  value={currentWhitelist}
                  onChange={setDraftChannelWhitelist}
                  placeholder='Select channels...'
                  isDark={isDark}
                  size='small'
                  className='mt-2'
                />
              )}
            </div>
          </div>
        )
      })()}

      {/* Default Capabilities (info only) */}
      <div>
        <div
          className={cn(
            'mb-2 text-[12px] font-semibold uppercase tracking-wider',
            isDark ? 'text-white/50' : 'text-black/50',
          )}>
          Default Capabilities
        </div>
        <div
          className={cn(
            'rounded-lg border p-3',
            isDark
              ? 'border-white/5 bg-white/[0.02]'
              : 'border-black/5 bg-black/[0.01]',
          )}>
          <div className='flex flex-wrap gap-2'>
            {[
              'Read channels',
              'Send messages',
              'Read history',
              'Search messages',
            ].map((cap) => (
              <span
                key={cap}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px]',
                  isDark
                    ? 'bg-white/5 text-white/60'
                    : 'bg-black/5 text-black/60',
                )}>
                {cap}
              </span>
            ))}
          </div>
          <div
            className={cn(
              'mt-2 text-[11px]',
              isDark ? 'text-white/30' : 'text-black/30',
            )}>
            These are always available and cannot be disabled.
          </div>
        </div>
      </div>

      {/* Management Capabilities */}
      <div>
        <div
          className={cn(
            'mb-2 text-[12px] font-semibold uppercase tracking-wider',
            isDark ? 'text-white/50' : 'text-black/50',
          )}>
          Management Capabilities
        </div>
        <div className='space-y-2'>
          {CAPABILITIES.map((cap) => (
            <CapabilityCard
              key={cap}
              capability={cap}
              config={capabilities[cap]}
              roles={roles}
              isDark={isDark}
              onUpdate={(config) =>
                setDraftCapabilities({
                  ...capabilities,
                  [cap]: config,
                })
              }
            />
          ))}

          {/* Administrator toggle */}
          <div
            className={cn(
              'rounded-lg border p-3',
              isDark
                ? 'border-white/5 bg-white/[0.02]'
                : 'border-black/5 bg-black/[0.01]',
            )}>
            <div className='flex items-start justify-between gap-3'>
              <div className='flex-1'>
                <div className='text-[13px] font-medium'>Administrator</div>
                <div
                  className={cn(
                    'text-[11px]',
                    isDark ? 'text-white/40' : 'text-black/40',
                  )}>
                  Grants full Discord access. Prevents the bot from being locked
                  out of channels it manages.
                </div>
              </div>
              <Toggle
                size='small'
                isDark={isDark}
                checked={requestAdmin}
                onChange={(checked) => {
                  setRequestAdmin(checked)
                  if (checked) {
                    setReauthReason('admin')
                    setShowReauthModal(true)
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Re-authorization modal */}
      <Modal
        isOpen={showReauthModal}
        isDark={isDark}
        onClose={() => {
          setShowReauthModal(false)
          setRequestAdmin(false)
        }}
        size='sm'>
        <div className='space-y-4 p-5'>
          <div>
            <h3 className='text-[14px] font-semibold'>
              Re-authorize bot permissions
            </h3>
            <p
              className={cn(
                'mt-1 text-[12px]',
                isDark ? 'text-white/50' : 'text-black/50',
              )}>
              {reauthReason === 'admin'
                ? 'To grant administrator access, the bot needs to be re-authorized with elevated permissions. Your existing connection and settings will be preserved.'
                : 'To use the management capabilities you enabled, the bot needs updated permissions in this Discord server. Your existing connection and settings will be preserved.'}
            </p>
          </div>

          <div className='flex justify-end gap-2'>
            <Button
              variant='link'
              size='small'
              onClick={() => {
                setShowReauthModal(false)
                setRequestAdmin(false)
              }}>
              Later
            </Button>
            <Button
              variant='secondary'
              size='small'
              shape='pill'
              onClick={handleReauthorize}>
              Re-authorize now
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
