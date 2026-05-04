'use client'

import { RiAddLine, RiArrowLeftSLine } from '@remixicon/react'
import * as m from 'motion/react-m'
import { useState } from 'react'

import { LexicalEditor } from '@/components/ui/lexical/lexical-editor'
import { EditorModePlugin } from '@/components/ui/lexical/plugins/editor-mode-plugin'
import '@/components/ui/lexical/xcode-theme.css'
import { OptionList, type OptionItem } from '@/components/ui/option-list'
import { SegmentedControl } from '@/components/ui/segmented-control'
import {
  getDefaultTimezone,
  getGroupedTimezones,
  getTimezoneAbbreviation,
} from '@/lib/timezone-utils'
import { cn } from '@/lib/utils'

// ── Motion constants ────────────────────────────────────────

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

const staggerParent = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.02 },
  },
}

const fadeBlurChild = {
  hidden: { opacity: 0, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
      mass: 0.8,
    },
  },
}

// ── Custom icons ────────────────────────────────────────────

function ScheduleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}>
      <circle cx='12' cy='12' r='10' />
      <path d='M12 6v6l4 2' />
    </svg>
  )
}

function SignalIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}>
      <polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2' />
    </svg>
  )
}

function MessageBubbleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}>
      <path d='M7.9 20A9 9 0 1 0 4 16.1L2 22z' />
    </svg>
  )
}

// ── Types & constants ───────────────────────────────────────

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

export interface TriggerConfig {
  type: 'scheduled' | 'webhook' | 'whatsapp'
  taskTitle: string
  taskDescription: string
  repeatType: RepeatType
  scheduleTime: string
  timezone: string
  selectedDays: number[]
  monthDay: string
  onceDateTime: string
  webhookSecret: string
  webhookSignatureHeader: string
  whatsappFromNumbers: string
  whatsappKeywords: string
  whatsappMessageTypes: string[]
}

export function createEmptyTrigger(): TriggerConfig {
  return {
    type: 'scheduled',
    taskTitle: '',
    taskDescription: '',
    repeatType: 'daily',
    scheduleTime: '09:00',
    timezone: getDefaultTimezone(),
    selectedDays: [],
    monthDay: '1',
    onceDateTime: '',
    webhookSecret: '',
    webhookSignatureHeader: '',
    whatsappFromNumbers: '',
    whatsappKeywords: '',
    whatsappMessageTypes: ['text'],
  }
}

export function buildCron(
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

// ── Timezone Selector ───────────────────────────────────────

const groupedTimezones = getGroupedTimezones()

export function TimezoneSelector({
  value,
  onChange,
  isDark,
}: {
  value: string
  onChange: (tz: string) => void
  isDark: boolean
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'rounded-lg border px-2.5 py-1.5 text-[13px] font-medium',
        'focus:outline-none focus:ring-2 focus:ring-[#0098FC]/30',
        isDark
          ? 'border-white/[0.08] bg-white/[0.03] text-white'
          : 'border-black/[0.06] bg-black/[0.015] text-[#1a1a1a]',
      )}>
      {Object.entries(groupedTimezones).map(([group, options]) => (
        <optgroup key={group} label={group}>
          {options.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

// ── Trigger Editor ──────────────────────────────────────────

interface StepScheduleProps {
  triggers: TriggerConfig[]
  onTriggersChange: (triggers: TriggerConfig[]) => void
  isDark: boolean
}

function TriggerEditor({
  trigger,
  onChange,
  onRemove,
  onDone,
  isDark,
  showRemove,
  editingIndex,
}: {
  trigger: TriggerConfig
  onChange: (t: TriggerConfig) => void
  onRemove: () => void
  onDone: () => void
  isDark: boolean
  showRemove: boolean
  editingIndex: number
}) {
  const showTimePicker =
    trigger.repeatType !== 'every-30min' &&
    trigger.repeatType !== 'every-hour' &&
    trigger.repeatType !== 'once'

  const toggleDay = (day: number) => {
    const days = trigger.selectedDays.includes(day)
      ? trigger.selectedDays.filter((d) => d !== day)
      : [...trigger.selectedDays, day]
    onChange({ ...trigger, selectedDays: days })
  }

  return (
    <m.div
      initial='hidden'
      animate='visible'
      exit='exit'
      variants={staggerParent}
      className='space-y-5'>
      {/* Back to list */}
      <m.div variants={fadeBlurChild}>
        <button
          type='button'
          onClick={onDone}
          className={cn(
            'flex items-center gap-1 text-[14px] font-semibold transition-colors',
            isDark
              ? 'text-white/50 hover:text-white/70'
              : 'text-black/50 hover:text-black/70',
          )}>
          <RiArrowLeftSLine size={18} />
          All tasks
        </button>
      </m.div>

      {/* Task title */}
      <m.div variants={fadeBlurChild}>
        <input
          type='text'
          value={trigger.taskTitle}
          onChange={(e) => onChange({ ...trigger, taskTitle: e.target.value })}
          placeholder='Task title — e.g. Morning brief, Weekly report'
          className={cn(
            'w-full bg-transparent text-[15px] font-semibold leading-relaxed',
            'focus:outline-none',
            isDark
              ? 'text-white placeholder:text-white/25'
              : 'text-[#1a1a1a] placeholder:text-black/25',
          )}
        />
      </m.div>

      {/* Task description — Lexical markdown editor */}
      <m.div
        variants={fadeBlurChild}
        className='min-h-[180px] rounded-lg [&_.lexical-content-editable]:!p-0'>
        <LexicalEditor
          content={trigger.taskDescription}
          editable={true}
          editorKey={`wizard-task-${editingIndex}`}
          placeholder='Describe what the agent should do — e.g. Every morning, compile overnight metrics and email a summary to team@company.com'
          onChange={(content) =>
            onChange({ ...trigger, taskDescription: content })
          }
          plugins={[<EditorModePlugin key='editor-mode' mode='markdown' />]}
        />
      </m.div>

      {/* Separator */}
      <m.div variants={fadeBlurChild}>
        <div
          className={cn('h-px', isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]')}
        />
      </m.div>

      {/* Trigger type + config */}
      <m.div variants={fadeBlurChild} className='space-y-3'>
        <SegmentedControl
          options={TRIGGER_TYPES}
          value={trigger.type}
          onChange={(v) => onChange({ ...trigger, type: v })}
          isDark={isDark}
        />

        {/* Schedule config */}
        {trigger.type === 'scheduled' && (
          <div>
            {/* Repeat option pills — staggered */}
            <div className='flex flex-wrap gap-1'>
              {REPEAT_OPTIONS.map((option, i) => (
                <m.button
                  key={option.id}
                  type='button'
                  initial={{ opacity: 0, scale: 0.92, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  transition={{
                    delay: i * 0.045,
                    type: 'spring',
                    stiffness: 420,
                    damping: 28,
                    mass: 0.8,
                  }}
                  onClick={() =>
                    onChange({ ...trigger, repeatType: option.id })
                  }
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                    trigger.repeatType === option.id
                      ? 'bg-[#0098FC] text-white'
                      : isDark
                        ? 'bg-white/[0.06] text-white/50 hover:bg-white/[0.1] hover:text-white/70'
                        : 'bg-black/[0.04] text-black/40 hover:bg-black/[0.07] hover:text-black/60',
                  )}>
                  {option.label}
                </m.button>
              ))}
            </div>

            {/* Sub-picker area */}
            <div className='mt-3 min-h-[32px]'>
              {trigger.repeatType === 'specific-days' && (
                <div className='flex items-center gap-1.5'>
                  {DAYS.map((day, i) => (
                    <m.button
                      key={`${day.value}-${i}`}
                      type='button'
                      initial={{ opacity: 0, scale: 0.88, filter: 'blur(5px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                      transition={{
                        delay: i * 0.04,
                        type: 'spring',
                        stiffness: 440,
                        damping: 26,
                        mass: 0.7,
                      }}
                      onClick={() => toggleDay(day.value)}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
                        trigger.selectedDays.includes(day.value)
                          ? 'bg-[#0098FC] text-white'
                          : isDark
                            ? 'bg-white/[0.06] text-white/40 hover:bg-white/[0.1]'
                            : 'bg-black/[0.04] text-black/35 hover:bg-black/[0.07]',
                      )}>
                      {day.label}
                    </m.button>
                  ))}
                </div>
              )}

              {trigger.repeatType === 'monthly' && (
                <div className='flex flex-wrap gap-1'>
                  {MONTH_DAYS.map((option, i) => (
                    <m.button
                      key={option.value}
                      type='button'
                      initial={{ opacity: 0, scale: 0.92, filter: 'blur(6px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                      transition={{
                        delay: i * 0.045,
                        type: 'spring',
                        stiffness: 420,
                        damping: 28,
                        mass: 0.8,
                      }}
                      onClick={() =>
                        onChange({ ...trigger, monthDay: option.value })
                      }
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                        trigger.monthDay === option.value
                          ? 'bg-[#0098FC] text-white'
                          : isDark
                            ? 'bg-white/[0.06] text-white/50 hover:bg-white/[0.1]'
                            : 'bg-black/[0.04] text-black/40 hover:bg-black/[0.07]',
                      )}>
                      {option.label}
                    </m.button>
                  ))}
                </div>
              )}

              {trigger.repeatType === 'once' && (
                <m.div
                  initial={{ opacity: 0, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 30,
                    mass: 0.8,
                  }}>
                  <input
                    type='datetime-local'
                    value={trigger.onceDateTime}
                    onChange={(e) =>
                      onChange({ ...trigger, onceDateTime: e.target.value })
                    }
                    className={cn(
                      'rounded-lg border px-2.5 py-1.5 text-[13px] font-medium tabular-nums',
                      'focus:outline-none focus:ring-2 focus:ring-[#0098FC]/30',
                      isDark
                        ? 'border-white/[0.08] bg-white/[0.03] text-white'
                        : 'border-black/[0.06] bg-black/[0.015] text-[#1a1a1a]',
                    )}
                  />
                </m.div>
              )}
            </div>

            {/* Time picker + timezone */}
            <div className='mt-3 min-h-[32px]'>
              {showTimePicker && (
                <m.div
                  className='flex items-center gap-2'
                  initial={{ opacity: 0, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  transition={{
                    type: 'spring',
                    stiffness: 380,
                    damping: 30,
                    mass: 0.8,
                  }}>
                  <span
                    className={cn(
                      'text-[12px]',
                      isDark ? 'text-white/30' : 'text-black/30',
                    )}>
                    at
                  </span>
                  <input
                    type='time'
                    value={trigger.scheduleTime}
                    onChange={(e) =>
                      onChange({
                        ...trigger,
                        scheduleTime: e.target.value,
                      })
                    }
                    className={cn(
                      'rounded-lg border px-2.5 py-1.5 text-[13px] font-medium tabular-nums',
                      'focus:outline-none focus:ring-2 focus:ring-[#0098FC]/30',
                      isDark
                        ? 'border-white/[0.08] bg-white/[0.03] text-white'
                        : 'border-black/[0.06] bg-black/[0.015] text-[#1a1a1a]',
                    )}
                  />
                  <TimezoneSelector
                    value={trigger.timezone}
                    onChange={(tz) => onChange({ ...trigger, timezone: tz })}
                    isDark={isDark}
                  />
                </m.div>
              )}
              {trigger.repeatType === 'once' && (
                <div className='mt-2'>
                  <TimezoneSelector
                    value={trigger.timezone}
                    onChange={(tz) => onChange({ ...trigger, timezone: tz })}
                    isDark={isDark}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Webhook config */}
        {trigger.type === 'webhook' && (
          <m.div
            className='space-y-2'
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{
              type: 'spring',
              stiffness: 380,
              damping: 30,
              mass: 0.8,
            }}>
            <input
              type='text'
              value={trigger.webhookSecret}
              onChange={(e) =>
                onChange({ ...trigger, webhookSecret: e.target.value })
              }
              placeholder='Secret key (optional)'
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-[13px] font-medium',
                'placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#0098FC]/30',
                isDark
                  ? 'border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/25'
                  : 'border-black/[0.06] bg-black/[0.015] text-[#1a1a1a] placeholder:text-black/25',
              )}
            />
            {trigger.webhookSecret && (
              <input
                type='text'
                value={trigger.webhookSignatureHeader}
                onChange={(e) =>
                  onChange({
                    ...trigger,
                    webhookSignatureHeader: e.target.value,
                  })
                }
                placeholder='Signature header (default: x-webhook-signature)'
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-[13px] font-medium',
                  'placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#0098FC]/30',
                  isDark
                    ? 'border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/25'
                    : 'border-black/[0.06] bg-black/[0.015] text-[#1a1a1a] placeholder:text-black/25',
                )}
              />
            )}
            <p
              className={cn(
                'text-[11px] leading-relaxed',
                isDark ? 'text-white/30' : 'text-black/25',
              )}>
              Webhook URL will be available after the agent is created.
            </p>
          </m.div>
        )}

        {/* WhatsApp config */}
        {trigger.type === 'whatsapp' && (
          <div className='space-y-3'>
            <m.div
              initial={{ opacity: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{
                type: 'spring',
                stiffness: 380,
                damping: 30,
                mass: 0.8,
              }}>
              <input
                type='text'
                value={trigger.whatsappFromNumbers}
                onChange={(e) =>
                  onChange({
                    ...trigger,
                    whatsappFromNumbers: e.target.value,
                  })
                }
                placeholder='From numbers (optional) — e.g. +1234, +5678'
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-[13px] font-medium',
                  'placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#0098FC]/30',
                  isDark
                    ? 'border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/25'
                    : 'border-black/[0.06] bg-black/[0.015] text-[#1a1a1a] placeholder:text-black/25',
                )}
              />
            </m.div>
            <m.div
              initial={{ opacity: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{
                delay: 0.05,
                type: 'spring',
                stiffness: 380,
                damping: 30,
                mass: 0.8,
              }}>
              <input
                type='text'
                value={trigger.whatsappKeywords}
                onChange={(e) =>
                  onChange({
                    ...trigger,
                    whatsappKeywords: e.target.value,
                  })
                }
                placeholder='Keywords (optional) — e.g. help, support'
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-[13px] font-medium',
                  'placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#0098FC]/30',
                  isDark
                    ? 'border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/25'
                    : 'border-black/[0.06] bg-black/[0.015] text-[#1a1a1a] placeholder:text-black/25',
                )}
              />
            </m.div>
            <div className='flex flex-wrap gap-1'>
              {['text', 'image', 'document', 'audio', 'video'].map(
                (type, i) => (
                  <m.button
                    key={type}
                    type='button'
                    initial={{ opacity: 0, scale: 0.92, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    transition={{
                      delay: 0.1 + i * 0.045,
                      type: 'spring',
                      stiffness: 420,
                      damping: 28,
                      mass: 0.8,
                    }}
                    onClick={() => {
                      const types = trigger.whatsappMessageTypes.includes(type)
                        ? trigger.whatsappMessageTypes.filter((t) => t !== type)
                        : [...trigger.whatsappMessageTypes, type]
                      onChange({ ...trigger, whatsappMessageTypes: types })
                    }}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition-colors',
                      trigger.whatsappMessageTypes.includes(type)
                        ? 'bg-[#0098FC] text-white'
                        : isDark
                          ? 'bg-white/[0.06] text-white/50 hover:bg-white/[0.1]'
                          : 'bg-black/[0.04] text-black/40 hover:bg-black/[0.07]',
                    )}>
                    {type}
                  </m.button>
                ),
              )}
            </div>
          </div>
        )}
      </m.div>

      {/* Footer actions */}
      <m.div
        variants={fadeBlurChild}
        className='flex items-center justify-end gap-3 pt-2'>
        {showRemove && (
          <button
            type='button'
            onClick={onRemove}
            className={cn(
              'text-[14px] font-semibold transition-colors',
              isDark
                ? 'text-white/40 hover:text-red-400'
                : 'text-black/40 hover:text-red-500',
            )}>
            Remove
          </button>
        )}
        <button
          type='button'
          onClick={onDone}
          className='rounded-full bg-[#0098FC] px-5 py-1.5 text-[14px] font-semibold text-white transition-all hover:bg-[#0088e0]'>
          Save
        </button>
      </m.div>
    </m.div>
  )
}

// ── Icon map & option builder ───────────────────────────────

const TRIGGER_ICON_MAP: Record<TriggerConfig['type'], typeof ScheduleIcon> = {
  scheduled: ScheduleIcon,
  webhook: SignalIcon,
  whatsapp: MessageBubbleIcon,
}

function buildOptionItems(
  triggers: TriggerConfig[],
  isDark: boolean,
): OptionItem<number>[] {
  return triggers.map((trigger, index) => {
    const scheduleLabel =
      trigger.type === 'webhook'
        ? 'App Signal'
        : trigger.type === 'whatsapp'
          ? 'WhatsApp'
          : formatScheduleLabel(
              trigger.repeatType,
              trigger.scheduleTime,
              trigger.selectedDays,
              trigger.monthDay,
              trigger.onceDateTime,
              trigger.timezone,
            )

    return {
      id: index,
      icon: TRIGGER_ICON_MAP[trigger.type],
      label: trigger.taskTitle || trigger.taskDescription || 'Untitled task',
      description: scheduleLabel,
      rightContent: (
        <span
          className={cn(
            'text-[12px] font-medium opacity-0 transition-opacity group-hover:opacity-100',
            isDark ? 'text-white/30' : 'text-black/30',
          )}>
          Edit
        </span>
      ),
    }
  })
}

// ── Main component ──────────────────────────────────────────

export function StepSchedule({
  triggers,
  onTriggersChange,
  isDark,
}: StepScheduleProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const addTrigger = () => {
    const newTriggers = [...triggers, createEmptyTrigger()]
    onTriggersChange(newTriggers)
    setEditingIndex(newTriggers.length - 1)
  }

  const removeTrigger = (index: number) => {
    const newTriggers = triggers.filter((_, i) => i !== index)
    onTriggersChange(newTriggers)
    setEditingIndex(null)
  }

  const updateTrigger = (index: number, trigger: TriggerConfig) => {
    const newTriggers = [...triggers]
    newTriggers[index] = trigger
    onTriggersChange(newTriggers)
  }

  const isEditing = editingIndex !== null && triggers[editingIndex]
  const optionItems = buildOptionItems(triggers, isDark)

  return isEditing ? (
    <TriggerEditor
      key={`editor-${editingIndex}`}
      trigger={triggers[editingIndex]}
      onChange={(t) => updateTrigger(editingIndex, t)}
      onRemove={() => removeTrigger(editingIndex)}
      onDone={() => setEditingIndex(null)}
      isDark={isDark}
      showRemove={triggers.length > 1}
      editingIndex={editingIndex}
    />
  ) : (
    <div className='space-y-5'>
      {triggers.length > 0 && (
        <OptionList
          options={optionItems}
          onOptionClick={(index) => setEditingIndex(index)}
          isDark={isDark}
          showDescriptions
          animated
        />
      )}

      <m.div
        initial={{ opacity: 0, filter: 'blur(4px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{
          delay: 0.5,
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}>
        <button
          type='button'
          onClick={addTrigger}
          className={cn(
            'flex items-center gap-1.5 text-[14px] font-semibold transition-colors',
            isDark
              ? 'text-white/50 hover:text-white/70'
              : 'text-black/50 hover:text-black/70',
          )}>
          <RiAddLine size={16} />
          Add task
        </button>
      </m.div>
    </div>
  )
}
