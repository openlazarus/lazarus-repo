/**
 * Utilities for managing focus and events between components
 */

/**
 * Checks if a DOM event originated from a specified element or its descendants
 * @param event The DOM event to check
 * @param element The element to check against
 * @returns True if the event originated from the element or its descendants
 */
export const isEventFromElement = (
  event: Event,
  element: HTMLElement | null,
): boolean => {
  if (!element) return false

  const path = event.composedPath?.() || []
  return path.includes(element)
}

/**
 * Determines if a click should be trapped within a component
 * @param event The click event
 * @param focusableSelectors Array of CSS selectors for elements that should trap focus
 * @param containerElement The container element to check within
 * @returns True if the click should be trapped
 */
export const shouldTrapClick = (
  event: MouseEvent,
  focusableSelectors: string[],
  containerElement: HTMLElement | null,
): boolean => {
  if (!containerElement) return false

  // Get the target element
  const target = event.target as HTMLElement

  // Check if the click happened inside the container
  if (!containerElement.contains(target)) {
    return false
  }

  // Check if the click target matches any of the focusable selectors
  return focusableSelectors.some((selector) => {
    return target.matches(selector) || !!target.closest(selector)
  })
}

/**
 * Safely stops event propagation only for specific keys
 * @param event The keyboard event
 * @param keysToTrap Array of keys to trap
 * @returns True if the event was trapped
 */
export const trapKeyboardEvent = (
  event: KeyboardEvent,
  keysToTrap: string[],
): boolean => {
  if (keysToTrap.includes(event.key)) {
    event.stopPropagation()
    return true
  }
  return false
}

/**
 * Creates a unique ID for an editor component
 * @param type The type of editor
 * @param id An optional existing ID to use as part of the unique ID
 * @returns A unique ID string
 */
export const createEditorId = (type: string, id?: string): string => {
  const randomPart = Math.random().toString(36).substring(2, 9)
  return `${type}-editor-${id || randomPart}`
}

/**
 * Helper function to determine if an element is a text input field
 * @param element The element to check
 * @returns True if the element is a text input field
 */
export const isTextInputElement = (element: HTMLElement | null): boolean => {
  if (!element) return false

  const tagName = element.tagName.toLowerCase()
  const inputType = element.getAttribute('type')?.toLowerCase()

  // Check for various input elements
  if (tagName === 'textarea') return true
  if (
    tagName === 'input' &&
    (!inputType ||
      inputType === 'text' ||
      inputType === 'search' ||
      inputType === 'email' ||
      inputType === 'password' ||
      inputType === 'tel' ||
      inputType === 'url')
  )
    return true

  // Check for contentEditable elements
  if (element.getAttribute('contenteditable') === 'true') return true

  return false
}

/**
 * Safely handles focus transition between components
 * @param from Element losing focus
 * @param to Element gaining focus
 * @param callback Optional callback to run after focus is transferred
 */
export const transferFocus = (
  from: HTMLElement | null,
  to: HTMLElement | null,
  callback?: () => void,
): void => {
  // First blur the current element to trigger any blur handlers
  if (from && document.activeElement === from) {
    from.blur()
  }

  // Short timeout to ensure blur handlers complete
  setTimeout(() => {
    // Focus the new element
    if (to) {
      to.focus()

      // Run callback if provided
      if (callback) {
        callback()
      }
    }
  }, 0)
}

/**
 * Prevents browser navigation from horizontal wheel/swipe events
 * @param event The wheel event to check
 * @returns True if the event was handled and default prevented
 */
export const preventBrowserNavigationOnSwipe = (
  event: WheelEvent | React.WheelEvent,
): boolean => {
  // Lower the threshold for detection and make more aggressive for Chrome
  if (Math.abs(event.deltaX) > 10) {
    // Lower threshold to catch more gestures
    // Check if we're in an element that should scroll horizontally
    const target = event.target as HTMLElement
    const isInScrollableArea =
      target.closest('.custom-scrollbar') ||
      target.closest('.thin-scrollbar') ||
      target.closest('.invisible-scrollbar') ||
      target.closest('[data-allow-horizontal-scroll="true"]')

    // Is this potentially a navigation gesture?
    const isPotentialNavigationGesture =
      Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.5 && // More horizontal than vertical
      Math.abs(event.deltaX) > 20 // With sufficient force

    // For Chrome on Mac, always prevent default for horizontal swipes that look like navigation gestures
    // unless they're in a scrollable area and that area can actually scroll in that direction
    if (isPotentialNavigationGesture) {
      if (!isInScrollableArea) {
        // Not in a scrollable area, definitely prevent
        event.preventDefault()
        event.stopPropagation()
        return true
      } else {
        // In a scrollable area, but check if we're at the edge
        const scrollableElement = (target.closest('.custom-scrollbar') ||
          target.closest('.thin-scrollbar') ||
          target.closest('.invisible-scrollbar') ||
          target.closest(
            '[data-allow-horizontal-scroll="true"]',
          )) as HTMLElement

        if (scrollableElement) {
          const canScrollLeft = scrollableElement.scrollLeft > 0
          const canScrollRight =
            scrollableElement.scrollLeft + scrollableElement.clientWidth <
            scrollableElement.scrollWidth

          // If trying to scroll left but already at left edge, or trying to scroll right but at right edge
          if (
            (event.deltaX < 0 && !canScrollLeft) ||
            (event.deltaX > 0 && !canScrollRight)
          ) {
            event.preventDefault()
            event.stopPropagation()
            return true
          }
        }
      }
    }
  }

  return false
}
