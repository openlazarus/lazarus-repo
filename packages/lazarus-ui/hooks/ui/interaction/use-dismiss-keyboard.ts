import { useCallback } from 'react'

/**
 * Hook to dismiss the keyboard on mobile devices with robust iOS support
 */
export function useDismissKeyboard() {
  const dismissKeyboard = useCallback(() => {
    // Check if we're on an iOS device
    const isIOS =
      /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

    // Special handling for Lexical editor
    // Find all Lexical-specific elements and force blur
    const lexicalElements = [
      ...Array.from(document.querySelectorAll('.editor-input')),
      ...Array.from(document.querySelectorAll('[data-lexical-editor]')),
      ...Array.from(document.querySelectorAll('.ContentEditable__root')),
      ...Array.from(document.querySelectorAll('[role="textbox"]')),
      ...Array.from(document.querySelectorAll('.message-bar-paragraph')),
    ]

    lexicalElements.forEach((element) => {
      if (element instanceof HTMLElement) {
        // Force remove focus
        element.blur()

        // For contenteditable elements, temporarily disable
        if (element.hasAttribute('contenteditable')) {
          element.setAttribute('contenteditable', 'false')
          // Re-enable after a short delay
          setTimeout(() => {
            element.setAttribute('contenteditable', 'true')
          }, 200)
        }

        // Dispatch blur event
        element.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
      }
    })

    // Strategy 1: Blur active element immediately
    const activeElement = document.activeElement
    if (activeElement && 'blur' in activeElement) {
      ;(activeElement as HTMLElement).blur()
    }

    // Strategy 2: Find and blur all Lexical editor elements
    const lexicalEditors = document.querySelectorAll(
      '[contenteditable="true"], .editor-input',
    )
    lexicalEditors.forEach((el) => {
      if (el instanceof HTMLElement) {
        el.blur()
        el.setAttribute('contenteditable', 'false')
        setTimeout(() => {
          el.setAttribute('contenteditable', 'true')
        }, 100)
      }
    })

    // Strategy 3: Focus management with temporary input (most reliable for iOS)
    const tempInput = document.createElement('input')
    tempInput.setAttribute('type', 'text')
    tempInput.setAttribute('readonly', 'readonly')
    tempInput.setAttribute('aria-hidden', 'true')
    tempInput.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: 0;
      height: 0;
      opacity: 0;
      font-size: 16px;
    `

    document.body.appendChild(tempInput)

    // For iOS, we need to ensure focus/blur happens in the next tick
    if (isIOS) {
      // iOS needs the focus to happen after a user interaction
      requestAnimationFrame(() => {
        tempInput.focus({ preventScroll: true })
        tempInput.setSelectionRange(0, 0)

        setTimeout(() => {
          tempInput.blur()
          document.body.removeChild(tempInput)

          // Additional iOS hack: trigger a fake click on body
          const event = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: 0,
            clientY: 0,
          })
          document.body.dispatchEvent(event)
        }, 50)
      })
    } else {
      tempInput.focus()
      setTimeout(() => {
        tempInput.blur()
        document.body.removeChild(tempInput)
      }, 50)
    }

    // Strategy 4: Blur all input-like elements
    const inputs = document.querySelectorAll(
      'input, textarea, select, [contenteditable="true"], [role="textbox"]',
    )
    inputs.forEach((el) => {
      if (el instanceof HTMLElement) {
        el.blur()
      }
    })

    // Strategy 5: Force visual viewport update (works on newer iOS versions)
    if ('visualViewport' in window) {
      const currentHeight = window.visualViewport?.height || 0
      const windowHeight = window.innerHeight

      // If keyboard is showing (viewport is smaller than window)
      if (currentHeight < windowHeight * 0.75) {
        window.scrollTo(0, 1)
        setTimeout(() => window.scrollTo(0, 0), 100)
      }
    }

    // Strategy 6: Programmatically trigger touch event
    if (isIOS) {
      const touchEvent = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        view: window,
        touches: [],
        targetTouches: [],
        changedTouches: [],
      })
      document.body.dispatchEvent(touchEvent)
    }

    // Strategy 7: Force a minimal scroll to trigger keyboard dismissal
    const scrollY = window.pageYOffset
    window.scrollTo(0, scrollY + 1)
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY)
    })

    // Strategy 8: For stubborn iOS cases, use the viewport meta tag hack
    if (isIOS) {
      const viewport = document.querySelector('meta[name="viewport"]')
      if (viewport) {
        const originalContent = viewport.getAttribute('content') || ''
        viewport.setAttribute(
          'content',
          originalContent + ', maximum-scale=1.0',
        )
        setTimeout(() => {
          viewport.setAttribute('content', originalContent)
        }, 100)
      }
    }
  }, [])

  return dismissKeyboard
}
