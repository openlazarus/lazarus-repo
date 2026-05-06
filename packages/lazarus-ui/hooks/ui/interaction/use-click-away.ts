import { RefObject, useEffect } from 'react'

/**
 * A hook that handles clicks/touches outside of specified elements
 *
 * @param options - Configuration object
 * @param options.refs - Single ref or array of refs to monitor for outside clicks
 * @param options.handler - Callback function to run when a click occurs outside the elements
 * @param options.triggerRef - Optional ref that won't trigger the handler when clicked
 * @param options.enabled - Optional flag to enable/disable the listener
 *
 * Example usage:
 * ```tsx
 * const menuRef = useRef(null)
 * const buttonRef = useRef(null)
 *
 * // Single ref
 * useClickAway({ refs: menuRef, handler: () => setIsOpen(false) })
 *
 * // Multiple refs
 * useClickAway({
 *   refs: [menuRef, otherRef],
 *   triggerRef: buttonRef,
 *   handler: () => setIsOpen(false)
 * })
 * ```
 *
 * This hook is useful for closing modals, dropdowns, and other elements when clicking outside.
 * It handles both mouse clicks and touch events, and properly cleans up event listeners.
 */
type Handler = (event: MouseEvent | TouchEvent) => void

type UseClickAwayProps<T extends HTMLElement = HTMLElement> = {
  refs: RefObject<T> | RefObject<T>[]
  handler: Handler
  triggerRef?: RefObject<T>
  enabled?: boolean
}

export function useClickAway<T extends HTMLElement = HTMLElement>({
  refs,
  handler,
  triggerRef,
  enabled = true,
}: UseClickAwayProps<T>) {
  useEffect(() => {
    if (!enabled) return

    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      const refsArray = Array.isArray(refs) ? refs : [refs]

      if (triggerRef?.current?.contains(target)) {
        return
      }

      const isClickInside = refsArray.some(
        (ref) => ref.current && ref.current.contains(target),
      )

      if (!isClickInside) {
        handler(event)
      }
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [refs, handler, triggerRef, enabled])
}
