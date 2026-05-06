import { resourceFromAttributes } from '@opentelemetry/resources'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import type { Tracer } from '@opentelemetry/api'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { createLogger } from '@utils/logger'
import { ActivityStoreSpanProcessor } from './activity-store-span-processor'
import { TRACER_NAME } from './constants'

const log = createLogger('otel')

let provider: NodeTracerProvider | null = null

export function initOtel(): void {
  if (provider) return

  provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'lazarus-api',
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? 'unknown',
    }),
    spanProcessors: [new ActivityStoreSpanProcessor()],
  })

  log.info(
    'OpenTelemetry initialized (own provider, not registered globally to coexist with Sentry)',
  )
}

export function getAgentTracer(): Tracer {
  if (!provider) {
    throw new Error('OpenTelemetry not initialized — call initOtel() first')
  }
  return provider.getTracer(TRACER_NAME)
}
