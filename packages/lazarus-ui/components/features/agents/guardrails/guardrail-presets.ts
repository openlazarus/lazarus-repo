import {
  type GuardrailConfig,
  type PermissionLevel,
  GUARDRAIL_CATEGORIES,
} from './guardrail-types'

function makePreset(level: PermissionLevel): GuardrailConfig[] {
  return GUARDRAIL_CATEGORIES.map((cat) => ({
    categoryId: cat.id,
    level,
  }))
}

function makeMixedPreset(): GuardrailConfig[] {
  const levels: Record<string, PermissionLevel> = {
    edit_files: 'ask_first',
    run_code: 'ask_first',
    external_connections: 'always_allowed',
    read_data_sources: 'always_allowed',
    write_data_sources: 'ask_first',
    send_messages: 'ask_first',
    actions_with_cost: 'never_allowed',
  }

  return GUARDRAIL_CATEGORIES.map((cat) => ({
    categoryId: cat.id,
    level: levels[cat.id] || 'ask_first',
  }))
}

export interface GuardrailPreset {
  id: string
  label: string
  description: string
  config: GuardrailConfig[]
}

export const GUARDRAIL_PRESETS: GuardrailPreset[] = [
  {
    id: 'autonomous',
    label: 'Autonomous',
    description: 'Agent can act freely without asking',
    config: makePreset('always_allowed'),
  },
  {
    id: 'supervised',
    label: 'Supervised',
    description: 'Agent asks before sensitive actions',
    config: makeMixedPreset(),
  },
  {
    id: 'restricted',
    label: 'Restricted',
    description: 'Agent must ask for most actions',
    config: makePreset('never_allowed'),
  },
]
