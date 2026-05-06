import { $applyNodeReplacement, TextNode } from 'lexical'

import type {
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedTextNode,
} from 'lexical'

export type DiffType = 'added' | 'removed' | 'unchanged'

export interface SerializedDiffTextNode extends SerializedTextNode {
  diffType: DiffType
  changeIndex: number
  isFocused?: boolean
}

export class DiffTextNode extends TextNode {
  __diffType: DiffType
  __changeIndex: number
  __isFocused: boolean
  __domRef: HTMLElement | null

  static getType(): string {
    return 'diff-text'
  }

  static clone(node: DiffTextNode): DiffTextNode {
    return new DiffTextNode(
      node.__diffType,
      node.__changeIndex,
      node.__text,
      node.__key,
      node.__isFocused,
    )
  }

  static importJSON(serializedNode: SerializedDiffTextNode): DiffTextNode {
    const { text, diffType, changeIndex, isFocused } = serializedNode
    const node = $createDiffTextNode(diffType, changeIndex, text, isFocused)
    node.setFormat(serializedNode.format)
    node.setDetail(serializedNode.detail)
    node.setMode(serializedNode.mode)
    node.setStyle(serializedNode.style)
    return node
  }

  constructor(
    diffType: DiffType,
    changeIndex: number,
    text: string,
    key?: NodeKey,
    isFocused?: boolean,
  ) {
    super(text, key)
    this.__diffType = diffType
    this.__changeIndex = changeIndex
    this.__isFocused = isFocused || false
    this.__domRef = null
  }

  exportJSON(): SerializedDiffTextNode {
    return {
      ...super.exportJSON(),
      diffType: this.__diffType,
      changeIndex: this.__changeIndex,
      isFocused: this.__isFocused,
      type: 'diff-text',
    }
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config)
    this.applyDiffStyles(dom)
    this.__domRef = dom

    // Add data attribute for identifying nodes by change index
    dom.dataset.changeIndex = String(this.__changeIndex)

    // Only add hover-based interactions for diff changes (not unchanged)
    if (this.__diffType !== 'unchanged') {
      // Create simple line wrapper without borders or indicators
      const lineWrapper = document.createElement('div')
      lineWrapper.className = `diff-line-wrapper diff-line-${this.__diffType}`
      lineWrapper.dataset.changeIndex = String(this.__changeIndex)
      lineWrapper.style.cssText = `
        position: relative;
        width: 100%;
        min-height: 1.5em;
        padding: 0.25rem 0.5rem;
        margin: 0.125rem 0;
        border-radius: 6px;
        background: ${
          this.__diffType === 'added'
            ? 'linear-gradient(135deg, rgba(48, 209, 88, 0.08) 0%, rgba(48, 209, 88, 0.04) 100%)'
            : 'linear-gradient(135deg, rgba(255, 69, 58, 0.08) 0%, rgba(255, 69, 58, 0.04) 100%)'
        };
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: default;
      `

      // Create bottom-right action buttons with glow effect
      const actionButtons = document.createElement('div')
      actionButtons.className = 'diff-action-buttons'
      actionButtons.style.cssText = `
        position: absolute;
        bottom: -35px;
        right: 0;
        display: flex;
        gap: 8px;
        align-items: center;
        opacity: 0;
        transform: translateY(-8px) scale(0.95);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
        z-index: 20;
      `

      // Accept button with command-like design
      const acceptBtn = document.createElement('div')
      acceptBtn.className = 'diff-accept-btn'
      acceptBtn.innerHTML = `
        <div class="button-content">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 10v12" />
            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
          </svg>
          <span class="action-text">Accept</span>
          <span class="shortcut-keys">
            <span class="key">⌘</span><span class="key">Y</span>
          </span>
        </div>
      `
      acceptBtn.style.cssText = `
        background: white;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 6px;
        padding: 6px 10px;
        color: #30d158;
        cursor: pointer;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 500;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        user-select: none;
      `

      // Reject button with command-like design
      const rejectBtn = document.createElement('div')
      rejectBtn.className = 'diff-reject-btn'
      rejectBtn.innerHTML = `
        <div class="button-content">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 14V2" />
            <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
          </svg>
          <span class="action-text">Reject</span>
          <span class="shortcut-keys">
            <span class="key">⌘</span><span class="key">N</span>
          </span>
        </div>
      `
      rejectBtn.style.cssText = `
        background: white;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 6px;
        padding: 6px 10px;
        color: #ff453a;
        cursor: pointer;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 500;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        user-select: none;
      `

      // Add command-like styling
      const commandStyle = document.createElement('style')
      commandStyle.textContent = `
        .button-content {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .action-text {
          color: #1d1d1f;
          font-weight: 500;
        }
        .shortcut-keys {
          display: flex;
          align-items: center;
          gap: 1px;
          margin-left: 4px;
        }
        .key {
          background: rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 3px;
          padding: 1px 3px;
          font-size: 9px;
          font-weight: 600;
          color: #1d1d1f;
          min-width: 12px;
          text-align: center;
        }
        .diff-accept-btn:hover {
          background: rgba(48, 209, 88, 0.05) !important;
          border-color: rgba(48, 209, 88, 0.2) !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08) !important;
        }
        .diff-reject-btn:hover {
          background: rgba(255, 69, 58, 0.05) !important;
          border-color: rgba(255, 69, 58, 0.2) !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08) !important;
        }
        .diff-accept-btn:active,
        .diff-reject-btn:active {
          transform: translateY(0px) scale(0.98) !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
        }
        @media (prefers-color-scheme: dark) {
          .diff-accept-btn,
          .diff-reject-btn {
            background: rgba(28, 28, 30, 0.8) !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
          }
          .action-text {
            color: #f5f5f7 !important;
          }
          .key {
            background: rgba(255, 255, 255, 0.08) !important;
            border-color: rgba(255, 255, 255, 0.15) !important;
            color: #f5f5f7 !important;
          }
          .diff-accept-btn:hover {
            background: rgba(48, 209, 88, 0.15) !important;
            border-color: rgba(48, 209, 88, 0.3) !important;
          }
          .diff-reject-btn:hover {
            background: rgba(255, 69, 58, 0.15) !important;
            border-color: rgba(255, 69, 58, 0.3) !important;
          }
        }
      `
      document.head.appendChild(commandStyle)

      actionButtons.appendChild(acceptBtn)
      actionButtons.appendChild(rejectBtn)

      // Move original text content to wrapper
      const originalContent = dom.innerHTML
      dom.innerHTML = ''
      lineWrapper.innerHTML = originalContent

      // Append elements
      lineWrapper.appendChild(actionButtons)
      dom.appendChild(lineWrapper)

      // Global editor mouse leave handler to hide all buttons
      const editorContainer = dom.closest(
        '.lexical-editor-container',
      ) as HTMLElement
      if (editorContainer) {
        editorContainer.addEventListener('mouseleave', () => {
          setTimeout(() => {
            const allActionButtons = document.querySelectorAll(
              '.diff-action-buttons',
            )
            allActionButtons.forEach((buttons) => {
              ;(buttons as HTMLElement).style.opacity = '0'
              ;(buttons as HTMLElement).style.transform =
                'translateY(-8px) scale(0.95)'
              ;(buttons as HTMLElement).style.pointerEvents = 'none'
            })
          }, 100)
        })
      }

      // Hover interaction logic with global state management
      let isHovered = false

      // Global function to hide all other diff buttons
      const hideAllOtherButtons = (currentChangeIndex: number) => {
        const allActionButtons = document.querySelectorAll(
          '.diff-action-buttons',
        )
        allActionButtons.forEach((buttons) => {
          const wrapper = buttons.closest('.diff-line-wrapper') as HTMLElement
          if (
            wrapper &&
            wrapper.dataset.changeIndex !== String(currentChangeIndex)
          ) {
            ;(buttons as HTMLElement).style.opacity = '0'
            ;(buttons as HTMLElement).style.transform =
              'translateY(-8px) scale(0.95)'
            ;(buttons as HTMLElement).style.pointerEvents = 'none'
          }
        })
      }

      // Show buttons on line hover
      lineWrapper.addEventListener('mouseenter', () => {
        isHovered = true

        // Hide all other buttons first
        hideAllOtherButtons(this.__changeIndex)

        // Then show current buttons
        actionButtons.style.opacity = '1'
        actionButtons.style.transform = 'translateY(0) scale(1)'
        actionButtons.style.pointerEvents = 'all'
      })

      lineWrapper.addEventListener('mouseleave', () => {
        setTimeout(() => {
          if (!isHovered) {
            actionButtons.style.opacity = '0'
            actionButtons.style.transform = 'translateY(-8px) scale(0.95)'
            actionButtons.style.pointerEvents = 'none'
          }
        }, 150)
      })

      // Keep buttons visible when hovering over them
      actionButtons.addEventListener('mouseenter', () => {
        isHovered = true
      })

      actionButtons.addEventListener('mouseleave', () => {
        isHovered = false
        setTimeout(() => {
          if (!isHovered) {
            actionButtons.style.opacity = '0'
            actionButtons.style.transform = 'translateY(-8px) scale(0.95)'
            actionButtons.style.pointerEvents = 'none'
          }
        }, 150)
      })

      // Button hover animations - with upvote/downvote icon animations
      acceptBtn.addEventListener('mouseenter', () => {
        // Button styling
        acceptBtn.style.background = 'rgba(48, 209, 88, 0.05)'
        acceptBtn.style.borderColor = 'rgba(48, 209, 88, 0.2)'
        acceptBtn.style.transform = 'translateY(-1px)'
        acceptBtn.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.08)'

        // Upvote icon animation (same as UpvoteIcon component)
        const iconSvg = acceptBtn.querySelector('svg') as SVGElement
        if (iconSvg) {
          iconSvg.style.transition =
            'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          iconSvg.style.transform =
            'translateX(-1px) translateY(-2px) rotate(-12deg)'
        }
      })

      acceptBtn.addEventListener('mouseleave', () => {
        // Button styling
        acceptBtn.style.background = 'white'
        acceptBtn.style.borderColor = 'rgba(0, 0, 0, 0.08)'
        acceptBtn.style.transform = 'translateY(0px)'
        acceptBtn.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)'

        // Reset upvote icon animation
        const iconSvg = acceptBtn.querySelector('svg') as SVGElement
        if (iconSvg) {
          iconSvg.style.transform =
            'translateX(0px) translateY(0px) rotate(0deg)'
        }
      })

      rejectBtn.addEventListener('mouseenter', () => {
        // Button styling
        rejectBtn.style.background = 'rgba(255, 69, 58, 0.05)'
        rejectBtn.style.borderColor = 'rgba(255, 69, 58, 0.2)'
        rejectBtn.style.transform = 'translateY(-1px)'
        rejectBtn.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.08)'

        // Downvote icon animation (same as DownvoteIcon component)
        const iconSvg = rejectBtn.querySelector('svg') as SVGElement
        if (iconSvg) {
          iconSvg.style.transition =
            'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          iconSvg.style.transform =
            'translateX(-1px) translateY(2px) rotate(-12deg)'
        }
      })

      rejectBtn.addEventListener('mouseleave', () => {
        // Button styling
        rejectBtn.style.background = 'white'
        rejectBtn.style.borderColor = 'rgba(0, 0, 0, 0.08)'
        rejectBtn.style.transform = 'translateY(0px)'
        rejectBtn.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)'

        // Reset downvote icon animation
        const iconSvg = rejectBtn.querySelector('svg') as SVGElement
        if (iconSvg) {
          iconSvg.style.transform =
            'translateX(0px) translateY(0px) rotate(0deg)'
        }
      })

      // Handle accept action
      acceptBtn.addEventListener('click', (e) => {
        e.stopPropagation()

        // Get the SVG icon for animation
        const iconSvg = acceptBtn.querySelector('svg') as SVGElement

        // Upvote animation (similar to UpvoteIcon component)
        if (iconSvg) {
          iconSvg.style.transition =
            'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          iconSvg.style.transform =
            'translateX(-1px) translateY(-2px) rotate(-12deg)'

          // Reset animation after delay
          setTimeout(() => {
            iconSvg.style.transform =
              'translateX(0px) translateY(0px) rotate(0deg)'
          }, 200)
        }

        // Click animation for button
        acceptBtn.style.transform = 'scale(0.98)'
        setTimeout(() => {
          acceptBtn.style.transform = 'scale(1.02)'
        }, 75)

        // Dispatch event with history support
        const event = new CustomEvent('diff-group-action', {
          bubbles: true,
          detail: {
            changeIndex: this.__changeIndex,
            diffType: this.__diffType,
            action: 'accept',
            isGroupAction: true,
            shouldCreateHistoryEntry: true,
          },
        })
        dom.dispatchEvent(event)
      })

      // Handle reject action
      rejectBtn.addEventListener('click', (e) => {
        e.stopPropagation()

        // Get the SVG icon for animation
        const iconSvg = rejectBtn.querySelector('svg') as SVGElement

        // Downvote animation (similar to DownvoteIcon component)
        if (iconSvg) {
          iconSvg.style.transition =
            'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          iconSvg.style.transform =
            'translateX(-1px) translateY(2px) rotate(-12deg)'

          // Reset animation after delay
          setTimeout(() => {
            iconSvg.style.transform =
              'translateX(0px) translateY(0px) rotate(0deg)'
          }, 200)
        }

        // Click animation for button
        rejectBtn.style.transform = 'scale(0.98)'
        setTimeout(() => {
          rejectBtn.style.transform = 'scale(1.02)'
        }, 75)

        // Dispatch event with history support
        const event = new CustomEvent('diff-group-action', {
          bubbles: true,
          detail: {
            changeIndex: this.__changeIndex,
            diffType: this.__diffType,
            action: 'reject',
            isGroupAction: true,
            shouldCreateHistoryEntry: true,
          },
        })
        dom.dispatchEvent(event)
      })
    } else {
      // For unchanged content, minimal styling
      dom.classList.add('diff-unchanged')
    }

    return dom
  }

  updateDOM(
    prevNode: DiffTextNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    const isUpdated = super.updateDOM(prevNode as this, dom, config)

    if (
      prevNode.__diffType !== this.__diffType ||
      prevNode.__isFocused !== this.__isFocused
    ) {
      this.applyDiffStyles(dom)
      return true
    }

    return isUpdated
  }

  applyDiffStyles(dom: HTMLElement): void {
    dom.classList.add(`diff-${this.__diffType}`)

    // For diff changes, minimal styling since we use full-line highlighting
    switch (this.__diffType) {
      case 'added':
        dom.style.cssText += `
          color: #1d4c31;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        `
        break
      case 'removed':
        dom.style.cssText += `
          color: #8b2018;
          text-decoration: line-through;
          text-decoration-color: rgba(255, 69, 58, 0.6);
          text-decoration-thickness: 1px;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        `
        break
      case 'unchanged':
        dom.style.cssText += `
          transition: all 0.15s ease;
        `
        break
    }

    // Add focus styling if focused
    if (this.__isFocused) {
      dom.classList.add('diff-selected')
      dom.style.outline = '1px solid #007aff'
      dom.style.outlineOffset = '1px'
      dom.style.borderRadius = '3px'
    }

    // Add dark mode support with stronger colors
    if (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      switch (this.__diffType) {
        case 'added':
          dom.style.cssText += `
            color: #6ed46f;
          `
          break
        case 'removed':
          dom.style.cssText += `
            color: #ff9f92;
            text-decoration-color: rgba(255, 69, 58, 0.7);
          `
          break
      }

      if (this.__isFocused) {
        dom.style.outlineColor = '#0a84ff'
      }
    }
  }

  getDiffType(): DiffType {
    return this.__diffType
  }

  setDiffType(diffType: DiffType): this {
    const writable = this.getWritable()
    writable.__diffType = diffType
    return writable
  }

  getChangeIndex(): number {
    return this.__changeIndex
  }

  setChangeIndex(changeIndex: number): this {
    const writable = this.getWritable()
    writable.__changeIndex = changeIndex
    return writable
  }

  isFocused(): boolean {
    return this.__isFocused
  }

  setFocused(isFocused: boolean): this {
    const writable = this.getWritable()
    writable.__isFocused = isFocused
    return writable
  }

  // Make diff nodes non-editable by default
  isEditable(): boolean {
    return false
  }

  // Override to prevent automatic merging of diff nodes
  canInsertTextBefore(): boolean {
    return false
  }

  canInsertTextAfter(): boolean {
    return false
  }

  // Method to highlight change groups with stronger colors
  private highlightChangeGroup(_highlight: boolean): void {
    // No longer needed - removed hover behaviors
  }
}

export function $createDiffTextNode(
  diffType: DiffType,
  changeIndex: number,
  text: string,
  isFocused?: boolean,
): DiffTextNode {
  return $applyNodeReplacement(
    new DiffTextNode(diffType, changeIndex, text, undefined, isFocused),
  )
}

export function $isDiffTextNode(
  node: LexicalNode | null | undefined,
): node is DiffTextNode {
  return node instanceof DiffTextNode
}
