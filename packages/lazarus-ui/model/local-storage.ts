import { StorageAdapter } from './repository'

/**
 * LocalStorage adapter for the Repository
 */
export class LocalStorageAdapter implements StorageAdapter {
  private prefix: string
  private isServer: boolean

  constructor(prefix: string = 'lazarus:') {
    this.prefix = prefix
    this.isServer = typeof window === 'undefined'
  }

  /**
   * Get an item from localStorage
   */
  async getItem<T>(key: string): Promise<T | null> {
    if (this.isServer) return null

    try {
      const serialized = localStorage.getItem(this.prefix + key)

      if (serialized) {
        return JSON.parse(serialized) as T
      }

      return null
    } catch (error) {
      console.error(
        `Failed to get item with key ${key} from localStorage:`,
        error,
      )
      return null
    }
  }

  /**
   * Set an item in localStorage
   */
  async setItem<T>(key: string, value: T): Promise<void> {
    if (this.isServer) return

    try {
      const serialized = JSON.stringify(value)
      localStorage.setItem(this.prefix + key, serialized)
    } catch (error) {
      console.error(
        `Failed to set item with key ${key} in localStorage:`,
        error,
      )
    }
  }

  /**
   * Remove an item from localStorage
   */
  async removeItem(key: string): Promise<void> {
    if (this.isServer) return

    try {
      localStorage.removeItem(this.prefix + key)
    } catch (error) {
      console.error(
        `Failed to remove item with key ${key} from localStorage:`,
        error,
      )
    }
  }

  /**
   * Get all items from localStorage with the prefix
   */
  async getAllItems(): Promise<Record<string, any>> {
    if (this.isServer) return {}

    try {
      const result: Record<string, any> = {}

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)

        if (key && key.startsWith(this.prefix)) {
          const unprefixedKey = key.substring(this.prefix.length)
          const serialized = localStorage.getItem(key)

          if (serialized) {
            result[unprefixedKey] = JSON.parse(serialized)
          }
        }
      }

      return result
    } catch (error) {
      console.error('Failed to get all items from localStorage:', error)
      return {}
    }
  }
}
