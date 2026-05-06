import { RefObject, useCallback } from 'react'

type ScrollOptions = {
  behavior?: ScrollBehavior
  block?: ScrollLogicalPosition
  inline?: ScrollLogicalPosition
  offset?: number
}

export const useScrollToRef = (
  ref?: RefObject<HTMLElement>,
  options: ScrollOptions = {
    behavior: 'smooth',
    block: 'start',
    inline: 'nearest',
    offset: 0,
  },
) => {
  const scrollTo = useCallback(() => {
    if (ref?.current) {
      console.log('SHIIIIIIIII')
      const elementPosition = ref.current.getBoundingClientRect().top
      const offsetPosition =
        elementPosition + window.pageYOffset - (options.offset || 0)

      window.scrollTo({
        top: offsetPosition,
        behavior: options.behavior,
      })
    } else {
      window.scrollTo({
        top: 0,
        behavior: options.behavior,
      })
    }
  }, [ref, options])

  return scrollTo
}
