/**
 * Per-agent model selection registry.
 *
 * Single source of truth for what models an agent may use. The registry pins
 * each model to its provider so callers (pricing, future runtime dispatch)
 * derive provider from model rather than storing it on the agent config.
 *
 * Add a new model: append to `TSupportedModel`, add a row to `MODEL_REGISTRY`,
 * and mirror it on the FE via `packages/lazarus-ui/lib/agent-models.ts`.
 */

import { createLogger } from '@utils/logger'

const log = createLogger('agent-models')

export type TModelProvider = 'anthropic' | 'openai'

export type TSupportedModel = 'claude-sonnet-4-6' | 'claude-opus-4-6'

export type TModelDescriptor = {
  model: TSupportedModel
  provider: TModelProvider
  displayName: string
  description: string
}

export const MODEL_REGISTRY: Record<TSupportedModel, TModelDescriptor> = {
  'claude-sonnet-4-6': {
    model: 'claude-sonnet-4-6',
    provider: 'anthropic',
    displayName: 'Claude Sonnet 4.6',
    description: 'Fast, balanced — default',
  },
  'claude-opus-4-6': {
    model: 'claude-opus-4-6',
    provider: 'anthropic',
    displayName: 'Claude Opus 4.6',
    description: 'Most capable, slower',
  },
}

export const DEFAULT_MODEL: TSupportedModel = 'claude-sonnet-4-6'

export const SUPPORTED_MODELS: readonly TSupportedModel[] = Object.keys(
  MODEL_REGISTRY,
) as TSupportedModel[]

const LEGACY_ALIASES: Record<string, TSupportedModel> = {
  // Short-form
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-6',
  // Sonnet legacy
  'claude-sonnet-4-5-20250929': 'claude-sonnet-4-6',
  'claude-sonnet-4-5': 'claude-sonnet-4-6',
  'claude-sonnet-4-20250514': 'claude-sonnet-4-6',
  'claude-sonnet-4': 'claude-sonnet-4-6',
  // Opus legacy
  'claude-opus-4-5-20251101': 'claude-opus-4-6',
  'claude-opus-4-5': 'claude-opus-4-6',
  'claude-opus-4-20250514': 'claude-opus-4-6',
  'claude-opus-4': 'claude-opus-4-6',
}

const isSupported = (raw: string): raw is TSupportedModel => raw in MODEL_REGISTRY

/**
 * Coerce a raw model string from disk/API into a known `TSupportedModel`.
 *
 * Existing agent config files may carry legacy values (`'opus'`, dated Sonnet
 * IDs, missing values). Read paths use this helper so old agents keep working;
 * write paths use the strict zod enum to prevent new bad values from landing.
 */
export const normalizeModel = (raw: string | undefined | null): TSupportedModel => {
  if (!raw) return DEFAULT_MODEL
  if (isSupported(raw)) return raw
  const alias = LEGACY_ALIASES[raw]
  if (alias) return alias
  log.warn({ raw }, 'unknown agent model, falling back to default')
  return DEFAULT_MODEL
}

export const getProviderForModel = (model: TSupportedModel): TModelProvider =>
  MODEL_REGISTRY[model].provider
