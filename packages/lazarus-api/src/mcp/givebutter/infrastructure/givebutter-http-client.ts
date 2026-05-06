import { IGivebutterHttpClient } from './givebutter-http-client.interface'
import { toQuery } from './query-serializer'
import { mapHttpError } from './error-mapper'
import {
  GivebutterNetworkError,
  GivebutterRateLimitError,
} from '@mcp/givebutter/types/givebutter.errors'

const DEFAULT_MAX_RETRIES = 3
const DEFAULT_TIMEOUT_MS = 30000

type TClientOptions = {
  apiKey: string
  baseUrl: string
  maxRetries?: number
  timeoutMs?: number
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export class GivebutterHttpClient implements IGivebutterHttpClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly maxRetries: number
  private readonly timeoutMs: number

  constructor(options: TClientOptions) {
    this.apiKey = options.apiKey
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  get<T>(path: string, query?: Record<string, unknown>): Promise<T> {
    return this.sendWithRetry<T>(this.buildUrl(path, query), { method: 'GET' })
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.sendWithRetry<T>(this.buildUrl(path), {
      method: 'POST',
      body: this.encodeBody(body),
    })
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.sendWithRetry<T>(this.buildUrl(path), {
      method: 'PUT',
      body: this.encodeBody(body),
    })
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.sendWithRetry<T>(this.buildUrl(path), {
      method: 'PATCH',
      body: this.encodeBody(body),
    })
  }

  delete<T>(path: string): Promise<T> {
    return this.sendWithRetry<T>(this.buildUrl(path), { method: 'DELETE' })
  }

  private buildUrl(path: string, query?: Record<string, unknown>): string {
    const qs = query ? toQuery(query) : ''
    const suffix = qs ? `?${qs}` : ''
    return `${this.baseUrl}${path}${suffix}`
  }

  private encodeBody(body: unknown): string | undefined {
    return body === undefined ? undefined : JSON.stringify(body)
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
  }

  private async sendWithRetry<T>(url: string, init: RequestInit): Promise<T> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        return await this.sendOnce<T>(url, init)
      } catch (err) {
        if (!this.shouldRetry(err, attempt)) throw err
        await sleep(this.retryDelayMs(err))
      }
    }
    throw new GivebutterNetworkError('Givebutter retry limit exceeded', { url })
  }

  private async sendOnce<T>(url: string, init: RequestInit): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const res = await fetch(url, { ...init, headers: this.headers(), signal: controller.signal })
      if (!res.ok) throw await this.toError(res)
      return (await this.parseBody(res)) as T
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new GivebutterNetworkError('Givebutter request timed out', { url })
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  }

  private async toError(res: Response): Promise<Error> {
    const body = await this.safeJson(res)
    const retryAfter = this.parseRetryAfter(res.headers.get('Retry-After'))
    return mapHttpError(res.status, body, retryAfter)
  }

  private async parseBody(res: Response): Promise<unknown> {
    if (res.status === 204) return undefined
    return this.safeJson(res)
  }

  private async safeJson(res: Response): Promise<unknown> {
    const text = await res.text()
    if (!text) return undefined
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  private parseRetryAfter(header: string | null): number | undefined {
    if (!header) return undefined
    const n = Number(header)
    return Number.isFinite(n) ? n : undefined
  }

  private shouldRetry(err: unknown, attempt: number): boolean {
    if (attempt >= this.maxRetries) return false
    return err instanceof GivebutterRateLimitError
  }

  private retryDelayMs(err: unknown): number {
    if (err instanceof GivebutterRateLimitError && err.retryAfterSeconds) {
      return err.retryAfterSeconds * 1000
    }
    return 1000
  }
}
