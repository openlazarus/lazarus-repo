'use client'

import { cn } from '@/lib/utils'
import { ReactNode, useCallback, useState } from 'react'

interface TableBlockProps {
  children: ReactNode
  className?: string
}

/**
 * TableBlock - Wrapper for markdown tables with horizontal scroll and action buttons
 * Provides copy (as TSV) and download (as CSV) functionality
 */
export function TableBlock({ children, className }: TableBlockProps) {
  const [copied, setCopied] = useState(false)

  // Convert table to TSV for clipboard
  const tableToTSV = useCallback((tableElement: HTMLTableElement): string => {
    const rows: string[][] = []

    // Extract header rows
    const thead = tableElement.querySelector('thead')
    if (thead) {
      const headerRows = thead.querySelectorAll('tr')
      headerRows.forEach((row) => {
        const cells = row.querySelectorAll('th, td')
        const rowData = Array.from(cells).map(
          (cell) => cell.textContent?.trim() || '',
        )
        rows.push(rowData)
      })
    }

    // Extract body rows
    const tbody = tableElement.querySelector('tbody')
    if (tbody) {
      const bodyRows = tbody.querySelectorAll('tr')
      bodyRows.forEach((row) => {
        const cells = row.querySelectorAll('td, th')
        const rowData = Array.from(cells).map(
          (cell) => cell.textContent?.trim() || '',
        )
        rows.push(rowData)
      })
    }

    // If no thead/tbody, try direct tr selection
    if (rows.length === 0) {
      const allRows = tableElement.querySelectorAll('tr')
      allRows.forEach((row) => {
        const cells = row.querySelectorAll('td, th')
        const rowData = Array.from(cells).map(
          (cell) => cell.textContent?.trim() || '',
        )
        rows.push(rowData)
      })
    }

    return rows.map((row) => row.join('\t')).join('\n')
  }, [])

  // Convert table to CSV for download
  const tableToCSV = useCallback((tableElement: HTMLTableElement): string => {
    const rows: string[][] = []

    // Extract header rows
    const thead = tableElement.querySelector('thead')
    if (thead) {
      const headerRows = thead.querySelectorAll('tr')
      headerRows.forEach((row) => {
        const cells = row.querySelectorAll('th, td')
        const rowData = Array.from(cells).map((cell) => {
          const text = cell.textContent?.trim() || ''
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (text.includes(',') || text.includes('"') || text.includes('\n')) {
            return `"${text.replace(/"/g, '""')}"`
          }
          return text
        })
        rows.push(rowData)
      })
    }

    // Extract body rows
    const tbody = tableElement.querySelector('tbody')
    if (tbody) {
      const bodyRows = tbody.querySelectorAll('tr')
      bodyRows.forEach((row) => {
        const cells = row.querySelectorAll('td, th')
        const rowData = Array.from(cells).map((cell) => {
          const text = cell.textContent?.trim() || ''
          if (text.includes(',') || text.includes('"') || text.includes('\n')) {
            return `"${text.replace(/"/g, '""')}"`
          }
          return text
        })
        rows.push(rowData)
      })
    }

    // If no thead/tbody, try direct tr selection
    if (rows.length === 0) {
      const allRows = tableElement.querySelectorAll('tr')
      allRows.forEach((row) => {
        const cells = row.querySelectorAll('td, th')
        const rowData = Array.from(cells).map((cell) => {
          const text = cell.textContent?.trim() || ''
          if (text.includes(',') || text.includes('"') || text.includes('\n')) {
            return `"${text.replace(/"/g, '""')}"`
          }
          return text
        })
        rows.push(rowData)
      })
    }

    return rows.map((row) => row.join(',')).join('\n')
  }, [])

  const handleCopy = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      const wrapper = e.currentTarget.closest('[data-table-wrapper]')
      const table = wrapper?.querySelector('table')
      if (!table) return

      const tsv = tableToTSV(table)
      await navigator.clipboard.writeText(tsv)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    },
    [tableToTSV],
  )

  const handleDownload = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const wrapper = e.currentTarget.closest('[data-table-wrapper]')
      const table = wrapper?.querySelector('table')
      if (!table) return

      const csv = tableToCSV(table)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `table-${Date.now()}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    },
    [tableToCSV],
  )

  return (
    <div data-table-wrapper className={cn('group relative', className)}>
      {/* Action buttons - positioned at top right */}
      <div className='absolute right-3 top-3 z-10 flex items-center gap-1.5'>
        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full border transition-all',
            'border-[rgba(0,0,0,0.06)] bg-[#fafafa] dark:border-[rgba(255,255,255,0.08)] dark:bg-[#2c2c2e]',
            'opacity-0 group-hover:opacity-100',
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

        {/* Download button */}
        <button
          onClick={handleDownload}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full border transition-all',
            'border-[rgba(0,0,0,0.06)] bg-[#fafafa] dark:border-[rgba(255,255,255,0.08)] dark:bg-[#2c2c2e]',
            'opacity-0 group-hover:opacity-100',
            'hover:border-[rgba(0,0,0,0.12)] hover:bg-[#f0f0f2] dark:hover:border-[rgba(255,255,255,0.16)] dark:hover:bg-[#38383a]',
          )}
          aria-label='Download as CSV'
          title='Download as CSV'>
          <i className='ri-download-line text-[14px] text-[hsl(var(--text-secondary))]' />
        </button>
      </div>

      {/* Scrollable table container - custom scrollbar styles in globals.css */}
      <div className='table-scroll-container overflow-x-auto'>{children}</div>
    </div>
  )
}
