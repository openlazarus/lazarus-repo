'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { parseSpreadsheetDocument } from './parser'
import { SpreadsheetCanvas } from './spreadsheet-canvas'

// Sample YAML data for diff demonstration
const originalYaml = `
spreadsheet:
  meta:
    title: "Q4 Sales Report"
    version: "1.0"
  sheets:
    - name: "Sales"
      columns:
        - id: A
          header: "Product"
          type: text
          width: 150
        - id: B
          header: "Q3 Sales"
          type: currency
          format: USD
          width: 120
        - id: C
          header: "Q4 Sales"
          type: currency
          format: USD
          width: 120
        - id: D
          header: "Growth %"
          type: percentage
          width: 100
      data:
        - row: 1
          cells:
            A: "Laptop Pro"
            B: 45000
            C: 52000
            D: 0.156
        - row: 2
          cells:
            A: "Desktop Ultra"
            B: 32000
            C: 28000
            D: -0.125
        - row: 3
          cells:
            A: "Monitor 4K"
            B: 18000
            C: 22000
            D: 0.222
`

const modifiedYaml = `
spreadsheet:
  meta:
    title: "Q4 Sales Report - Updated"
    version: "1.1"
  sheets:
    - name: "Sales"
      columns:
        - id: A
          header: "Product Name"  # Changed header
          type: text
          width: 150
        - id: B
          header: "Q3 Sales"
          type: currency
          format: USD
          width: 120
        - id: C
          header: "Q4 Sales"
          type: currency
          format: USD
          width: 120
        - id: D
          header: "Growth %"
          type: percentage
          width: 100
        - id: E              # New column
          header: "Status"
          type: text
          width: 100
      data:
        - row: 1
          cells:
            A: "Laptop Pro X"  # Modified value
            B: 45000
            C: 58000          # Modified value
            D: 0.289          # Modified value
            E: "Excellent"    # New cell
        - row: 2
          cells:
            A: "Desktop Ultra"
            B: 32000
            C: 29500          # Modified value
            D: -0.078         # Modified value
            E: "Needs Review" # New cell
        - row: 3
          cells:
            A: "Monitor 4K Pro" # Modified value
            B: 18000
            C: 22000
            D: 0.222
            E: "Good"         # New cell
        - row: 4              # New row
          cells:
            A: "Keyboard Wireless"
            B: 8000
            C: 12000
            D: 0.5
            E: "Outstanding"
`

// Parse YAML to get ParsedSpreadsheetData
const originalData = parseSpreadsheetDocument(originalYaml)
const modifiedData = parseSpreadsheetDocument(modifiedYaml)

export function SpreadsheetDiffDemo() {
  const [showDiff, setShowDiff] = useState(false)
  const [viewMode, setViewMode] = useState<'overlay' | 'sidebyside'>('overlay')

  return (
    <div className='space-y-6'>
      <div className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
        <h2 className='mb-4 text-xl font-semibold'>
          Spreadsheet Diff View Demo
        </h2>
        <p className='mb-6 text-gray-600'>
          This demonstrates the diff view functionality for spreadsheets.
          Changes are highlighted with colors:{' '}
          <span className='font-medium text-green-600'>
            green for additions
          </span>
          ,<span className='font-medium text-red-600'> red for deletions</span>,
          and
          <span className='font-medium text-yellow-600'>
            {' '}
            yellow for modifications
          </span>
          .
        </p>

        <div className='mb-6 flex items-center gap-4'>
          <Button
            onClick={() => setShowDiff(!showDiff)}
            variant={showDiff ? 'default' : 'outline'}>
            {showDiff ? 'Hide Diff View' : 'Show Diff View'}
          </Button>
        </div>

        {showDiff ? (
          <div className='space-y-4'>
            <SpreadsheetCanvas
              data={modifiedData}
              originalData={originalData}
              diffMode={true}
              showDiffLegend={true}
            />
          </div>
        ) : (
          <div className='rounded-lg bg-gray-50 p-12 text-center'>
            <p className='text-gray-500'>
              Click "Show Diff View" to see the spreadsheet diff functionality
            </p>
          </div>
        )}
      </div>

      <div className='rounded-lg bg-gray-50 p-6'>
        <h3 className='mb-3 font-medium'>Example Changes in This Demo:</h3>
        <div className='grid gap-4 text-sm md:grid-cols-2'>
          <div>
            <h4 className='mb-2 font-medium text-gray-700'>Cell Changes:</h4>
            <ul className='space-y-1 text-gray-600'>
              <li className='flex items-start'>
                <span className='mr-2 text-green-600'>+</span>
                New cells in column E ("Status")
              </li>
              <li className='flex items-start'>
                <span className='mr-2 text-yellow-600'>~</span>
                "Laptop Pro" → "Laptop Pro X"
              </li>
              <li className='flex items-start'>
                <span className='mr-2 text-yellow-600'>~</span>
                Q4 Sales: 52000 → 58000
              </li>
              <li className='flex items-start'>
                <span className='mr-2 text-yellow-600'>~</span>
                Growth %: 15.6 → 28.9
              </li>
            </ul>
          </div>
          <div>
            <h4 className='mb-2 font-medium text-gray-700'>
              Structure Changes:
            </h4>
            <ul className='space-y-1 text-gray-600'>
              <li className='flex items-start'>
                <span className='mr-2 text-yellow-600'>~</span>
                Column header: "Product" → "Product Name"
              </li>
              <li className='flex items-start'>
                <span className='mr-2 text-green-600'>+</span>
                New column: "Status"
              </li>
              <li className='flex items-start'>
                <span className='mr-2 text-green-600'>+</span>
                New row: "Keyboard Wireless"
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
