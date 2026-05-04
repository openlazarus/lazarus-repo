/**
 * Generic TTL (Time-To-Live) Cache
 *
 * A reusable in-memory cache with configurable expiration.
 * Supports automatic cleanup of expired entries.
 *
 * Usage:
 *   const cache = new TtlCache<string, string>({ ttlMs: 60_000 });
 *   cache.set('key', 'value');
 *   const val = cache.get('key'); // 'value' or undefined if expired
 */

export interface TtlCacheOptions {
  /** Time-to-live in milliseconds */
  ttlMs: number
  /** Maximum number of entries before pruning (default: 10_000) */
  maxSize?: number
  /** Interval in ms for automatic cleanup of expired entries (default: disabled) */
  cleanupIntervalMs?: number
}

interface CacheEntry<V> {
  value: V
  expiresAt: number
}

import type { ITtlCache } from './ttl-cache.interface'

export class TtlCache<K, V> implements ITtlCache<K, V> {
  private readonly entries = new Map<K, CacheEntry<V>>()
  private readonly ttlMs: number
  private readonly maxSize: number
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor(options: TtlCacheOptions) {
    this.ttlMs = options.ttlMs
    this.maxSize = options.maxSize ?? 10_000

    if (options.cleanupIntervalMs) {
      this.cleanupTimer = setInterval(() => this.prune(), options.cleanupIntervalMs)
      // Allow the process to exit even if the timer is still running
      if (this.cleanupTimer.unref) {
        this.cleanupTimer.unref()
      }
    }
  }

  /** Get a value, or undefined if missing/expired */
  get(key: K): V | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined

    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key)
      return undefined
    }

    return entry.value
  }

  /** Set a value with the configured TTL */
  set(key: K, value: V): void {
    this.entries.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    })

    if (this.entries.size > this.maxSize) {
      this.prune()
    }
  }

  /** Check if a key exists and is not expired */
  has(key: K): boolean {
    return this.get(key) !== undefined
  }

  /** Delete a specific key */
  delete(key: K): boolean {
    return this.entries.delete(key)
  }

  /** Remove all expired entries */
  prune(): number {
    const now = Date.now()
    let removed = 0
    for (const [key, entry] of this.entries) {
      if (now > entry.expiresAt) {
        this.entries.delete(key)
        removed++
      }
    }
    return removed
  }

  /** Clear all entries */
  clear(): void {
    this.entries.clear()
  }

  /** Number of entries (including potentially expired ones) */
  get size(): number {
    return this.entries.size
  }

  /** Stop the automatic cleanup timer */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.entries.clear()
  }
}
