'use client'

import * as m from 'motion/react-m'

import { cn } from '@/lib/utils'

import { GuardrailCard } from '../guardrails/guardrail-card'
import { GUARDRAIL_PRESETS } from '../guardrails/guardrail-presets'
import {
  type GuardrailConfig,
  type MCPServerTools,
  GUARDRAIL_CATEGORIES,
  isMCPGuardrail,
} from '../guardrails/guardrail-types'
import { MCPGuardrailSection } from '../guardrails/mcp-guardrail-section'

interface StepGuardrailsProps {
  guardrails: GuardrailConfig[]
  onGuardrailsChange: (guardrails: GuardrailConfig[]) => void
  isDark: boolean
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

export function StepGuardrails({
  guardrails,
  onGuardrailsChange,
  isDark,
  mcpServers = [],
  mcpLoading = false,
  onMCPRefresh,
}: StepGuardrailsProps) {
  const activePresetId = getActivePresetId(guardrails)

  const applyPreset = (presetId: string) => {
    const preset = GUARDRAIL_PRESETS.find((p) => p.id === presetId)
    if (preset) {
      // Preserve MCP guardrail entries when applying a preset
      const mcpEntries = guardrails.filter((g) => isMCPGuardrail(g.categoryId))
      onGuardrailsChange([...preset.config, ...mcpEntries])
    }
  }

  const updateGuardrail = (updated: GuardrailConfig) => {
    onGuardrailsChange(
      guardrails.map((g) =>
        g.categoryId === updated.categoryId ? updated : g,
      ),
    )
  }

  return (
    <div className='space-y-6'>
      {/* Preset pills */}
      <m.div
        className='flex gap-2'
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
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
      </m.div>

      {/* Built-in guardrail rows */}
      <div>
        {GUARDRAIL_CATEGORIES.map((category, index) => {
          const config = guardrails.find(
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
              index={index}
              isFirst={index === 0}
            />
          )
        })}
      </div>

      {/* MCP tool guardrails */}
      <MCPGuardrailSection
        mcpServers={mcpServers}
        guardrails={guardrails}
        onGuardrailsChange={onGuardrailsChange}
        isDark={isDark}
        isEditMode={true}
        loading={mcpLoading}
        onRefresh={onMCPRefresh}
      />
    </div>
  )
}
