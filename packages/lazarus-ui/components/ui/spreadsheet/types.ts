export interface SpreadsheetMeta {
  title?: string
  author?: string
  version?: string
  createdAt?: string
  updatedAt?: string
}

export type CellType =
  | 'text'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'formula'

export type CellStyle =
  | 'default'
  | 'header'
  | 'highlight'
  | 'subtle'
  | 'success'
  | 'warning'
  | 'danger'

// Cell type for SpreadsheetCanvas
export interface Cell {
  rawValue: string
  displayValue: string
  formula?: string
  type: CellType
  style: {
    bold?: boolean
    italic?: boolean
    underline?: boolean
    color?: string
    background?: string
    alignment?: 'left' | 'center' | 'right'
    wrapMode?: 'nowrap' | 'wrap' | 'clip' | 'auto'
    borderTop?: boolean
    borderBottom?: boolean
    borderLeft?: boolean
    borderRight?: boolean
  }
}

// Parsed data structure for SpreadsheetCanvas
export interface ParsedSheet {
  name: string
  columns: string[]
  cells: Cell[][]
}

export interface ParsedData {
  metadata: any
  sheets: ParsedSheet[]
}

// Simplified SpreadsheetDocument structure that matches defaults.ts
export interface Sheet {
  name: string
  columns?: string[]
  data?: Record<string, any>
  formulas?: Record<string, string>
  formatting?: any[]
}

export interface SpreadsheetDocument {
  version?: string
  metadata?: any
  sheets: Sheet[]
}

// Original types for parser.ts compatibility
export interface Column {
  id: string
  header: string
  type?: CellType
  format?: string
  width?: number
  style?: CellStyle
  backgroundColor?: string
}

export interface ParsedSpreadsheetData {
  meta: SpreadsheetMeta
  sheets: ParsedSheetOriginal[]
}

export interface ParsedSheetOriginal {
  name: string
  columns: Column[]
  cells: Map<string, CellOriginal>
  formatting: ConditionalFormat[]
  charts: Chart[]
  validation: Validation[]
  analysis: Analysis[]
}

export interface CellOriginal {
  value: string | number | Date | null
  formula?: string
  type?: CellType
  style?: CellStyle
  backgroundColor?: string
  error?: string
}

export interface Row {
  row: number
  cells: Record<string, string | number | Date | null>
  style?: CellStyle
}

export interface Formula {
  cell: string
  value: string
}

export interface ConditionalFormat {
  condition: string
  style: CellStyle
  range?: string
}

export interface Chart {
  type: 'sparkline' | 'bar' | 'line' | 'pie' | string
  data: string
  cell?: string
  options?: Record<string, any>
}

export interface Validation {
  column?: string
  range?: string
  rule: string
}

export interface Analysis {
  range: string
  prompt: string
  result?: string
}

export interface CellReference {
  sheet?: string
  column: string
  row: number
}

export interface Range {
  start: CellReference
  end: CellReference
}

export interface AIFormulaRequest {
  formula: string
  context: {
    sheet: string
    currentCell: string
    visibleCells: Record<string, CellOriginal>
    columns: Column[]
  }
}

export interface AIFormulaResponse {
  result: string | number | Date | null
  explanation?: string
  confidence?: number
  error?: string
}

// Template types
export type TemplateCategory =
  | 'finance'
  | 'executive'
  | 'professional'
  | 'student'

export interface Template {
  id: string
  name: string
  description: string
  category: TemplateCategory
  document?: string
}

export const TEMPLATES: Record<TemplateCategory, Template[]> = {
  finance: [
    {
      id: 'budget-tracker',
      name: 'Budget Tracker',
      description: 'Track income and expenses',
      category: 'finance',
      document: `version: "1.0"
metadata:
  title: "Budget Tracker"
sheets:
  - name: "Budget"
    columns: ["Category", "Jan", "Feb", "Mar", "Total"]
    data:
      A1: "Income"
      B1: 5000
      C1: 5200
      D1: 5100
      A2: "Rent"
      B2: 1500
      C2: 1500
      D2: 1500
    formulas:
      E1: "=AI: sum B1 to D1"
      E2: "=AI: sum B2 to D2"`,
    },
    {
      id: 'pl-statement',
      name: 'P&L Statement',
      description: 'Profit and loss tracking',
      category: 'finance',
    },
    {
      id: 'investment-portfolio',
      name: 'Investment Portfolio',
      description: 'Track investments and returns',
      category: 'finance',
    },
  ],
  executive: [
    {
      id: 'kpi-dashboard',
      name: 'KPI Dashboard',
      description: 'Key performance indicators',
      category: 'executive',
    },
    {
      id: 'project-status',
      name: 'Project Status',
      description: 'Project tracking and milestones',
      category: 'executive',
    },
  ],
  professional: [
    {
      id: 'task-tracker',
      name: 'Task Tracker',
      description: 'Track tasks and deadlines',
      category: 'professional',
    },
    {
      id: 'time-tracking',
      name: 'Time Tracking',
      description: 'Log hours and activities',
      category: 'professional',
    },
  ],
  student: [
    {
      id: 'grade-tracker',
      name: 'Grade Tracker',
      description: 'Track grades and GPA',
      category: 'student',
    },
    {
      id: 'study-schedule',
      name: 'Study Schedule',
      description: 'Plan study sessions',
      category: 'student',
    },
  ],
}

// Pastel colors for spreadsheet formatting
export const PASTEL_COLORS = [
  { name: 'Pink', value: '#FFD6E0' },
  { name: 'Blue', value: '#C7CEEA' },
  { name: 'Green', value: '#C8E6C9' },
  { name: 'Yellow', value: '#FFF9C4' },
  { name: 'Purple', value: '#E1BEE7' },
] as const

// Add Cell Format type for managing formatting state
export interface CellFormat {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  alignment?: 'left' | 'center' | 'right'
  wrapMode?: 'nowrap' | 'wrap' | 'clip' | 'auto'
  backgroundColor?: string
  textColor?: string
  borderTop?: boolean
  borderBottom?: boolean
  borderLeft?: boolean
  borderRight?: boolean
  clearFormat?: boolean
}
