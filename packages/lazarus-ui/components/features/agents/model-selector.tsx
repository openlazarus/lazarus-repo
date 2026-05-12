'use client'

import { Select } from '@/components/ui/select'
import {
  DEFAULT_MODEL,
  normalizeModel,
  SUPPORTED_MODELS,
  type TSupportedModel,
} from '@/lib/agent-models'
import React from 'react'

interface ModelSelectorProps {
  value: string | undefined
  onChange: (model: TSupportedModel) => void
  disabled?: boolean
  isDark?: boolean
  label?: string
  size?: 'small' | 'medium' | 'large'
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onChange,
  disabled,
  isDark,
  label = 'Model',
  size = 'medium',
}) => {
  const current = normalizeModel(value) ?? DEFAULT_MODEL
  const helper = SUPPORTED_MODELS.find((m) => m.value === current)?.description

  return (
    <div className='flex flex-col gap-1'>
      <Select
        label={label}
        value={current}
        onValueChange={(v) => onChange(v as TSupportedModel)}
        disabled={disabled}
        isDark={isDark}
        size={size}>
        {SUPPORTED_MODELS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </Select>
      {helper && (
        <span
          className={
            isDark ? 'text-xs text-white/50' : 'text-xs text-black/50'
          }>
          {helper}
        </span>
      )}
    </div>
  )
}
