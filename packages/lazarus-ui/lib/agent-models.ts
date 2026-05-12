/**
 * Per-agent model whitelist. Mirrors backend `TSupportedModel` —
 * keep this list in sync with `src/domains/agent/runtime/models.ts`.
 */

export const SUPPORTED_MODELS = [
  {
    value: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    description: 'Fast, balanced — default',
  },
  {
    value: 'claude-opus-4-6',
    label: 'Claude Opus 4.6',
    description: 'Most capable, slower',
  },
] as const

export type TSupportedModel = (typeof SUPPORTED_MODELS)[number]['value']

export const DEFAULT_MODEL: TSupportedModel = 'claude-sonnet-4-6'

const LEGACY_ALIASES: Record<string, TSupportedModel> = {
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-6',
  'claude-sonnet-4-5-20250929': 'claude-sonnet-4-6',
  'claude-sonnet-4-5': 'claude-sonnet-4-6',
  'claude-sonnet-4-20250514': 'claude-sonnet-4-6',
  'claude-sonnet-4': 'claude-sonnet-4-6',
  'claude-opus-4-5-20251101': 'claude-opus-4-6',
  'claude-opus-4-5': 'claude-opus-4-6',
  'claude-opus-4-20250514': 'claude-opus-4-6',
  'claude-opus-4': 'claude-opus-4-6',
}

const isSupported = (raw: string): raw is TSupportedModel =>
  SUPPORTED_MODELS.some((m) => m.value === raw)

export const normalizeModel = (
  raw: string | undefined | null,
): TSupportedModel => {
  if (!raw) return DEFAULT_MODEL
  if (isSupported(raw)) return raw
  return LEGACY_ALIASES[raw] ?? DEFAULT_MODEL
}

export const getModelLabel = (model: string): string => {
  const normalized = normalizeModel(model)
  return (
    SUPPORTED_MODELS.find((m) => m.value === normalized)?.label ?? normalized
  )
}
