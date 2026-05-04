/**
 * EventBus - Type-safe central event emitter for internal server-side events
 *
 * The EventBus provides a centralized way for different parts of the system
 * to communicate through events. It uses TypeScript generics to ensure type
 * safety when emitting and listening to events.
 *
 * Usage:
 *   eventBus.emit('execution:registered', { execution });
 *   eventBus.on('execution:registered', ({ execution }) => { ... });
 */

import { EventEmitter } from 'events'
import { createLogger } from '@utils/logger'
import { RealtimeEventType, RealtimeEventPayloads, RealtimeEventHandler } from './event-types'

const log = createLogger('event-bus')

/**
 * Type-safe EventBus class
 */
export class EventBus extends EventEmitter {
  constructor() {
    super()
    // Set max listeners to avoid warnings in high-traffic scenarios
    this.setMaxListeners(100)
  }

  /**
   * Emit a type-safe event
   *
   * @param event - Event type
   * @param payload - Event payload (type-checked)
   */
  emit<K extends RealtimeEventType>(event: K, payload: RealtimeEventPayloads[K]): boolean {
    // Log event emission for debugging (can be disabled in production)
    if (process.env.DEBUG_EVENTS === 'true') {
      log.info({ event, payload }, 'Emit')
    }

    return super.emit(event, payload)
  }

  /**
   * Listen to a type-safe event
   *
   * @param event - Event type
   * @param handler - Event handler (type-checked)
   */
  on<K extends RealtimeEventType>(event: K, handler: RealtimeEventHandler<K>): this {
    return super.on(event, handler as any)
  }

  /**
   * Listen to an event once
   *
   * @param event - Event type
   * @param handler - Event handler (type-checked)
   */
  once<K extends RealtimeEventType>(event: K, handler: RealtimeEventHandler<K>): this {
    return super.once(event, handler as any)
  }

  /**
   * Remove a specific event handler
   *
   * @param event - Event type
   * @param handler - Event handler to remove
   */
  off<K extends RealtimeEventType>(event: K, handler: RealtimeEventHandler<K>): this {
    return super.off(event, handler as any)
  }

  /**
   * Remove all listeners for an event (or all events if none specified)
   *
   * @param event - Optional event type
   */
  removeAllListeners(event?: RealtimeEventType): this {
    return super.removeAllListeners(event)
  }

  /**
   * Get the number of listeners for an event
   *
   * @param event - Event type
   */
  listenerCount(event: RealtimeEventType): number {
    return super.listenerCount(event)
  }

  /**
   * Get all event names currently being listened to
   */
  eventNames(): RealtimeEventType[] {
    return super.eventNames() as RealtimeEventType[]
  }

  /**
   * Get statistics about current event listeners
   */
  getStats(): {
    totalListeners: number
    eventCounts: Record<string, number>
  } {
    const eventNames = this.eventNames()
    const eventCounts: Record<string, number> = {}
    let totalListeners = 0

    for (const event of eventNames) {
      const count = this.listenerCount(event)
      eventCounts[event] = count
      totalListeners += count
    }

    return {
      totalListeners,
      eventCounts,
    }
  }

  /**
   * Enable debug logging for events
   */
  enableDebug(): void {
    process.env.DEBUG_EVENTS = 'true'
    log.info('Debug logging enabled')
  }

  /**
   * Disable debug logging for events
   */
  disableDebug(): void {
    process.env.DEBUG_EVENTS = 'false'
    log.info('Debug logging disabled')
  }
}

// Export singleton instance
export const eventBus = new EventBus()
