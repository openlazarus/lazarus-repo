'use client'

import { RiCloseLine, RiLoader4Line, RiMailLine } from '@remixicon/react'
import * as m from 'motion/react-m'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { useWorkspace } from '@/hooks/core/use-workspace'
import { useGetAgentEmailAllowlist } from '@/hooks/features/agents/use-get-agent-email-allowlist'
import { useUpdateAgentEmailAllowlist } from '@/hooks/features/agents/use-update-agent-email-allowlist'
import { useUpdateAgentEmailRestriction } from '@/hooks/features/agents/use-update-agent-email-restriction'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'

type EmailConfigPanelProps = {
  agentId: string
  isEditMode: boolean
}

export function EmailConfigPanel({
  agentId,
  isEditMode,
}: EmailConfigPanelProps) {
  const { isDark } = useTheme()
  const { selectedWorkspace } = useWorkspace()
  const workspaceId = selectedWorkspace?.id

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newEmail, setNewEmail] = useState('')

  const { data: emailData, loading } = useGetAgentEmailAllowlist(
    workspaceId ?? '',
    agentId,
  )
  const [updateRestriction] = useUpdateAgentEmailRestriction(
    workspaceId ?? '',
    agentId,
  )
  const [updateAllowlist] = useUpdateAgentEmailAllowlist(
    workspaceId ?? '',
    agentId,
  )

  const [restrictToMembers, setRestrictToMembers] = useState(true)
  const [allowedEmails, setAllowedEmails] = useState<string[]>([])

  useEffect(() => {
    if (emailData) {
      setAllowedEmails((emailData as any).emails ?? [])
      setRestrictToMembers(
        (emailData as any).restrictToWorkspaceMembers ?? true,
      )
    }
  }, [emailData])

  const handleAddEmail = () => {
    const email = newEmail.trim().toLowerCase()
    if (!email) return

    // Basic validation: must look like an email or wildcard pattern
    const emailPattern = /^(\*|[a-zA-Z0-9._%+-]+)@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailPattern.test(email)) {
      setError('Invalid format. Use user@example.com or *@domain.com')
      return
    }

    if (allowedEmails.includes(email)) {
      setError('This address is already in the list')
      return
    }

    setAllowedEmails([...allowedEmails, email])
    setNewEmail('')
    setError(null)
  }

  const handleRemoveEmail = (email: string) => {
    setAllowedEmails(allowedEmails.filter((e) => e !== email))
  }

  const handleSave = async () => {
    if (!workspaceId) return

    try {
      setSaving(true)
      setError(null)

      await updateRestriction({ enabled: restrictToMembers })
      await updateAllowlist({ emails: allowedEmails })
    } catch (err) {
      console.error('Failed to save email config:', err)
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

      <Toggle
        checked={restrictToMembers}
        onChange={setRestrictToMembers}
        size='small'
        variant='default'
        isDark={isDark}
        label='Restrict to workspace members'
        description='Only allow sending/receiving emails with workspace members and allowed addresses'
      />

      {restrictToMembers && (
        <m.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className='space-y-3'>
          <div className='flex gap-2'>
            <Input
              type='text'
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddEmail()
                }
              }}
              placeholder='user@example.com or *@company.com'
              variant='ghost'
              size='small'
              isDark={isDark}
              className='flex-1'
            />
            <Button
              onClick={handleAddEmail}
              variant='secondary'
              size='small'
              disabled={!newEmail.trim()}>
              Add
            </Button>
          </div>

          <p
            className={cn(
              'text-[11px]',
              isDark ? 'text-white/40' : 'text-black/40',
            )}>
            Add specific emails (user@example.com) or domain wildcards
            (*@company.com)
          </p>

          {allowedEmails.length > 0 && (
            <div className='flex flex-wrap gap-2'>
              {allowedEmails.map((email) => (
                <div
                  key={email}
                  className={cn(
                    'group flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] transition-all',
                    isDark
                      ? 'border-white/10 bg-white/5 text-white/70'
                      : 'border-black/10 bg-black/5 text-black/70',
                  )}>
                  <RiMailLine className='h-3 w-3 opacity-50' />
                  <span>{email}</span>
                  <button
                    onClick={() => handleRemoveEmail(email)}
                    className={cn(
                      'rounded-full p-0.5 transition-all',
                      isDark ? 'hover:bg-white/10' : 'hover:bg-black/10',
                    )}>
                    <RiCloseLine className='h-3 w-3 opacity-50 hover:opacity-100' />
                  </button>
                </div>
              ))}
            </div>
          )}
        </m.div>
      )}

      <div className='pt-2'>
        <Button
          onClick={handleSave}
          disabled={saving}
          variant='active'
          size='small'
          loading={saving}>
          Save Settings
        </Button>
      </div>
    </m.div>
  )
}
