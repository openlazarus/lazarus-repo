'use client'

import { cn } from '@/lib/utils'
import { GuardrailCard } from '../guardrails/guardrail-card'
import { GUARDRAIL_PRESETS } from '../guardrails/guardrail-presets'
import type { MCPServerTools } from '../guardrails/guardrail-types'
import {
  type GuardrailConfig,
  GUARDRAIL_CATEGORIES,
  isMCPGuardrail,
} from '../guardrails/guardrail-types'
import { MCPGuardrailSection } from '../guardrails/mcp-guardrail-section'

interface AgentDetailGuardrailsProps {
  guardrails: GuardrailConfig[]
  isDark: boolean
  isEditMode: boolean
  onGuardrailsChange: (guardrails: GuardrailConfig[]) => void
  mcpServers?: MCPServerTools[]
  mcpLoading?: boolean
  onMCPRefresh?: () => void
}

function getActivePresetId(guardrails: GuardrailConfig[]): string | null {
  for (const preset of GUARDRAIL_PRESETS) {
    const matches = preset.config.every((pc) => {
      const gc = guardrails.find((g) => g.categoryId === pc.categoryId)
      return gc && gc.level === pc.level
    })
    if (matches) return preset.id
  }
  return null
}

export function AgentDetailGuardrails({
  guardrails,
  isDark,
  isEditMode,
  onGuardrailsChange,
  mcpServers = [],
  mcpLoading = false,
  onMCPRefresh,
}: AgentDetailGuardrailsProps) {
  const activePresetId = getActivePresetId(guardrails)

  const applyPreset = (presetId: string) => {
    const preset = GUARDRAIL_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    // Preserve MCP guardrail entries when applying a preset
    const mcpEntries = guardrails.filter((g) => isMCPGuardrail(g.categoryId))
    onGuardrailsChange([...preset.config, ...mcpEntries])
  }

  const updateGuardrail = (updated: GuardrailConfig) => {
    onGuardrailsChange(
      guardrails.map((g) =>
        g.categoryId === updated.categoryId ? updated : g,
      ),
    )
  }

  // Build default guardrails if none exist
  const effectiveGuardrails =
    guardrails.length > 0
      ? guardrails
      : GUARDRAIL_CATEGORIES.map((cat) => ({
          categoryId: cat.id,
          level: 'ask_first' as const,
        }))

  return (
    <div className='space-y-6 pt-8'>
      {/* Description */}
      <p
        className={cn(
          'text-[14px] font-medium leading-relaxed',
          isDark ? 'text-white/40' : 'text-black/40',
        )}>
        Agents work autonomously and only loop you in when a decision needs your
        call.
      </p>

      {/* Preset pills — only in edit mode */}
      {isEditMode && (
        <div className='flex gap-2'>
          {GUARDRAIL_PRESETS.map((preset) => {
            const isActive = activePresetId === preset.id

            return (
              <button
                key={preset.id}
                type='button'
                onClick={() => applyPreset(preset.id)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-[12px] font-medium transition-all',
                  isActive
                    ? 'bg-[#0098FC] text-white'
                    : isDark
                      ? 'bg-white/[0.06] text-white/50 hover:bg-white/[0.1] hover:text-white/70'
                      : 'bg-black/[0.04] text-black/40 hover:bg-black/[0.07] hover:text-black/60',
                )}>
                {preset.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Built-in guardrail rows */}
      <div>
        {GUARDRAIL_CATEGORIES.map((category, index) => {
          const config = effectiveGuardrails.find(
            (g) => g.categoryId === category.id,
          ) || {
            categoryId: category.id,
            level: 'ask_first' as const,
          }

          return (
            <GuardrailCard
              key={category.id}
              categoryId={category.id}
              label={category.label}
              description={category.description}
              icon={category.icon}
              config={config}
              onChange={updateGuardrail}
              isDark={isDark}
              readOnly={!isEditMode}
              index={index}
              isFirst={index === 0}
            />
          )
        })}
      </div>

      {/* MCP tool guardrails */}
      <MCPGuardrailSection
        mcpServers={mcpServers}
        guardrails={effectiveGuardrails}
        onGuardrailsChange={onGuardrailsChange}
        isDark={isDark}
        isEditMode={isEditMode}
        loading={mcpLoading}
        onRefresh={onMCPRefresh}
      />
    </div>
  )
}
