export interface ITtlCache<K, V> {
  /** Get a value, or undefined if missing/expired. */
  get(key: K): V | undefined

  /** Set a value with the configured TTL. */
  set(key: K, value: V): void

  /** Check if a key exists and is not expired. */
  has(key: K): boolean

  /** Delete a specific key. */
  delete(key: K): boolean

  /** Remove all expired entries; returns count removed. */
  prune(): number

  /** Clear all entries. */
  clear(): void

  /** Number of entries (including potentially expired ones). */
  readonly size: number

  /** Stop the automatic cleanup timer and clear all entries. */
  destroy(): void
}
