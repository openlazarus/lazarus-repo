'use client'

import { cn } from '@/lib/utils'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * TableHoverActionsPlugin - Shows copy/download action buttons fixed to the
 * top-right of each table on hover. Uses position:fixed + rAF tracking so
 * buttons stay pinned to the table regardless of scroll.
 */
export function TableHoverActionsPlugin() {
  const [editor] = useLexicalComposerContext()
  const [hoveredTable, setHoveredTable] = useState<HTMLTableElement | null>(
    null,
  )
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [copied, setCopied] = useState(false)
  const buttonsRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  // Continuously track the table's viewport position via rAF
  useEffect(() => {
    if (!hoveredTable) {
      setRect(null)
      return
    }

    const tick = () => {
      if (!hoveredTable.isConnected) {
        setHoveredTable(null)
        return
      }
      setRect(hoveredTable.getBoundingClientRect())
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [hoveredTable])

  // Mouse events: detect hover on tables, dismiss when leaving
  useEffect(() => {
    const rootElement = editor.getRootElement()
    if (!rootElement) return

    const editorContainer = rootElement.closest('.lexical-editor-container')
    if (!editorContainer) return

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Ignore if hovering over the buttons themselves
      if (buttonsRef.current?.contains(target)) return
      const table = target.closest(
        'table.editor-table',
      ) as HTMLTableElement | null
      if (table && editorContainer.contains(table)) {
        setHoveredTable(table)
      }
    }

    const handleMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null
      if (!related) {
        setHoveredTable(null)
        return
      }
      // Stay visible if moving to the buttons or staying within the same table
      if (buttonsRef.current?.contains(related)) return
      if (related.closest('table.editor-table') === hoveredTable) return
      setHoveredTable(null)
    }

    editorContainer.addEventListener('mouseover', handleMouseOver)
    editorContainer.addEventListener('mouseout', handleMouseOut)

    return () => {
      editorContainer.removeEventListener('mouseover', handleMouseOver)
      editorContainer.removeEventListener('mouseout', handleMouseOut)
    }
  }, [editor, hoveredTable])

  const tableToTSV = useCallback((table: HTMLTableElement): string => {
    const rows: string[][] = []
    table.querySelectorAll('tr').forEach((row) => {
      const cells = row.querySelectorAll('th, td')
      rows.push(Array.from(cells).map((cell) => cell.textContent?.trim() || ''))
    })
    return rows.map((row) => row.join('\t')).join('\n')
  }, [])

  const tableToCSV = useCallback((table: HTMLTableElement): string => {
    const rows: string[][] = []
    table.querySelectorAll('tr').forEach((row) => {
      const cells = row.querySelectorAll('th, td')
      rows.push(
        Array.from(cells).map((cell) => {
          const text = cell.textContent?.trim() || ''
          if (text.includes(',') || text.includes('"') || text.includes('\n')) {
            return `"${text.replace(/"/g, '""')}"`
          }
          return text
        }),
      )
    })
    return rows.map((row) => row.join(',')).join('\n')
  }, [])

  const handleCopy = useCallback(async () => {
    if (!hoveredTable) return
    const tsv = tableToTSV(hoveredTable)
    await navigator.clipboard.writeText(tsv)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [hoveredTable, tableToTSV])

  const handleDownload = useCallback(() => {
    if (!hoveredTable) return
    const csv = tableToCSV(hoveredTable)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `table-${Date.now()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [hoveredTable, tableToCSV])

  if (!hoveredTable || !rect) return null

  return createPortal(
    <div
      ref={buttonsRef}
      className='pointer-events-auto fixed z-50 flex items-center gap-1.5'
      style={{ top: rect.top + 8, left: rect.right - 76 }}
      onMouseLeave={(e) => {
        const related = e.relatedTarget as HTMLElement | null
        if (related?.closest('table.editor-table') === hoveredTable) return
        setHoveredTable(null)
      }}>
      <button
        onClick={handleCopy}
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-full border transition-all',
          'border-[rgba(0,0,0,0.06)] bg-[#fafafa] dark:border-[rgba(255,255,255,0.08)] dark:bg-[#2c2c2e]',
          'hover:border-[rgba(0,0,0,0.12)] hover:bg-[#f0f0f2] dark:hover:border-[rgba(255,255,255,0.16)] dark:hover:bg-[#38383a]',
        )}
        aria-label='Copy table'
        title='Copy to clipboard'>
        {copied ? (
          <i className='ri-check-line text-[14px] text-[hsl(var(--lazarus-blue))]' />
        ) : (
          <i className='ri-file-copy-line text-[14px] text-[hsl(var(--text-secondary))]' />
        )}
      </button>
      <button
        onClick={handleDownload}
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-full border transition-all',
          'border-[rgba(0,0,0,0.06)] bg-[#fafafa] dark:border-[rgba(255,255,255,0.08)] dark:bg-[#2c2c2e]',
          'hover:border-[rgba(0,0,0,0.12)] hover:bg-[#f0f0f2] dark:hover:border-[rgba(255,255,255,0.16)] dark:hover:bg-[#38383a]',
        )}
        aria-label='Download as CSV'
        title='Download as CSV'>
        <i className='ri-download-line text-[14px] text-[hsl(var(--text-secondary))]' />
      </button>
    </div>,
    document.body,
  )
}
