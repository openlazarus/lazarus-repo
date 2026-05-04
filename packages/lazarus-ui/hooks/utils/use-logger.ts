import { useCallback } from 'react'

type LogLevel = 'log' | 'warn' | 'error' | 'info'

interface Logger {
  log: (message: string, data?: any) => void
  warn: (message: string, data?: any) => void
  error: (message: string, data?: any) => void
  info: (message: string, data?: any) => void
}

export const useLogger = (enabled: boolean = false): Logger => {
  const createLogFunction = useCallback(
    (level: LogLevel) => {
      return (message: string, data?: any) => {
        if (!enabled) return

        if (data !== undefined) {
          console[level](message, data)
        } else {
          console[level](message)
        }
      }
    },
    [enabled],
  )

  return {
    log: createLogFunction('log'),
    warn: createLogFunction('warn'),
    error: createLogFunction('error'),
    info: createLogFunction('info'),
  }
}
