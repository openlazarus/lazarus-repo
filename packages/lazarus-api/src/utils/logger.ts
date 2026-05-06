import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: { service: 'lazarus-api', env: process.env.NODE_ENV || 'development' },
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
})

export function createLogger(module: string) {
  return logger.child({ module })
}

export default logger
