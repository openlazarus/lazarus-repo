import { useCallback, useRef, useState } from 'react'

import { useClickAway } from './use-click-away'

export function usePopover<T extends HTMLElement = HTMLDivElement>() {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<T>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useClickAway({
    refs: ref,
    triggerRef,
    handler: () => setIsOpen(false),
    enabled: isOpen,
  })

  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  return { isOpen, toggle, open, close, ref, triggerRef }
}
