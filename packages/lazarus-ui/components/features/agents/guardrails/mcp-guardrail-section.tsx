'use client'

import {
  RiArrowDownSLine,
  RiLoader4Line,
  RiPlugLine,
  RiRefreshLine,
  RiToolsLine,
} from '@remixicon/react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { useState } from 'react'

import { SegmentedControl } from '@/components/ui/segmented-control'
import { cn } from '@/lib/utils'

import type {
  GuardrailConfig,
  MCPServerTools,
  PermissionLevel,
} from './guardrail-types'
import {
  PERMISSION_COLORS,
  PERMISSION_LABELS,
  mcpGuardrailCategoryId,
} from './guardrail-types'

const PERMISSION_OPTIONS: { id: PermissionLevel; label: string }[] = [
  { id: 'always_allowed', label: PERMISSION_LABELS.always_allowed },
  { id: 'ask_first', label: PERMISSION_LABELS.ask_first },
  { id: 'never_allowed', label: PERMISSION_LABELS.never_allowed },
]

const ACTIVE_COLOR_MAP: Partial<Record<PermissionLevel, string>> = {
  always_allowed: PERMISSION_COLORS.always_allowed,
  ask_first: PERMISSION_COLORS.ask_first,
  never_allowed: PERMISSION_COLORS.never_allowed,
}

// ── Single MCP tool row ───────────────────────────────────────────────────

interface MCPToolRowProps {
  serverName: string
  toolName: string
  toolDescription: string
  guardrails: GuardrailConfig[]
  connectionLevel: PermissionLevel
  onChange: (guardrails: GuardrailConfig[]) => void
  isDark: boolean
  readOnly: boolean
}

function MCPToolRow({
  serverName,
  toolName,
  toolDescription,
  guardrails,
  connectionLevel,
  onChange,
  isDark,
  readOnly,
}: MCPToolRowProps) {
  const categoryId = mcpGuardrailCategoryId(serverName, toolName)
  const toolEntry = guardrails.find((g) => g.categoryId === categoryId)
  const effectiveLevel = toolEntry?.level ?? connectionLevel
  const isOverridden = !!toolEntry

  const handleChange = (level: PermissionLevel) => {
    // If setting to same as connection default, remove the override
    if (level === connectionLevel) {
      onChange(guardrails.filter((g) => g.categoryId !== categoryId))
    } else {
      const existing = guardrails.find((g) => g.categoryId === categoryId)
      if (existing) {
        onChange(
          guardrails.map((g) =>
            g.categoryId === categoryId ? { ...g, level } : g,
          ),
        )
      } else {
        onChange([...guardrails, { categoryId, level }])
      }
    }
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 border-b py-3 pl-9',
        isDark ? 'border-white/[0.04]' : 'border-black/[0.04]',
      )}>
      <div className='flex min-w-0 items-center gap-2.5'>
        <RiToolsLine size={14} className='flex-shrink-0 opacity-25' />
        <div className='min-w-0'>
          <p
            className={cn(
              'truncate text-[12px] font-medium',
              isOverridden ? '' : isDark ? 'text-white/50' : 'text-black/50',
            )}>
            {toolName}
            {isOverridden && (
              <span
                className={cn('ml-1.5 inline-block h-1.5 w-1.5 rounded-full')}
                style={{ backgroundColor: PERMISSION_COLORS[effectiveLevel] }}
              />
            )}
          </p>
          {toolDescription && (
            <p
              className={cn(
                'mt-0.5 truncate text-[10px]',
                isDark ? 'text-white/25' : 'text-black/25',
              )}>
              {toolDescription}
            </p>
          )}
        </div>
      </div>

      {readOnly ? (
        <div
          className='flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium text-white'
          style={{ backgroundColor: PERMISSION_COLORS[effectiveLevel] }}>
          {PERMISSION_LABELS[effectiveLevel]}
        </div>
      ) : (
        <div className='flex-shrink-0'>
          <SegmentedControl
            options={PERMISSION_OPTIONS}
            value={effectiveLevel}
            onChange={handleChange}
            isDark={isDark}
            activeColorMap={ACTIVE_COLOR_MAP}
          />
        </div>
      )}
    </div>
  )
}

// ── Single MCP connection group ───────────────────────────────────────────

interface MCPConnectionGroupProps {
  server: MCPServerTools
  guardrails: GuardrailConfig[]
  onChange: (guardrails: GuardrailConfig[]) => void
  isDark: boolean
  readOnly: boolean
  index: number
}

function MCPConnectionGroup({
  server,
  guardrails,
  onChange,
  isDark,
  readOnly,
  index,
}: MCPConnectionGroupProps) {
  const [expanded, setExpanded] = useState(false)

  const connectionCategoryId = mcpGuardrailCategoryId(server.serverName)
  const connectionEntry = guardrails.find(
    (g) => g.categoryId === connectionCategoryId,
  )
  const connectionLevel: PermissionLevel =
    connectionEntry?.level ?? 'always_allowed'

  const handleConnectionLevelChange = (level: PermissionLevel) => {
    const existing = guardrails.find(
      (g) => g.categoryId === connectionCategoryId,
    )
    if (existing) {
      onChange(
        guardrails.map((g) =>
          g.categoryId === connectionCategoryId ? { ...g, level } : g,
        ),
      )
    } else {
      onChange([...guardrails, { categoryId: connectionCategoryId, level }])
    }
  }

  // Count how many tools have individual overrides
  const overrideCount = server.tools.filter((t) =>
    guardrails.some(
      (g) => g.categoryId === mcpGuardrailCategoryId(server.serverName, t.name),
    ),
  ).length

  // Display name: replace hyphens/underscores with spaces, title-case
  const displayName = server.serverName
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <m.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.05,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(
        'border-b',
        isDark ? 'border-white/[0.06]' : 'border-black/[0.06]',
      )}>
      {/* Connection header row */}
      <div className='flex items-center justify-between gap-4 py-4'>
        <div className='flex min-w-0 items-center gap-3'>
          <button
            type='button'
            onClick={() => setExpanded(!expanded)}
            className={cn(
              'flex min-w-0 items-center gap-2.5',
              'transition-colors',
              isDark ? 'hover:text-white/80' : 'hover:text-black/80',
            )}>
            <RiPlugLine size={18} className='flex-shrink-0 opacity-40' />
            <div className='min-w-0 text-left'>
              <p className='truncate text-[13px] font-medium'>{displayName}</p>
              <p
                className={cn(
                  'mt-0.5 text-[11px]',
                  isDark ? 'text-white/40' : 'text-black/40',
                )}>
                {server.tools.length} tool{server.tools.length !== 1 ? 's' : ''}
                {overrideCount > 0 && ` · ${overrideCount} custom`}
              </p>
            </div>
            <RiArrowDownSLine
              size={16}
              className={cn(
                'flex-shrink-0 opacity-30 transition-transform duration-200',
                expanded && 'rotate-180',
              )}
            />
          </button>
        </div>

        {readOnly ? (
          <div
            className='flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium text-white'
            style={{ backgroundColor: PERMISSION_COLORS[connectionLevel] }}>
            {PERMISSION_LABELS[connectionLevel]}
          </div>
        ) : (
          <div className='flex-shrink-0'>
            <SegmentedControl
              options={PERMISSION_OPTIONS}
              value={connectionLevel}
              onChange={handleConnectionLevelChange}
              isDark={isDark}
              activeColorMap={ACTIVE_COLOR_MAP}
            />
          </div>
        )}
      </div>

      {/* Expanded tool list */}
      <AnimatePresence>
        {expanded && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className='overflow-hidden'>
            {server.tools.map((tool) => (
              <MCPToolRow
                key={tool.name}
                serverName={server.serverName}
                toolName={tool.name}
                toolDescription={tool.description}
                guardrails={guardrails}
                connectionLevel={connectionLevel}
                onChange={onChange}
                isDark={isDark}
                readOnly={readOnly}
              />
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────

interface MCPGuardrailSectionProps {
  mcpServers: MCPServerTools[]
  guardrails: GuardrailConfig[]
  onGuardrailsChange: (guardrails: GuardrailConfig[]) => void
  isDark: boolean
  isEditMode: boolean
  loading?: boolean
  onRefresh?: () => void
}

export function MCPGuardrailSection({
  mcpServers,
  guardrails,
  onGuardrailsChange,
  isDark,
  isEditMode,
  loading,
  onRefresh,
}: MCPGuardrailSectionProps) {
  if (mcpServers.length === 0 && !loading) return null

  return (
    <div className='space-y-3 pt-6'>
      {/* Section header */}
      <div className='flex items-center justify-between'>
        <p
          className={cn(
            'text-[12px] font-semibold uppercase tracking-wider',
            isDark ? 'text-white/30' : 'text-black/30',
          )}>
          Connected tools
        </p>
        {onRefresh && isEditMode && (
          <button
            type='button'
            onClick={onRefresh}
            disabled={loading}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors',
              isDark
                ? 'text-white/40 hover:bg-white/[0.06] hover:text-white/60'
                : 'text-black/40 hover:bg-black/[0.04] hover:text-black/60',
              loading && 'cursor-not-allowed opacity-50',
            )}>
            {loading ? (
              <RiLoader4Line size={12} className='animate-spin' />
            ) : (
              <RiRefreshLine size={12} />
            )}
            Refresh
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && mcpServers.length === 0 && (
        <div
          className={cn(
            'flex items-center gap-2 py-4 text-[12px]',
            isDark ? 'text-white/30' : 'text-black/30',
          )}>
          <RiLoader4Line size={14} className='animate-spin' />
          Discovering tools...
        </div>
      )}

      {/* MCP connection groups */}
      <div>
        {mcpServers.map((server, index) => (
          <MCPConnectionGroup
            key={server.serverName}
            server={server}
            guardrails={guardrails}
            onChange={onGuardrailsChange}
            isDark={isDark}
            readOnly={!isEditMode}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}
