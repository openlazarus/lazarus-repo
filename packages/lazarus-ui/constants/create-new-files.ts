import { FileType } from '@/model/file'

export const CREATE_NEW_FILES = [
  {
    type: 'chat' as FileType,
    label: 'Conversation',
    description: 'Chat with Lazarus to get answers or complete tasks',
  },
  {
    type: 'document' as FileType,
    label: 'Document',
    description: 'Create or edit text documents with precision',
  },
  {
    type: 'slides' as FileType,
    label: 'Presentation',
    description: 'Generate polished slide decks and presentations',
  },
  {
    type: 'table' as FileType,
    label: 'Spreadsheet',
    description: 'Analyze data and create organized spreadsheets',
  },
  {
    type: 'mindmap' as FileType,
    label: 'Mind Map',
    description: 'Visualize concepts and connections visually',
  },
  {
    type: 'math' as FileType,
    label: 'Math & Formulas',
    description: 'Solve equations and mathematical problems',
  },
  {
    type: 'map' as FileType,
    label: 'Location',
    description: 'Find places and create custom map visualizations',
  },
  {
    type: 'email' as FileType,
    label: 'Email & Messages',
    description: 'Craft professional emails and messages for any context',
  },
  {
    type: 'v0_project' as FileType,
    label: 'v0 Project',
    description: 'Create React/Next.js UI components with v0 AI',
  },
  {
    type: 'sqlite_database' as FileType,
    label: 'SQLite Database',
    description: 'Create and manage a SQLite database',
  },
]
