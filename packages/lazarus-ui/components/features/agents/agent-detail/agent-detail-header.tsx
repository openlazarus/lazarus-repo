'use client'

import {
  RiAlertLine,
  RiCheckboxCircleLine,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiInformationLine,
  RiMailLine,
  RiWhatsappLine,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import { useState } from 'react'

import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { useWhatsAppStatus } from '@/hooks/features/agents/use-whatsapp-status'
import { usePopover } from '@/hooks/ui/interaction/use-popover'
import { cn } from '@/lib/utils'
import type { PhoneStatusInfo } from '@/model'
import { ClaudeCodeAgent } from '@/model/claude-code-agent'

type AgentDetailHeaderProps = {
  agent: ClaudeCodeAgent
  editedAgent: ClaudeCodeAgent
  agentEmail: string
  whatsappPhone?: string | null
  whatsappPhoneStatus?: PhoneStatusInfo
  isEditMode: boolean
  isSaving: boolean
  isDark: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: () => void
  onDelete: () => void
  onUpdateField: (field: string, value: any) => void
}

export function AgentDetailHeader({
  agent,
  editedAgent,
  agentEmail,
  whatsappPhone,
  whatsappPhoneStatus,
  isEditMode,
  isSaving,
  isDark,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onUpdateField,
}: AgentDetailHeaderProps) {
  const isSystemAgent = agent?.metadata?.isSystemAgent
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const status = useWhatsAppStatus(whatsappPhoneStatus)
  const statusPopover = usePopover()

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}>
      <div className='flex items-start justify-between gap-6'>
        <div className='min-w-0 flex-1'>
          {isEditMode ? (
            <Input
              type='text'
              value={editedAgent.name || 'Unnamed Agent'}
              onChange={(e) => onUpdateField('name', e.target.value)}
              placeholder='Agent name...'
              variant='ghost'
              isDark={isDark}
              className='text-[18px] font-semibold leading-snug tracking-[-0.02em]'
            />
          ) : (
            <h1 className='text-[18px] font-semibold leading-snug tracking-[-0.02em]'>
              {editedAgent.name || 'Unnamed Agent'}
            </h1>
          )}

          {/* Contact info */}
          <div className='mt-2 flex flex-col gap-1'>
            <div className='flex items-center gap-1.5'>
              <RiMailLine size={14} className='flex-shrink-0 opacity-40' />
              <span
                className={cn(
                  'font-mono text-[13px]',
                  isDark ? 'text-white/60' : 'text-black/60',
                )}>
                {agentEmail}
              </span>
              <button
                onClick={() => copyToClipboard(agentEmail, 'email')}
                className={cn(
                  'rounded p-0.5 transition-all',
                  isDark ? 'hover:bg-white/10' : 'hover:bg-black/5',
                )}>
                {copiedField === 'email' ? (
                  <RiCheckboxCircleLine className='h-3 w-3 text-green-500' />
                ) : (
                  <RiFileCopyLine className='h-3 w-3 opacity-40' />
                )}
              </button>
            </div>

            <div className='flex items-center gap-1.5'>
              <RiWhatsappLine
                size={14}
                className={cn(
                  'flex-shrink-0',
                  whatsappPhone ? 'text-[#25D366]/70' : 'opacity-25',
                )}
              />
              {whatsappPhone ? (
                <>
                  <span
                    className={cn(
                      'font-mono text-[13px]',
                      isDark ? 'text-white/60' : 'text-black/60',
                    )}>
                    {whatsappPhone}
                  </span>
                  <button
                    onClick={() => copyToClipboard(whatsappPhone, 'phone')}
                    className={cn(
                      'rounded p-0.5 transition-all',
                      isDark ? 'hover:bg-white/10' : 'hover:bg-black/5',
                    )}>
                    {copiedField === 'phone' ? (
                      <RiCheckboxCircleLine className='h-3 w-3 text-green-500' />
                    ) : (
                      <RiFileCopyLine className='h-3 w-3 opacity-40' />
                    )}
                  </button>
                  {status && (
                    <>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
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
                      <div className='relative'>
                        <button
                          ref={statusPopover.triggerRef}
                          onClick={statusPopover.toggle}
                          className={cn(
                            'rounded p-0.5 transition-all',
                            isDark ? 'hover:bg-white/10' : 'hover:bg-black/5',
                          )}>
                          <RiInformationLine className='h-3 w-3 opacity-40' />
                        </button>
                        {statusPopover.isOpen && (
                          <m.div
                            ref={statusPopover.ref}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15 }}
                            className={cn(
                              'absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border p-3 shadow-lg',
                              isDark
                                ? 'border-white/10 bg-[#1c1c1e]'
                                : 'border-black/10 bg-white',
                            )}>
                            <p
                              className={cn(
                                'text-[11px] leading-relaxed',
                                isDark ? 'text-white/60' : 'text-black/60',
                              )}>
                              {status.description}
                            </p>

                            {status.canDo.length > 0 && (
                              <div className='mt-2 space-y-1'>
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

                            {status.cannotDo.length > 0 && (
                              <div className='mt-2 space-y-1'>
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
                                        isDark
                                          ? 'text-white/50'
                                          : 'text-black/50',
                                      )}>
                                      <RiAlertLine className='mt-0.5 h-3 w-3 shrink-0 text-red-400' />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {status.action && (
                              <div
                                className={cn(
                                  'mt-2 flex items-start gap-2 rounded-md p-2 text-[11px]',
                                  isDark
                                    ? status.actionDarkClass
                                    : status.actionLightClass,
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
                          </m.div>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <span
                  className={cn(
                    'text-[13px]',
                    isDark ? 'text-white/30' : 'text-black/30',
                  )}>
                  No phone connected
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
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
          {!isEditMode ? (
            !isSystemAgent && (
              <button
                onClick={onStartEdit}
                className={cn(
                  'rounded-full px-4 py-1.5 text-[12px] font-medium transition-all',
                  isDark
                    ? 'bg-white/10 text-white/70 hover:bg-white/15'
                    : 'bg-black/10 text-black/70 hover:bg-black/15',
                )}>
                Edit
              </button>
            )
          ) : (
            <>
              <Toggle
                checked={editedAgent.isActive ?? true}
                onChange={(checked) => onUpdateField('isActive', checked)}
                size='small'
                variant='gradient'
                isDark={isDark}
              />
              <button
                onClick={onDelete}
                className={cn(
                  'rounded-full p-1.5 transition-all',
                  isDark
                    ? 'text-red-400 hover:bg-red-500/20'
                    : 'text-red-500 hover:bg-red-500/10',
                )}
                title='Delete agent'>
                <RiDeleteBinLine className='h-4 w-4' />
              </button>
              <button
                onClick={onCancelEdit}
                className={cn(
                  'rounded-full px-4 py-1.5 text-[12px] font-medium transition-all',
                  isDark
                    ? 'bg-white/10 text-white/70 hover:bg-white/15'
                    : 'bg-black/10 text-black/70 hover:bg-black/15',
                )}>
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={isSaving}
                className={cn(
                  'rounded-full px-4 py-1.5 text-[12px] font-medium transition-all',
                  isDark
                    ? 'bg-white/10 text-white/70 hover:bg-white/15'
                    : 'bg-black/10 text-black/70 hover:bg-black/15',
                  isSaving && 'opacity-50',
                )}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </m.div>
      </div>
    </m.div>
  )
}
