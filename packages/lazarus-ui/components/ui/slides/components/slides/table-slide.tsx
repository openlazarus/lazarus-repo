'use client'

import { Slide, TableData } from '../../types'

interface TableSlideProps {
  slide: Slide
  theme: any
}

export function TableSlide({ slide, theme }: TableSlideProps) {
  const { title, subtitle, data } = slide

  if (!data || !('headers' in data)) {
    return (
      <div className='flex h-full items-center justify-center text-muted-foreground'>
        <p>No table data provided</p>
      </div>
    )
  }

  const tableData = data as TableData
  const isCompact = tableData.style?.compact
  const isStriped = tableData.style?.striped !== false // Default true
  const isBordered = tableData.style?.bordered
  const hasHover = tableData.style?.hover !== false // Default true

  return (
    <div
      className='flex h-full flex-col'
      style={{ padding: theme.spacing.slide.padding }}>
      {/* Header */}
      {(title || subtitle) && (
        <div className='mb-8'>
          {title && (
            <h2
              className='mb-3 text-4xl font-semibold'
              style={{
                fontFamily: theme.typography.fontFamily.sans,
                color: theme.colors.text,
              }}>
              {title}
            </h2>
          )}
          {subtitle && (
            <p
              className='text-xl opacity-80'
              style={{
                fontFamily: theme.typography.fontFamily.sans,
                color: theme.colors.muted,
              }}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Table Container */}
      <div className='flex flex-1 items-start justify-center overflow-auto'>
        <div className='w-full max-w-5xl'>
          <table
            className={`w-full overflow-hidden rounded-lg ${isBordered ? 'border' : ''} `}
            style={{
              borderColor: theme.colors.border,
              fontSize: isCompact ? '0.875rem' : '1rem',
            }}>
            <thead>
              <tr
                className='border-b-2'
                style={{
                  backgroundColor:
                    theme.name === 'dark'
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(0,0,0,0.03)',
                  borderColor: theme.colors.border,
                }}>
                {tableData.headers.map((header, i) => (
                  <th
                    key={i}
                    className={`text-left font-semibold ${isCompact ? 'px-4 py-2' : 'px-6 py-4'} ${i === 0 ? '' : 'border-l'} `}
                    style={{
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                      fontFamily: theme.typography.fontFamily.sans,
                    }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.rows.map((row, rowIndex) => {
                const isHighlighted = tableData.highlights?.includes(rowIndex)

                return (
                  <tr
                    key={rowIndex}
                    className={`border-b transition-colors duration-200 ${hasHover ? 'hover:bg-opacity-5' : ''} ${isStriped && rowIndex % 2 === 1 ? 'bg-opacity-[0.02]' : ''} ${isHighlighted ? 'bg-opacity-10' : ''} `}
                    style={{
                      borderColor: theme.colors.border,
                      backgroundColor: isHighlighted
                        ? theme.colors.primary
                        : isStriped && rowIndex % 2 === 1
                          ? theme.name === 'dark'
                            ? 'rgba(255,255,255,0.02)'
                            : 'rgba(0,0,0,0.02)'
                          : 'transparent',
                    }}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={` ${isCompact ? 'px-4 py-2' : 'px-6 py-4'} ${cellIndex === 0 ? 'font-medium' : ''} ${cellIndex !== 0 ? 'border-l' : ''} `}
                        style={{
                          color:
                            cellIndex === 0
                              ? theme.colors.text
                              : theme.colors.muted,
                          borderColor: theme.colors.border,
                          fontFamily: theme.typography.fontFamily.sans,
                        }}>
                        {formatCell(cell)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function formatCell(value: string | number | boolean): string {
  if (typeof value === 'boolean') {
    return value ? '✓' : '✗'
  }
  if (typeof value === 'number') {
    // Format numbers with commas for thousands
    return value.toLocaleString()
  }
  return String(value)
}
