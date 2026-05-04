export class GivebutterError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: unknown

  constructor(message: string, statusCode: number, code: string, details?: unknown) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }
}

export class GivebutterAuthError extends GivebutterError {
  constructor(message = 'Givebutter authentication failed', details?: unknown) {
    super(message, 401, 'givebutter_auth', details)
  }
}

export class GivebutterForbiddenError extends GivebutterError {
  constructor(message = 'Givebutter access denied', details?: unknown) {
    super(message, 403, 'givebutter_forbidden', details)
  }
}

export class GivebutterNotFoundError extends GivebutterError {
  constructor(message = 'Givebutter resource not found', details?: unknown) {
    super(message, 404, 'givebutter_not_found', details)
  }
}

export class GivebutterValidationError extends GivebutterError {
  constructor(message = 'Givebutter validation failed', details?: unknown) {
    super(message, 422, 'givebutter_validation', details)
  }
}

export class GivebutterRateLimitError extends GivebutterError {
  public readonly retryAfterSeconds?: number

  constructor(
    message = 'Givebutter rate limit exceeded',
    retryAfterSeconds?: number,
    details?: unknown,
  ) {
    super(message, 429, 'givebutter_rate_limit', details)
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export class GivebutterServerError extends GivebutterError {
  constructor(message = 'Givebutter server error', statusCode = 500, details?: unknown) {
    super(message, statusCode, 'givebutter_server', details)
  }
}

export class GivebutterNetworkError extends GivebutterError {
  constructor(message = 'Givebutter network error', details?: unknown) {
    super(message, 0, 'givebutter_network', details)
  }
}
