import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration(),
    Sentry.browserTracingIntegration(),
  ],
  tracePropagationTargets: [
    'localhost',
    ...(process.env.NEXT_PUBLIC_API_BASE_URL
      ? [process.env.NEXT_PUBLIC_API_BASE_URL]
      : []),
  ],
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
})
