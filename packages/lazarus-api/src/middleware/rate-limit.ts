import rateLimit from 'express-rate-limit'

/**
 * Rate limiter for `/api` — stricter in production, lenient in development.
 */
export function apiRateLimit() {
  if (process.env.NODE_ENV === 'production') {
    return rateLimit({
      windowMs: 1 * 60 * 1000,
      max: 1000,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Too many requests, please try again later.',
      validate: { trustProxy: false },
    })
  }

  return rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10000,
    validate: { trustProxy: false },
  })
}
