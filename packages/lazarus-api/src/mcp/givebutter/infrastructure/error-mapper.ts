import {
  GivebutterAuthError,
  GivebutterError,
  GivebutterForbiddenError,
  GivebutterNotFoundError,
  GivebutterRateLimitError,
  GivebutterServerError,
  GivebutterValidationError,
} from '@mcp/givebutter/types/givebutter.errors'

type TErrorFactory = (message: string, details: unknown) => GivebutterError

const STATUS_ERROR_MAP: Record<number, TErrorFactory> = {
  401: (message, details) => new GivebutterAuthError(message, details),
  403: (message, details) => new GivebutterForbiddenError(message, details),
  404: (message, details) => new GivebutterNotFoundError(message, details),
  422: (message, details) => new GivebutterValidationError(message, details),
}

export const extractErrorMessage = (body: unknown, fallback: string): string => {
  if (typeof body === 'object' && body !== null) {
    const record = body as Record<string, unknown>
    if (typeof record.message === 'string') return record.message
    if (typeof record.error === 'string') return record.error
  }
  return fallback
}

export const mapHttpError = (
  status: number,
  body: unknown,
  retryAfter?: number,
): GivebutterError => {
  const fallback = `Givebutter request failed with status ${status}`
  const message = extractErrorMessage(body, fallback)

  if (status === 429) return new GivebutterRateLimitError(message, retryAfter, body)
  const factory = STATUS_ERROR_MAP[status]
  if (factory) return factory(message, body)
  if (status >= 500) return new GivebutterServerError(message, status, body)
  return new GivebutterError(message, status, 'givebutter_http', body)
}
