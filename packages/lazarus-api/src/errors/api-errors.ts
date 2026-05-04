/**
 * Generic API error classes for HTTP responses
 * Can be used across all domains (workspace, auth, billing, etc.)
 */

export class ApiError extends Error {
  public readonly statusCode: number
  public readonly errorMessage?: string

  constructor(error: string, statusCode: number, message?: string) {
    super(error)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.errorMessage = message
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    const response: any = {
      error: this.message, // Short title
    }

    // Add detailed message if provided
    if (this.errorMessage) {
      response.message = this.errorMessage
    }

    return response
  }
}

// 400 Bad Request
export class BadRequestError extends ApiError {
  constructor(error: string, message?: string) {
    super(error, 400, message)
  }
}

// 401 Unauthorized
export class UnauthorizedError extends ApiError {
  constructor(error: string = 'Authentication required', message?: string) {
    super(error, 401, message)
  }
}

// 402 Payment Required
export class PaymentRequiredError extends ApiError {
  constructor(error: string = 'insufficient_credits', message?: string) {
    super(error, 402, message)
  }
}

// 403 Forbidden
export class ForbiddenError extends ApiError {
  constructor(error: string, message?: string) {
    super(error, 403, message)
  }
}

// 404 Not Found
export class NotFoundError extends ApiError {
  constructor(resource: string, identifier?: string) {
    const error = `${resource} not found`
    const message = identifier ? `${resource} with ID "${identifier}" was not found` : undefined
    super(error, 404, message)
  }
}

// 409 Conflict
export class ConflictError extends ApiError {
  constructor(error: string, message?: string) {
    super(error, 409, message)
  }
}

// 413 Payload Too Large
export class PayloadTooLargeError extends ApiError {
  public readonly size?: number
  public readonly limit?: number

  constructor(error: string, message?: string, size?: number, limit?: number) {
    super(error, 413, message)
    this.size = size
    this.limit = limit
  }

  toJSON() {
    return {
      ...super.toJSON(),
      ...(this.size !== undefined && { size: this.size }),
      ...(this.limit !== undefined && { limit: this.limit }),
    }
  }
}

// 422 Unprocessable Entity
export class ValidationError extends ApiError {
  constructor(error: string, message?: string) {
    super(error, 422, message)
  }
}

// 422 Unprocessable Entity — execution accepted but failed (e.g. agent error, insufficient credits)
export class ExecutionFailedError extends ApiError {
  public readonly executionId?: string

  constructor(error: string, message?: string, executionId?: string) {
    super(error, 422, message)
    this.executionId = executionId
  }

  toJSON() {
    return {
      ...super.toJSON(),
      ...(this.executionId && { executionId: this.executionId }),
    }
  }
}

// 429 Too Many Requests
export class RateLimitError extends ApiError {
  constructor(message?: string) {
    super('Rate limit exceeded', 429, message)
  }
}

// 500 Internal Server Error
export class InternalServerError extends ApiError {
  constructor(message?: string) {
    super('Internal server error', 500, message)
  }
}

// 503 Service Unavailable
export class ServiceUnavailableError extends ApiError {
  constructor(message?: string) {
    super('Service temporarily unavailable', 503, message)
  }
}

/**
 * Domain-specific error creators
 */

export function workspaceNotFound(workspaceId: string) {
  return new NotFoundError('Workspace', workspaceId)
}

export function fileNotFound(filePath: string) {
  return new NotFoundError('File', filePath)
}

export function pathOutsideWorkspace(_path: string) {
  return new BadRequestError('Path outside workspace boundary')
}

export function userNotFound(userId: string) {
  return new NotFoundError('User', userId)
}

export function invalidCredentials() {
  return new UnauthorizedError('Invalid credentials')
}

export function insufficientPermissions(message?: string) {
  return new ForbiddenError(message || 'Insufficient permissions')
}

export function insufficientCredits() {
  return new BadRequestError('Insufficient credits')
}

export function agentNotFound(agentId: string) {
  return new NotFoundError('Agent', agentId)
}

export function agentDisabled(agentId: string) {
  return new BadRequestError('Agent is disabled', `Agent "${agentId}" is currently disabled`)
}

/**
 * Kapso API error with structured fields for WhatsApp error handling
 */
export class KapsoApiError extends ApiError {
  public readonly errorBody: string
  public readonly isSessionExpired: boolean

  constructor(statusCode: number, statusText: string, errorBody: string) {
    super(`Kapso API error: ${statusCode} ${statusText}`, statusCode, errorBody)
    this.name = 'KapsoApiError'
    this.errorBody = errorBody
    this.isSessionExpired = statusCode === 422 && errorBody.toLowerCase().includes('24-hour window')
  }
}
