'use client'

import { RiAddCircleLine } from '@remixicon/react'
import React, { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ColorPicker } from '@/components/ui/color-picker'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'

import {
  WorkspaceTemplate,
  WorkspaceTemplateSelector,
} from './workspace-template-selector'

interface CreateWorkspaceModalProps {
  isOpen: boolean
  isDark: boolean
  templates: WorkspaceTemplate[]
  isCreating: boolean
  onClose: () => void
  onCreate: (name: string, templateId: string, color?: string) => void
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  isDark,
  templates,
  isCreating,
  onClose,
  onCreate,
}) => {
  const [workspaceName, setWorkspaceName] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('default')
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    undefined,
  )

  const handleCreate = () => {
    if (workspaceName.trim()) {
      onCreate(workspaceName, selectedTemplateId, selectedColor)
      setWorkspaceName('')
      setSelectedTemplateId('default')
      setSelectedColor(undefined)
    }
  }

  const handleClose = () => {
    if (!isCreating) {
      setWorkspaceName('')
      setSelectedTemplateId('default')
      setSelectedColor(undefined)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      isDark={isDark}
      onClose={handleClose}
      variant='create'
      title='Create workspace'
      subtitle='Choose a template and name your workspace'
      size='lg'
      showCloseButton={!isCreating}>
      <div className='space-y-6'>
        {/* Template Selector */}
        <WorkspaceTemplateSelector
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          onSelect={setSelectedTemplateId}
        />

        {/* Workspace Name Input */}
        <div className='space-y-2'>
          <label className='text-sm font-medium leading-none'>
            Workspace name
          </label>
          <Input
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder='Enter workspace name'
            variant='surface'
            isDark={isDark}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && workspaceName.trim() && !isCreating) {
                handleCreate()
              }
            }}
          />
        </div>

        {/* Color Picker */}
        <div className='space-y-2'>
          <label className='text-sm font-medium leading-none'>
            Color (optional)
          </label>
          <ColorPicker
            value={selectedColor}
            onChange={setSelectedColor}
            size='md'
          />
        </div>

        {/* Action Buttons */}
        <div className='flex gap-2 pt-2'>
          <Button
            variant='secondary'
            size='medium'
            onClick={handleClose}
            disabled={isCreating}
            className='flex-1'>
            Cancel
          </Button>
          <Button
            variant='active'
            size='medium'
            onClick={handleCreate}
            disabled={!workspaceName.trim() || isCreating}
            loading={isCreating}
            iconLeft={<RiAddCircleLine className='h-[14px] w-[14px]' />}
            className='flex-1'>
            Create workspace
          </Button>
        </div>
      </div>
    </Modal>
  )
}
