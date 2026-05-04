import cors from 'cors'

/**
 * Permissive CORS for API-key authenticated routes (database API, v0-auth).
 * These routes use API keys for authentication, so we can allow any origin.
 */
export function apiKeyCors() {
  return cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
}

/**
 * Standard CORS for routes that require specific allowed origins.
 */
export function standardCors() {
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000']
  return cors({
    origin: corsOrigins,
    credentials: true,
  })
}
