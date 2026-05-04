'use client'

import { RiCloseLine } from '@remixicon/react'
import { useState } from 'react'

export interface SheetTemplate {
  id: string
  name: string
  description: string
  category: 'finance' | 'executive' | 'professional' | 'student' | 'custom'
  yaml: string
  icon?: React.ReactNode
}

export const sheetTemplates: SheetTemplate[] = [
  // Finance Templates
  {
    id: 'budget-tracker',
    name: 'Budget Tracker',
    description: 'Track income and expenses',
    category: 'finance',
    yaml: `name: "Budget Tracker"
columns:
  - id: A
    header: "Category"
    type: text
    width: 150
  - id: B
    header: "Budgeted"
    type: currency
    format: USD
  - id: C
    header: "Actual"
    type: currency
    format: USD
  - id: D
    header: "Variance"
    type: currency
    format: USD
    style: highlight
  - id: E
    header: "% of Budget"
    type: percentage
data:
  - row: 1
    cells:
      A: "Income"
      B: 5000
  - row: 2
    cells:
      A: "Housing"
      B: 1500
  - row: 3
    cells:
      A: "Transportation"
      B: 400
formulas:
  - cell: D1
    value: "=AI: C1 minus B1"
  - cell: E1
    value: "=AI: C1 divided by B1 as percentage"`,
  },
  {
    id: 'pnl-statement',
    name: 'P&L Statement',
    description: 'Profit and loss statement',
    category: 'finance',
    yaml: `name: "P&L Statement"
columns:
  - id: A
    header: "Item"
    type: text
    width: 200
  - id: B
    header: "Q1"
    type: currency
    format: USD
  - id: C
    header: "Q2"
    type: currency
    format: USD
  - id: D
    header: "Q3"
    type: currency
    format: USD
  - id: E
    header: "Q4"
    type: currency
    format: USD
  - id: F
    header: "Total"
    type: currency
    format: USD
    style: highlight`,
  },
  {
    id: 'portfolio',
    name: 'Investment Portfolio',
    description: 'Track investment performance',
    category: 'finance',
    yaml: `name: "Portfolio"
columns:
  - id: A
    header: "Symbol"
    type: text
    width: 100
  - id: B
    header: "Shares"
    type: number
  - id: C
    header: "Buy Price"
    type: currency
    format: USD
  - id: D
    header: "Current Price"
    type: currency
    format: USD
  - id: E
    header: "Value"
    type: currency
    format: USD
  - id: F
    header: "Gain/Loss"
    type: currency
    format: USD
  - id: G
    header: "Return %"
    type: percentage`,
  },

  // Executive Templates
  {
    id: 'kpi-dashboard',
    name: 'KPI Dashboard',
    description: 'Key performance indicators',
    category: 'executive',
    yaml: `name: "KPI Dashboard"
columns:
  - id: A
    header: "Metric"
    type: text
    width: 200
  - id: B
    header: "Target"
    type: number
  - id: C
    header: "Actual"
    type: number
  - id: D
    header: "Status"
    type: text
  - id: E
    header: "Trend"
    type: text
data:
  - row: 1
    cells:
      A: "Revenue Growth %"
      B: 15
  - row: 2
    cells:
      A: "Customer Satisfaction"
      B: 90
formulas:
  - cell: D1
    value: "=AI: if C1 >= B1 then 'On Track' else 'Behind'"`,
  },
  {
    id: 'project-status',
    name: 'Project Status',
    description: 'Track multiple projects',
    category: 'executive',
    yaml: `name: "Project Status"
columns:
  - id: A
    header: "Project"
    type: text
    width: 200
  - id: B
    header: "Owner"
    type: text
  - id: C
    header: "Status"
    type: text
  - id: D
    header: "Due Date"
    type: date
  - id: E
    header: "Progress %"
    type: percentage
  - id: F
    header: "Budget"
    type: currency
    format: USD`,
  },

  // Professional Templates
  {
    id: 'task-tracker',
    name: 'Task Tracker',
    description: 'Manage tasks and deadlines',
    category: 'professional',
    yaml: `name: "Tasks"
columns:
  - id: A
    header: "Task"
    type: text
    width: 250
  - id: B
    header: "Priority"
    type: text
    width: 100
  - id: C
    header: "Status"
    type: text
    width: 100
  - id: D
    header: "Due Date"
    type: date
  - id: E
    header: "Assigned To"
    type: text`,
  },
  {
    id: 'time-tracking',
    name: 'Time Tracking',
    description: 'Track billable hours',
    category: 'professional',
    yaml: `name: "Time Tracking"
columns:
  - id: A
    header: "Date"
    type: date
  - id: B
    header: "Client"
    type: text
  - id: C
    header: "Project"
    type: text
  - id: D
    header: "Task"
    type: text
    width: 200
  - id: E
    header: "Hours"
    type: number
  - id: F
    header: "Rate"
    type: currency
    format: USD
  - id: G
    header: "Total"
    type: currency
    format: USD
formulas:
  - cell: G1
    value: "=AI: E1 times F1"`,
  },

  // Student Templates
  {
    id: 'grade-tracker',
    name: 'Grade Tracker',
    description: 'Track grades and GPA',
    category: 'student',
    yaml: `name: "Grades"
columns:
  - id: A
    header: "Course"
    type: text
    width: 200
  - id: B
    header: "Credits"
    type: number
  - id: C
    header: "Grade"
    type: text
    width: 80
  - id: D
    header: "Points"
    type: number
formulas:
  - cell: D1
    value: "=AI: convert letter grade C1 to GPA points"`,
  },

  // Custom Template
  {
    id: 'blank',
    name: 'Blank Sheet',
    description: 'Start with an empty sheet',
    category: 'custom',
    yaml: `name: "New Sheet"
columns:
  - id: A
    header: "Column A"
    type: text
    width: 100
  - id: B
    header: "Column B"
    type: text
    width: 100
  - id: C
    header: "Column C"
    type: text
    width: 100
data: []`,
  },
]

interface SheetTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate: (template: SheetTemplate) => void
}

export function SheetTemplateModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: SheetTemplateModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  if (!isOpen) return null

  const categories = [
    { id: 'all', name: 'All Templates' },
    { id: 'finance', name: 'Finance' },
    { id: 'executive', name: 'Executive' },
    { id: 'professional', name: 'Professional' },
    { id: 'student', name: 'Student' },
    { id: 'custom', name: 'Custom' },
  ]

  const filteredTemplates =
    selectedCategory === 'all'
      ? sheetTemplates
      : sheetTemplates.filter((t) => t.category === selectedCategory)

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
      <div className='w-full max-w-4xl rounded-lg bg-white shadow-xl'>
        {/* Header */}
        <div className='flex items-center justify-between border-b border-gray-200 px-6 py-4'>
          <h2 className='text-lg font-semibold text-gray-900'>
            Choose a Template
          </h2>
          <button
            onClick={onClose}
            className='rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600'>
            <RiCloseLine className='h-5 w-5' />
          </button>
        </div>

        {/* Categories */}
        <div className='border-b border-gray-200 px-6'>
          <div className='flex space-x-8'>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'border-[#0098FC] text-[#0098FC]'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className='max-h-[400px] overflow-y-auto p-6'>
          <div className='grid grid-cols-3 gap-4'>
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => {
                  onSelectTemplate(template)
                  onClose()
                }}
                className='group relative flex flex-col rounded-lg border border-gray-200 p-4 text-left transition-all hover:border-[#0098FC] hover:shadow-md'>
                <h3 className='font-medium text-gray-900 group-hover:text-[#0098FC]'>
                  {template.name}
                </h3>
                <p className='mt-1 text-sm text-gray-600'>
                  {template.description}
                </p>
                <div className='absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100'>
                  <svg
                    className='h-5 w-5 text-[#0098FC]'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M13 7l5 5m0 0l-5 5m5-5H6'
                    />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
