'use client'

import {
  RiDatabase2Line,
  RiFileCodeLine,
  RiFileExcel2Line,
  RiFileTextLine,
  RiFileWordLine,
  RiFolderLine,
  RiPlugLine,
  RiSlideshowLine,
  RiUser6Fill,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import React, { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CreateModal } from '@/components/ui/modal'
import { OptionItem, OptionList } from '@/components/ui/option-list'
import { cn } from '@/lib/utils'

type FileType =
  | 'document'
  | 'word_document'
  | 'presentation'
  | 'spreadsheet'
  | 'script'
  | 'folder'
  | 'database'
  | 'memory'
  | 'agent'
  | 'source'

interface CreateFileDialogProps {
  isOpen: boolean
  isDark: boolean
  onConfirm: (name: string, type: FileType) => void
  onClose: () => void
}

// Icon components with colors - using only blue (#0098FC) or gray
const MarkdownIcon = ({
  className,
  isDark,
}: {
  className?: string
  isDark?: boolean
}) => (
  <RiFileTextLine
    className={cn(className, isDark ? 'text-white/50' : 'text-black/40')}
  />
)

const WordDocIcon = ({
  className,
}: {
  className?: string
  isDark?: boolean
}) => <RiFileWordLine className={cn(className, 'text-[#2B579A]')} />

const PresentationIcon = ({
  className,
}: {
  className?: string
  isDark?: boolean
}) => <RiSlideshowLine className={cn(className, 'text-[#D97706]')} />

const SpreadsheetIcon = ({
  className,
}: {
  className?: string
  isDark?: boolean
}) => <RiFileExcel2Line className={cn(className, 'text-[#217346]')} />

const CodeIcon = ({
  className,
  isDark,
}: {
  className?: string
  isDark?: boolean
}) => (
  <RiFileCodeLine
    className={cn(className, isDark ? 'text-white/50' : 'text-black/40')}
  />
)

const FolderIconColored = ({
  className,
  isDark,
}: {
  className?: string
  isDark?: boolean
}) => (
  <RiFolderLine
    className={cn(className, isDark ? 'text-white/60' : 'text-black/60')}
  />
)

const DatabaseIcon = ({
  className,
  isDark,
}: {
  className?: string
  isDark?: boolean
}) => (
  <RiDatabase2Line
    className={cn(className, isDark ? 'text-white/50' : 'text-black/40')}
  />
)

const AgentIcon = ({ className }: { className?: string }) => (
  <RiUser6Fill className={cn(className, 'text-[#0098FC]')} />
)

const SourceIcon = ({ className }: { className?: string }) => (
  <RiPlugLine className={cn(className, 'text-[#0098FC]')} />
)

const fileTypeOptions: OptionItem<FileType>[] = [
  {
    id: 'agent',
    label: 'Agent',
    description: 'AI agent with custom instructions',
    icon: AgentIcon,
  },
  {
    id: 'source',
    label: 'Tool',
    description: 'MCP server connection',
    icon: SourceIcon,
  },
  {
    id: 'folder',
    label: 'Folder',
    description: 'Directory to organize files',
    icon: FolderIconColored,
  },
  {
    id: 'word_document',
    label: 'Document',
    description: 'Word document (.docx)',
    icon: WordDocIcon,
  },
  {
    id: 'presentation',
    label: 'Presentation',
    description: 'PowerPoint presentation (.pptx)',
    icon: PresentationIcon,
  },
  {
    id: 'document',
    label: 'Markdown',
    description: 'Markdown text document',
    icon: MarkdownIcon,
  },
  {
    id: 'spreadsheet',
    label: 'Spreadsheet',
    description: 'CSV or table data',
    icon: SpreadsheetIcon,
  },
  {
    id: 'script',
    label: 'Script',
    description: 'JavaScript, TypeScript, Python, etc.',
    icon: CodeIcon,
  },
  {
    id: 'database',
    label: 'Database',
    description: 'SQLite database',
    icon: DatabaseIcon,
  },
]

const getFileExtension = (type: FileType, name: string): string => {
  // If user already added extension, use it
  if (name.includes('.')) return name

  switch (type) {
    case 'document':
      return `${name}.md`
    case 'word_document':
      return `${name}.docx`
    case 'presentation':
      return `${name}.pptx`
    case 'spreadsheet':
      return `${name}.csv`
    case 'script':
      return `${name}.ts`
    case 'folder':
      return name
    case 'database':
      return `${name}.sqlite`
    case 'memory':
      return name // Memory packages are folders
    case 'agent':
      return name // Agents are special, no extension
    case 'source':
      return name // Sources are special, no extension
    default:
      return name
  }
}

export const CreateFileDialog = ({
  isOpen,
  isDark,
  onConfirm,
  onClose,
}: CreateFileDialogProps) => {
  const [step, setStep] = useState<'type' | 'name'>('type')
  const [selectedType, setSelectedType] = useState<FileType | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setStep('type')
      setSelectedType(null)
      setName('')
      setError(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (step === 'name' && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 150)
    }
  }, [step])

  const handleTypeSelect = (type: FileType) => {
    setSelectedType(type)

    // For agents and sources, skip the name step and directly trigger creation
    if (type === 'agent' || type === 'source') {
      onConfirm('', type)
      onClose()
      return
    }

    setStep('name')
  }

  const validateName = (value: string): boolean => {
    if (!value.trim()) {
      setError('Name cannot be empty')
      return false
    }

    // Check for invalid characters
    const invalidChars = /[<>:"|?*\x00-\x1f]/
    if (invalidChars.test(value)) {
      setError('Name contains invalid characters')
      return false
    }

    // Check for reserved names (Windows)
    const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i
    if (reserved.test(value.replace(/\.[^.]*$/, ''))) {
      setError('This is a reserved name')
      return false
    }

    setError(null)
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedType) return

    if (validateName(name)) {
      const finalName = getFileExtension(selectedType, name.trim())
      onConfirm(finalName, selectedType)
      onClose()
    }
  }

  const handleBack = () => {
    setStep('type')
    setName('')
    setError(null)
  }

  return (
    <CreateModal
      isOpen={isOpen}
      isDark={isDark}
      onClose={onClose}
      title={
        step === 'type'
          ? 'Create new'
          : selectedType === 'folder'
            ? 'New folder'
            : 'New file'
      }
      subtitle={
        step === 'type'
          ? 'Select what you want to create'
          : fileTypeOptions.find((opt) => opt.id === selectedType)?.label
      }>
      {step === 'type' ? (
        <div className='max-h-[400px] overflow-y-auto'>
          <OptionList
            options={fileTypeOptions}
            onOptionClick={handleTypeSelect}
            isDark={isDark}
            showDescriptions={true}
            animated={true}
          />
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className='mb-4'>
            <Input
              ref={inputRef}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) validateName(e.target.value)
              }}
              placeholder={
                selectedType === 'folder' ? 'folder-name' : 'filename'
              }
              variant='surface'
              isDark={isDark}
            />
            {error && (
              <m.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className='mt-2 text-xs text-red-500'>
                {error}
              </m.p>
            )}
          </div>

          <div className='flex gap-2'>
            <Button
              type='button'
              variant='secondary'
              size='medium'
              onClick={handleBack}
              className='flex-1'>
              Back
            </Button>
            <Button
              type='submit'
              variant='active'
              size='medium'
              disabled={!name.trim()}
              className='flex-1'>
              Create
            </Button>
          </div>
        </form>
      )}
    </CreateModal>
  )
}
