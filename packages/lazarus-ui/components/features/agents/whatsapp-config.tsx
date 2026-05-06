'use client'

import {
  RiAlertLine,
  RiCheckboxCircleLine,
  RiExternalLinkLine,
  RiFileCopyLine,
  RiInformationLine,
  RiLoader4Line,
  RiPhoneLine,
  RiShieldCheckLine,
  RiWhatsappLine,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { useWorkspace } from '@/hooks/core/use-workspace'
import { useDisconnectWhatsapp } from '@/hooks/features/agents/use-disconnect-whatsapp'
import { useGetWhatsappSetupLink } from '@/hooks/features/agents/use-get-whatsapp-setup-link'
import { useUpdateWhatsappSettings } from '@/hooks/features/agents/use-update-whatsapp-settings'
import { useWhatsAppConfig } from '@/hooks/features/agents/use-whatsapp-config'
import { useWhatsAppStatus } from '@/hooks/features/agents/use-whatsapp-status'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'
import type { WhatsAppConfig } from '@/model'

type WhatsAppConfigPanelProps = {
  agentId: string
  agentName?: string
  isEditMode: boolean
}

export function WhatsAppConfigPanel({
  agentId,
  isEditMode,
}: WhatsAppConfigPanelProps) {
  const { isDark } = useTheme()
  const { selectedWorkspace } = useWorkspace()
  const workspaceId = selectedWorkspace?.id

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [autoTriggerOnMessage, setAutoTriggerOnMessage] = useState(true)
  const [restrictToContacts, setRestrictToContacts] = useState(false)
  const [displayName, setDisplayName] = useState('')

  const { phoneNumber, status: connectionStatus, phoneStatus, loading, mutate: refetchConfig } = useWhatsAppConfig(
    workspaceId ?? '',
    agentId,
  )
  const config: WhatsAppConfig | null = phoneNumber
    ? ({ phoneNumber, phoneStatus, status: connectionStatus, displayName } as any)
    : null
  const status = useWhatsAppStatus(phoneStatus)

  const [getSetupLink] = useGetWhatsappSetupLink(workspaceId ?? '')
  const [disconnectWhatsapp] = useDisconnectWhatsapp(workspaceId ?? '', agentId)
  const [updateSettings] = useUpdateWhatsappSettings(workspaceId ?? '', agentId)

  useEffect(() => {
    if (phoneNumber) setDisplayName((config as any)?.displayName || '')
  }, [phoneNumber])

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleConnectYourNumber = async () => {
    if (!workspaceId) return

    try {
      setSaving(true)
      const data = await getSetupLink({ agentId, provisionPhoneNumber: false })
      if (data?.setupLink) window.open((data.setupLink as any).url, '_blank')
    } catch (err) {
      console.error('Failed to create setup link:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to create setup link',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleGetNewNumber = async () => {
    if (!workspaceId) return

    try {
      setSaving(true)
      const data = await getSetupLink({ agentId, provisionPhoneNumber: true })
      if (data?.setupLink) window.open((data.setupLink as any).url, '_blank')
    } catch (err) {
      console.error('Failed to provision number:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to provision WhatsApp number',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    if (!workspaceId || !config) return

    if (
      !confirm(
        'Are you sure you want to disconnect WhatsApp from this agent? This will stop all WhatsApp messaging.',
      )
    ) {
      return
    }

    try {
      setSaving(true)
      await disconnectWhatsapp({})
      setDisplayName('')
      await refetchConfig()
    } catch (err) {
      console.error('Failed to disconnect WhatsApp:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to disconnect WhatsApp',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!workspaceId) return

    try {
      setSaving(true)
      await updateSettings({
        displayName,
        autoTriggerOnMessage,
        restrictToContacts,
      })
    } catch (err) {
      console.error('Failed to save settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center py-8'>
        <RiLoader4Line className='h-5 w-5 animate-spin opacity-50' />
      </div>
    )
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className='space-y-4'>
      {error && (
        <div
          className={cn(
            'rounded-lg border p-3 text-[12px]',
            'border-red-500/30 bg-red-500/10 text-red-500',
          )}>
          {error}
          <button
            onClick={() => setError(null)}
            className='ml-2 underline hover:no-underline'>
            Dismiss
          </button>
        </div>
      )}

      {!config ? (
        // Not connected - show setup options
        <div className='flex items-center gap-2'>
          <Button
            onClick={handleConnectYourNumber}
            disabled={saving || !isEditMode}
            variant='active'
            size='small'
            loading={saving}
            iconLeft={<RiPhoneLine className='h-3.5 w-3.5' />}>
            Connect Your Number
          </Button>
          <Button
            onClick={handleGetNewNumber}
            disabled={saving || !isEditMode}
            variant='secondary'
            size='small'
            loading={saving}
            iconLeft={<RiExternalLinkLine className='h-3.5 w-3.5' />}>
            Get a New Number
          </Button>
        </div>
      ) : (
        // Connected - show status and settings
        <div className='space-y-4'>
          {/* Connection Status */}
          <div className='flex items-center gap-3'>
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full',
                'bg-[#25D366]/20',
              )}>
              <RiWhatsappLine className='h-4 w-4 text-[#25D366]' />
            </div>
            <div className='flex-1'>
              <div className='flex items-center gap-2'>
                <span
                  className={cn(
                    'font-mono text-[12px]',
                    isDark ? 'text-white' : 'text-black',
                  )}>
                  {config.phoneNumber}
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(config.phoneNumber || '', 'phone')
                  }
                  className={cn(
                    'rounded p-1 transition-all',
                    isDark ? 'hover:bg-white/10' : 'hover:bg-black/5',
                  )}>
                  {copiedField === 'phone' ? (
                    <RiCheckboxCircleLine className='h-3.5 w-3.5 text-green-500' />
                  ) : (
                    <RiFileCopyLine className='h-3.5 w-3.5 opacity-50' />
                  )}
                </button>
              </div>
              <div className='flex items-center gap-2'>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]',
                    config.status === 'connected'
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-yellow-500/20 text-yellow-500',
                  )}>
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      config.status === 'connected'
                        ? 'bg-green-500'
                        : 'bg-yellow-500',
                    )}
                  />
                  {config.status}
                </span>
                {config.qualityRating && (
                  <span
                    className={cn(
                      'text-[10px]',
                      isDark ? 'text-white/40' : 'text-black/40',
                    )}>
                    Quality: {config.qualityRating}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Meta Status Section (edit mode only) */}
          {isEditMode && status && (
            <div
              className={cn(
                'space-y-2 rounded-lg border p-3',
                isDark
                  ? 'border-white/10 bg-white/5'
                  : 'border-black/10 bg-black/5',
              )}>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <span
                    className={cn(
                      'text-[11px] font-medium uppercase tracking-wider',
                      isDark ? 'text-white/50' : 'text-black/50',
                    )}>
                    Meta Status
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                      status.badgeClass,
                    )}>
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        status.dotClass,
                      )}
                    />
                    {status.label}
                  </span>
                </div>
                {config.stale && (
                  <span className='flex items-center gap-1 text-[10px] text-yellow-500'>
                    <RiAlertLine className='h-3 w-3' />
                    Cached
                  </span>
                )}
              </div>

              {/* Verified Name */}
              {config.verifiedName && (
                <div className='flex items-center gap-2'>
                  <RiShieldCheckLine className='h-3.5 w-3.5 text-green-500' />
                  <span
                    className={cn(
                      'text-[12px]',
                      isDark ? 'text-white/80' : 'text-black/80',
                    )}>
                    {config.verifiedName}
                  </span>
                </div>
              )}

              {/* Description */}
              <p
                className={cn(
                  'text-[11px] leading-relaxed',
                  isDark ? 'text-white/60' : 'text-black/60',
                )}>
                {status.description}
              </p>

              {/* Can Do */}
              {status.canDo.length > 0 && (
                <div className='space-y-1'>
                  <span
                    className={cn(
                      'text-[10px] font-medium uppercase tracking-wider',
                      isDark ? 'text-white/40' : 'text-black/40',
                    )}>
                    Can do
                  </span>
                  <ul className='space-y-0.5'>
                    {status.canDo.map((item) => (
                      <li
                        key={item}
                        className='flex items-start gap-1.5 text-[11px] text-green-500'>
                        <RiCheckboxCircleLine className='mt-0.5 h-3 w-3 shrink-0' />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cannot Do */}
              {status.cannotDo.length > 0 && (
                <div className='space-y-1'>
                  <span
                    className={cn(
                      'text-[10px] font-medium uppercase tracking-wider',
                      isDark ? 'text-white/40' : 'text-black/40',
                    )}>
                    Cannot do
                  </span>
                  <ul className='space-y-0.5'>
                    {status.cannotDo.map((item) => (
                      <li
                        key={item}
                        className={cn(
                          'flex items-start gap-1.5 text-[11px]',
                          isDark ? 'text-white/50' : 'text-black/50',
                        )}>
                        <RiAlertLine className='mt-0.5 h-3 w-3 shrink-0 text-red-400' />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Required */}
              {status.action && (
                <div
                  className={cn(
                    'flex items-start gap-2 rounded-md p-2 text-[11px]',
                    isDark ? status.actionDarkClass : status.actionLightClass,
                  )}>
                  <RiInformationLine className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                  <span>
                    {status.action}
                    {status.actionUrl && (
                      <>
                        {' '}
                        <a
                          href={status.actionUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='underline hover:opacity-80'>
                          Open Meta Business Manager &rarr;
                        </a>
                      </>
                    )}
                  </span>
                </div>
              )}

              {/* Template Count */}
              <div className='flex items-center gap-2'>
                <span
                  className={cn(
                    'text-[12px]',
                    isDark ? 'text-white/60' : 'text-black/60',
                  )}>
                  {config.templateCount !== undefined
                    ? `${config.templateCount} template${config.templateCount !== 1 ? 's' : ''} available`
                    : 'Templates: unknown'}
                </span>
              </div>

              {/* Warning if no templates */}
              {config.templateCount === 0 && (
                <div
                  className={cn(
                    'flex items-start gap-2 rounded-md p-2 text-[11px]',
                    'bg-yellow-500/10 text-yellow-500',
                  )}>
                  <RiAlertLine className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                  <span>
                    No message templates available. Create templates in Meta
                    Business Manager to send messages outside the 24-hour
                    window.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          {isEditMode && (
            <div className='space-y-3'>
              <Input
                label='Display Name'
                type='text'
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder='Business name shown to contacts'
                variant='ghost'
                size='small'
                isDark={isDark}
              />

              <Toggle
                checked={autoTriggerOnMessage}
                onChange={setAutoTriggerOnMessage}
                size='small'
                variant='default'
                isDark={isDark}
                label='Auto-trigger on message'
                description='Automatically process incoming WhatsApp messages'
              />

              <Toggle
                checked={restrictToContacts}
                onChange={setRestrictToContacts}
                size='small'
                variant='default'
                isDark={isDark}
                label='Restrict to contacts'
                description='Only respond to messages from known contacts'
              />

              <div className='flex gap-2 pt-2'>
                <Button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  variant='active'
                  size='small'
                  loading={saving}>
                  Save Settings
                </Button>
                <Button
                  onClick={handleDisconnect}
                  disabled={saving}
                  variant='secondary'
                  size='small'>
                  Disconnect
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </m.div>
  )
}
