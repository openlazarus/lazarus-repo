'use client'

import * as m from 'motion/react-m'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { LexicalEditor } from '@/components/ui/lexical/lexical-editor'
import { EditorModePlugin } from '@/components/ui/lexical/plugins/editor-mode-plugin'
import '@/components/ui/lexical/xcode-theme.css'
import { CreateModal } from '@/components/ui/modal'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useWorkspace } from '@/hooks/core/use-workspace'
import { useCreateTrigger } from '@/hooks/features/agents/use-create-trigger'
import { useUpdateTrigger } from '@/hooks/features/agents/use-update-trigger'
import { useCopyToClipboard } from '@/hooks/ui/interaction/use-copy-to-clipboard'
import { useTheme } from '@/hooks/ui/use-theme'
import {
  getDefaultTimezone,
  getGroupedTimezones,
  getTimezoneAbbreviation,
} from '@/lib/timezone-utils'
import { cn } from '@/lib/utils'
import { buildAgentTriggerWebhookUrl } from '@/lib/webhook-url'

import type { Trigger } from './trigger-list'

type RepeatType =
  | 'every-30min'
  | 'every-hour'
  | 'daily'
  | 'weekdays'
  | 'specific-days'
  | 'monthly'
  | 'once'

const DAYS = [
  { value: 1, label: 'M' },
  { value: 2, label: 'T' },
  { value: 3, label: 'W' },
  { value: 4, label: 'T' },
  { value: 5, label: 'F' },
  { value: 6, label: 'S' },
  { value: 0, label: 'S' },
]

const MONTH_DAYS = [
  { value: '1', label: '1st' },
  { value: '2', label: '2nd' },
  { value: '3', label: '3rd' },
  { value: '5', label: '5th' },
  { value: '10', label: '10th' },
  { value: '15', label: '15th' },
  { value: '20', label: '20th' },
  { value: '25', label: '25th' },
  { value: 'L', label: 'Last' },
]

const TRIGGER_TYPES = [
  { id: 'scheduled' as const, label: 'Schedule' },
  { id: 'webhook' as const, label: 'App Signal' },
  { id: 'whatsapp' as const, label: 'WhatsApp' },
]

const REPEAT_OPTIONS = [
  { id: 'every-30min' as const, label: '30 min' },
  { id: 'every-hour' as const, label: 'Hourly' },
  { id: 'daily' as const, label: 'Daily' },
  { id: 'weekdays' as const, label: 'Weekdays' },
  { id: 'specific-days' as const, label: 'Custom' },
  { id: 'monthly' as const, label: 'Monthly' },
  { id: 'once' as const, label: 'Once' },
]

function buildCron(
  repeatType: RepeatType,
  time: string,
  selectedDays: number[],
  monthDay: string,
  timezone?: string,
): { type: string; expression: string; timezone: string } {
  const [hours, minutes] = time.split(':')
  const tz = timezone || getDefaultTimezone()

  switch (repeatType) {
    case 'every-30min':
      return { type: 'cron', expression: '*/30 * * * *', timezone: tz }
    case 'every-hour':
      return { type: 'cron', expression: '0 * * * *', timezone: tz }
    case 'daily':
      return {
        type: 'cron',
        expression: `${minutes} ${hours} * * *`,
        timezone: tz,
      }
    case 'weekdays':
      return {
        type: 'cron',
        expression: `${minutes} ${hours} * * 1-5`,
        timezone: tz,
      }
    case 'specific-days': {
      const dayStr = selectedDays.sort().join(',')
      return {
        type: 'cron',
        expression: `${minutes} ${hours} * * ${dayStr || '*'}`,
        timezone: tz,
      }
    }
    case 'monthly':
      return {
        type: 'cron',
        expression: `${minutes} ${hours} ${monthDay} * *`,
        timezone: tz,
      }
    default:
      return {
        type: 'cron',
        expression: `${minutes} ${hours} * * *`,
        timezone: tz,
      }
  }
}

function parseExistingTrigger(trigger?: Trigger): {
  repeatType: RepeatType
  time: string
  selectedDays: number[]
  monthDay: string
  onceDateTime: string
  timezone: string
} {
  const defaults = {
    repeatType: 'daily' as RepeatType,
    time: '09:00',
    selectedDays: [] as number[],
    monthDay: '1',
    onceDateTime: '',
    timezone: trigger?.config?.schedule?.timezone || getDefaultTimezone(),
  }

  if (!trigger?.config?.schedule) return defaults

  const { type, expression } = trigger.config.schedule

  if (type === 'once') {
    return { ...defaults, repeatType: 'once', onceDateTime: expression }
  }

  if (type === 'cron' || type === 'interval') {
    if (expression === '*/30 * * * *') {
      return { ...defaults, repeatType: 'every-30min' }
    }
    if (expression === '0 * * * *') {
      return { ...defaults, repeatType: 'every-hour' }
    }

    const parts = expression?.split(' ')
    if (parts?.length === 5) {
      const [min, hour, dayOfMonth, , dayOfWeek] = parts
      const time = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`

      if (dayOfWeek === '1-5') {
        return { ...defaults, repeatType: 'weekdays', time }
      }
      if (dayOfMonth !== '*') {
        return {
          ...defaults,
          repeatType: 'monthly',
          time,
          monthDay: dayOfMonth,
        }
      }
      if (dayOfWeek !== '*') {
        const days = dayOfWeek.split(',').map(Number)
        return {
          ...defaults,
          repeatType: 'specific-days',
          time,
          selectedDays: days,
        }
      }
      return { ...defaults, repeatType: 'daily', time }
    }
  }

  return defaults
}

function formatScheduleLabel(
  repeatType: RepeatType,
  time: string,
  selectedDays: number[],
  monthDay: string,
  onceDateTime: string,
  timezone?: string,
): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const tzAbbr = timezone ? getTimezoneAbbreviation(timezone) : ''
  const tzSuffix = tzAbbr ? ` (${tzAbbr})` : ''

  switch (repeatType) {
    case 'every-30min':
      return `Every 30 minutes${tzSuffix}`
    case 'every-hour':
      return `Every hour${tzSuffix}`
    case 'daily':
      return `Every day at ${time}${tzSuffix}`
    case 'weekdays':
      return `Weekdays at ${time}${tzSuffix}`
    case 'specific-days': {
      const names = selectedDays.sort().map((d) => dayNames[d])
      return `${names.join(', ')} at ${time}${tzSuffix}`
    }
    case 'monthly':
      return `Monthly on the ${monthDay === 'L' ? 'last day' : monthDay} at ${time}${tzSuffix}`
    case 'once':
      return `Once at ${onceDateTime || 'scheduled time'}${tzSuffix}`
    default:
      return 'Scheduled task'
  }
}

const groupedTimezones = getGroupedTimezones()

// ── Main Modal ───────────────────────────────────────────────

interface CreateTriggerModalProps {
  agentId: string
  onClose: () => void
  onSuccess: (created?: { id: string; type: string }) => void
  trigger?: Trigger
}

export function CreateTriggerModal({
  agentId,
  onClose,
  onSuccess,
  trigger,
}: CreateTriggerModalProps) {
  const { isDark } = useTheme()
  const { selectedWorkspace } = useWorkspace()
  const workspaceId = selectedWorkspace?.id
  const [saving, setSaving] = useState(false)
  const { isCopied, copyToClipboard } = useCopyToClipboard()
  const [createTrigger] = useCreateTrigger(workspaceId ?? '', agentId)
  const [updateTrigger] = useUpdateTrigger(
    workspaceId ?? '',
    agentId,
    trigger?.id ?? '',
  )

  const isEditMode = !!trigger

  const getInitialTriggerType = (): 'scheduled' | 'webhook' | 'whatsapp' => {
    if (!trigger) return 'scheduled'
    if (trigger.type === 'whatsapp') return 'whatsapp'
    if (trigger.type === 'webhook') return 'webhook'
    return 'scheduled'
  }

  const [triggerType, setTriggerType] = useState<
    'scheduled' | 'webhook' | 'whatsapp'
  >(getInitialTriggerType())

  const parsed = parseExistingTrigger(trigger)

  const [repeatType, setRepeatType] = useState<RepeatType>(parsed.repeatType)
  const [scheduleTime, setScheduleTime] = useState(parsed.time)
  const [selectedDays, setSelectedDays] = useState<number[]>(
    parsed.selectedDays,
  )
  const [monthDay, setMonthDay] = useState(parsed.monthDay)
  const [onceDateTime, setOnceDateTime] = useState(parsed.onceDateTime)
  const [timezone, setTimezone] = useState(parsed.timezone)

  const [webhookSecret, setWebhookSecret] = useState(
    trigger?.config?.secret || '',
  )
  const [signatureHeader, setSignatureHeader] = useState(
    trigger?.config?.signatureHeader || '',
  )

  const [whatsappFromNumbers, setWhatsappFromNumbers] = useState(
    trigger?.config?.conditions?.fromNumbers?.join(', ') || '',
  )
  const [whatsappKeywords, setWhatsappKeywords] = useState(
    trigger?.config?.conditions?.containsKeywords?.join(', ') || '',
  )
  const [whatsappMessageTypes, setWhatsappMessageTypes] = useState<string[]>(
    trigger?.config?.conditions?.messageTypes || ['text'],
  )

  const [taskTitle, setTaskTitle] = useState(trigger?.name || '')
  const [taskDescription, setTaskDescription] = useState(
    trigger?.config?.task || '',
  )

  const showTimePicker =
    repeatType !== 'every-30min' &&
    repeatType !== 'every-hour' &&
    repeatType !== 'once'

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!workspaceId) throw new Error('No workspace selected')

      const config: any = {
        task: taskDescription || 'Execute agent task',
      }

      if (triggerType === 'scheduled') {
        if (repeatType === 'once') {
          config.schedule = { type: 'once', expression: onceDateTime, timezone }
        } else {
          config.schedule = buildCron(
            repeatType,
            scheduleTime,
            selectedDays,
            monthDay,
            timezone,
          )
        }
      } else if (triggerType === 'webhook') {
        config.secret = webhookSecret || undefined
        config.signatureHeader = signatureHeader || undefined
      } else if (triggerType === 'whatsapp') {
        config.conditions = {
          fromNumbers: whatsappFromNumbers
            ? whatsappFromNumbers
                .split(',')
                .map((n: string) => n.trim())
                .filter(Boolean)
            : undefined,
          containsKeywords: whatsappKeywords
            ? whatsappKeywords
                .split(',')
                .map((k: string) => k.trim())
                .filter(Boolean)
            : undefined,
          messageTypes:
            whatsappMessageTypes.length > 0 ? whatsappMessageTypes : undefined,
        }
      }

      const fallbackName =
        triggerType === 'webhook'
          ? 'Webhook trigger'
          : triggerType === 'whatsapp'
            ? 'WhatsApp trigger'
            : formatScheduleLabel(
                repeatType,
                scheduleTime,
                selectedDays,
                monthDay,
                onceDateTime,
                timezone,
              )
      const triggerName = taskTitle.trim() || fallbackName

      const payload = {
        type: triggerType,
        name: triggerName,
        config,
        enabled: true,
      }

      if (isEditMode && trigger) {
        await updateTrigger(payload as never)
        onSuccess()
      } else {
        const result = await createTrigger(payload)
        onSuccess(
          result?.trigger
            ? { id: result.trigger.id, type: payload.type }
            : undefined,
        )
      }

      onClose()
    } catch (error) {
      console.error(
        `Failed to ${isEditMode ? 'update' : 'create'} trigger:`,
        error,
      )
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Failed to ${isEditMode ? 'update' : 'create'} trigger`
      alert(`${errorMessage}. Please check the console for details.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <CreateModal
      isOpen={true}
      isDark={isDark}
      onClose={onClose}
      title={isEditMode ? 'Edit automation' : 'New automation'}
      size='xl'>
      <form onSubmit={handleSubmit} className='space-y-4'>
        {/* Top row — Title (left) + Trigger config (right) */}
        <div className='flex items-start gap-4'>
          {/* Title input */}
          <input
            type='text'
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder='Task title...'
            className={cn(
              'flex-1 rounded-lg border px-3 py-2 text-[14px] font-medium',
              'placeholder:font-normal focus:outline-none',
              'ring-2 ring-transparent transition-all duration-200',
              isDark
                ? 'border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/30 focus:border-white/[0.15] focus:ring-[#0098FC]/30'
                : 'border-black/[0.06] bg-black/[0.015] text-[#1a1a1a] placeholder:text-black/30 focus:border-black/[0.12] focus:ring-[#0098FC]/20',
            )}
          />

          {/* Trigger type + schedule — right side */}
          <div className='flex shrink-0 flex-col items-end gap-2'>
            <SegmentedControl
              options={TRIGGER_TYPES}
              value={triggerType}
              onChange={setTriggerType}
              isDark={isDark}
            />

            {/* Schedule config — compact */}
            {triggerType === 'scheduled' && (
              <m.div
                className='flex flex-col items-end gap-2'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
                {/* Repeat pills */}
                <div className='flex flex-wrap justify-end gap-1'>
                  {REPEAT_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type='button'
                      onClick={() => setRepeatType(option.id)}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11px] font-medium transition-all',
                        repeatType === option.id
                          ? 'bg-[#0098FC] text-white'
                          : isDark
                            ? 'bg-white/[0.06] text-white/50 hover:bg-white/[0.1] hover:text-white/70'
                            : 'bg-black/[0.04] text-black/40 hover:bg-black/[0.07] hover:text-black/60',
                      )}>
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Sub-pickers */}
                {repeatType === 'specific-days' && (
                  <m.div
                    className='flex items-center gap-1.5'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}>
                    {DAYS.map((day, index) => (
                      <button
                        key={`${day.value}-${index}`}
                        type='button'
                        onClick={() => toggleDay(day.value)}
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-all',
                          selectedDays.includes(day.value)
                            ? 'bg-[#0098FC] text-white'
                            : isDark
                              ? 'bg-white/[0.06] text-white/40 hover:bg-white/[0.1]'
                              : 'bg-black/[0.04] text-black/35 hover:bg-black/[0.07]',
                        )}>
                        {day.label}
                      </button>
                    ))}
                  </m.div>
                )}

                {repeatType === 'monthly' && (
                  <m.div
                    className='flex flex-wrap justify-end gap-1'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}>
                    {MONTH_DAYS.map((option) => (
                      <button
                        key={option.value}
                        type='button'
                        onClick={() => setMonthDay(option.value)}
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11px] font-medium transition-all',
                          monthDay === option.value
                            ? 'bg-[#0098FC] text-white'
                            : isDark
                              ? 'bg-white/[0.06] text-white/50 hover:bg-white/[0.1]'
                              : 'bg-black/[0.04] text-black/40 hover:bg-black/[0.07]',
                        )}>
                        {option.label}
                      </button>
                    ))}
                  </m.div>
                )}

                {repeatType === 'once' && (
                  <input
                    type='datetime-local'
                    value={onceDateTime}
                    onChange={(e) => setOnceDateTime(e.target.value)}
                    className={cn(
                      'rounded-lg border px-2.5 py-1.5 text-[13px] font-medium tabular-nums',
                      'focus:outline-none focus:ring-2 focus:ring-[#0098FC]/30',
                      'transition-all duration-200',
                      isDark
                        ? 'border-white/[0.08] bg-white/[0.03] text-white'
                        : 'border-black/[0.06] bg-black/[0.015] text-[#1a1a1a]',
                    )}
                  />
                )}

                {/* Time picker */}
                {showTimePicker && (
                  <m.div
                    className='flex items-center gap-2'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}>
                    <span
                      className={cn(
                        'text-[12px]',
                        isDark ? 'text-white/30' : 'text-black/30',
                      )}>
                      at
                    </span>
                    <input
                      type='time'
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className={cn(
                        'rounded-lg border px-2.5 py-1.5 text-[13px] font-medium tabular-nums',
                        'focus:outline-none focus:ring-2 focus:ring-[#0098FC]/30',
                        'transition-all duration-200',
                        isDark
                          ? 'border-white/[0.08] bg-white/[0.03] text-white'
                          : 'border-black/[0.06] bg-black/[0.015] text-[#1a1a1a]',
                      )}
                    />
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className={cn(
                        'rounded-lg border px-2.5 py-1.5 text-[13px] font-medium',
                        'focus:outline-none focus:ring-2 focus:ring-[#0098FC]/30',
                        'transition-all duration-200',
                        isDark
                          ? 'border-white/[0.08] bg-white/[0.03] text-white'
                          : 'border-black/[0.06] bg-black/[0.015] text-[#1a1a1a]',
                      )}>
                      {Object.entries(groupedTimezones).map(
                        ([group, options]) => (
                          <optgroup key={group} label={group}>
                            {options.map((tz) => (
                              <option key={tz.value} value={tz.value}>
                                {tz.label}
                              </option>
                            ))}
                          </optgroup>
                        ),
                      )}
                    </select>
                  </m.div>
                )}
                {repeatType === 'once' && (
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className={cn(
                      'rounded-lg border px-2.5 py-1.5 text-[13px] font-medium',
                      'focus:outline-none focus:ring-2 focus:ring-[#0098FC]/30',
                      'transition-all duration-200',
                      isDark
                        ? 'border-white/[0.08] bg-white/[0.03] text-white'
                        : 'border-black/[0.06] bg-black/[0.015] text-[#1a1a1a]',
                    )}>
                    {Object.entries(groupedTimezones).map(
                      ([group, options]) => (
                        <optgroup key={group} label={group}>
                          {options.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </optgroup>
                      ),
                    )}
                  </select>
                )}
              </m.div>
            )}

            {/* ── Webhook config ── */}
            {triggerType === 'webhook' && (
              <m.div
                className='w-full space-y-2'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
                <input
                  type='text'
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder='Secret key (optional)'
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-[13px] font-medium',
                    'placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#0098FC]/30',
                    'transition-all duration-200',
                    isDark
                      ? 'border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/25'
                      : 'border-black/[0.06] bg-black/[0.015] text-[#1a1a1a] placeholder:text-black/25',
                  )}
                />
                {webhookSecret && (
                  <input
                    type='text'
                    value={signatureHeader}
                    onChange={(e) => setSignatureHeader(e.target.value)}
                    placeholder='Signature header (default: x-webhook-signature)'
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-[13px] font-medium',
                      'placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#0098FC]/30',
                      'transition-all duration-200',
                      isDark
                        ? 'border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/25'
                        : 'border-black/[0.06] bg-black/[0.015] text-[#1a1a1a] placeholder:text-black/25',
                    )}
                  />
                )}
                <div
                  className={cn(
                    'rounded-lg px-3 py-2',
                    isDark ? 'bg-white/[0.03]' : 'bg-black/[0.02]',
                  )}>
                  {isEditMode && trigger ? (
                    <div className='space-y-1'>
                      <p
                        className={cn(
                          'text-[11px]',
                          isDark ? 'text-white/40' : 'text-black/35',
                        )}>
                        Webhook URL:
                      </p>
                      <button
                        type='button'
                        onClick={() =>
                          copyToClipboard(
                            buildAgentTriggerWebhookUrl(
                              workspaceId ?? '',
                              agentId,
                              trigger.id,
                            ),
                          )
                        }
                        className={cn(
                          'block w-full cursor-pointer break-all rounded px-1.5 py-1 text-left font-mono text-[10px] transition-colors',
                          isDark
                            ? 'bg-white/[0.06] text-white/60 hover:bg-white/[0.1]'
                            : 'bg-black/[0.04] text-black/50 hover:bg-black/[0.07]',
                        )}>
                        {buildAgentTriggerWebhookUrl(
                          workspaceId ?? '',
                          agentId,
                          trigger.id,
                        )}
                        <span className='ml-1 text-[9px] opacity-50'>
                          {isCopied ? '(copied!)' : '(click to copy)'}
                        </span>
                      </button>
                      {webhookSecret && (
                        <p
                          className={cn(
                            'text-[10px]',
                            isDark ? 'text-white/30' : 'text-black/25',
                          )}>
                          Sign requests with header:{' '}
                          <code className='font-mono'>
                            x-webhook-signature: sha256=&lt;hmac&gt;
                          </code>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p
                      className={cn(
                        'text-[11px] leading-relaxed',
                        isDark ? 'text-white/40' : 'text-black/35',
                      )}>
                      Webhook URL will be available after saving.
                    </p>
                  )}
                </div>
              </m.div>
            )}

            {/* ── WhatsApp config ── */}
            {triggerType === 'whatsapp' && (
              <m.div
                className='w-full space-y-2'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
                <input
                  type='text'
                  value={whatsappFromNumbers}
                  onChange={(e) => setWhatsappFromNumbers(e.target.value)}
                  placeholder='From numbers — e.g. +1234, +5678'
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-[13px] font-medium',
                    'placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#0098FC]/30',
                    'transition-all duration-200',
                    isDark
                      ? 'border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/25'
                      : 'border-black/[0.06] bg-black/[0.015] text-[#1a1a1a] placeholder:text-black/25',
                  )}
                />
                <input
                  type='text'
                  value={whatsappKeywords}
                  onChange={(e) => setWhatsappKeywords(e.target.value)}
                  placeholder='Keywords — e.g. help, support'
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-[13px] font-medium',
                    'placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#0098FC]/30',
                    'transition-all duration-200',
                    isDark
                      ? 'border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/25'
                      : 'border-black/[0.06] bg-black/[0.015] text-[#1a1a1a] placeholder:text-black/25',
                  )}
                />
                <div className='flex flex-wrap gap-1'>
                  {['text', 'image', 'document', 'audio', 'video'].map(
                    (type) => (
                      <button
                        key={type}
                        type='button'
                        onClick={() => {
                          setWhatsappMessageTypes((prev) =>
                            prev.includes(type)
                              ? prev.filter((t) => t !== type)
                              : [...prev, type],
                          )
                        }}
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition-all',
                          whatsappMessageTypes.includes(type)
                            ? 'bg-[#0098FC] text-white'
                            : isDark
                              ? 'bg-white/[0.06] text-white/50 hover:bg-white/[0.1]'
                              : 'bg-black/[0.04] text-black/40 hover:bg-black/[0.07]',
                        )}>
                        {type}
                      </button>
                    ),
                  )}
                </div>
              </m.div>
            )}
          </div>
        </div>

        {/* Task description — Lexical markdown editor */}
        <div className='min-h-[200px] overflow-y-auto rounded-lg'>
          <LexicalEditor
            content={taskDescription}
            editable={true}
            editorKey={`trigger-description-${trigger?.id || 'new'}`}
            placeholder='Describe what this agent should do...'
            onChange={setTaskDescription}
            plugins={[<EditorModePlugin key='editor-mode' mode='markdown' />]}
          />
        </div>

        {/* Footer */}
        <div className='flex items-center justify-end gap-3 pt-1'>
          <button
            type='button'
            onClick={onClose}
            className={cn(
              'px-3 py-1.5 text-[13px] font-medium transition-colors',
              isDark
                ? 'text-white/40 hover:text-white/60'
                : 'text-black/40 hover:text-black/60',
            )}>
            Cancel
          </button>
          <Button
            type='submit'
            variant='active'
            size='small'
            loading={saving}
            disabled={saving}>
            {isEditMode ? 'Save' : 'Create'}
          </Button>
        </div>
      </form>
    </CreateModal>
  )
}
