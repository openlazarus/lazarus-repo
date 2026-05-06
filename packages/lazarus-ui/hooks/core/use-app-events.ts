import { useCallback, useEffect, useRef } from 'react'

/**
 * Generic window event hook — works with both custom app events and native browser events.
 *
 * Usage:
 *   // Custom app events (payload in CustomEvent.detail)
 *   type MyEvents = { itemSaved: { id: string } }
 *   useAppEvents<MyEvents>({ itemSaved: (d) => refetch() })
 *   const { emit } = useAppEvents<MyEvents>()
 *   emit('itemSaved', { id: '123' })
 *
 *   // Native browser events (receives the raw Event)
 *   useAppEvents<{ dragover: DragEvent; drop: DragEvent }>({
 *     dragover: (e) => e.preventDefault(),
 *     drop: (e) => e.preventDefault(),
 *   })
 */

// ── Shared event maps ──────────────────────────────────────────────

export type SourceEvents = {
  sourceCreated: string
  sourceDeleted: { sourceName: string }
  sourceToggled: { name: string; enabled: boolean }
}

export type AgentEvents = {
  agentCreated: { agentId: string; [key: string]: any }
  agentDeleted: { agentId: string }
  webhookCreated: { webhookUrl: string }
}

type EventMap = Record<string, any>

type EventListeners<T extends EventMap> = {
  [K in keyof T]?: (detail: T[K]) => void
}

export function useAppEvents<T extends EventMap = EventMap>(
  listeners?: EventListeners<T>,
  options?: { capture?: boolean },
) {
  const listenersRef = useRef(listeners)
  listenersRef.current = listeners
  const capture = options?.capture ?? false

  useEffect(() => {
    if (!listeners) return

    const eventNames = Object.keys(listeners) as (keyof T & string)[]

    const wrapped = (e: Event) => {
      const handler = listenersRef.current?.[e.type as keyof T]
      if (!handler) return
      // CustomEvents carry payload in .detail; native events are passed directly
      handler(e instanceof CustomEvent ? e.detail : e)
    }

    for (const name of eventNames) {
      window.addEventListener(name, wrapped, capture)
    }

    return () => {
      for (const name of eventNames) {
        window.removeEventListener(name, wrapped, capture)
      }
    }
    // Only re-subscribe when the set of event names changes
  }, [listeners && Object.keys(listeners).sort().join(','), capture])

  const emit = useCallback(
    <K extends keyof T & string>(event: K, detail: T[K]) => {
      window.dispatchEvent(new CustomEvent(event, { detail }))
    },
    [],
  )

  return { emit }
}
