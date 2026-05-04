'use client'

/**
 * Modal Component Examples
 *
 * This file demonstrates all the different variants of the Modal component.
 * The Modal component is a unified dialog system that supports multiple variants:
 *
 * 1. Default Modal - Basic modal with custom content
 * 2. Create Modal - Modal for creating new items (like files, folders, etc.)
 * 3. Confirm Modal - Confirmation dialogs for non-destructive actions
 * 4. Destructive Modal - Confirmation dialogs for destructive actions (delete, etc.)
 */

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { ConfirmModal, CreateModal, DefaultModal } from './modal'

export const ModalExamples = () => {
  const [isDark, setIsDark] = useState(true)
  const [showDefault, setShowDefault] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showDestructive, setShowDestructive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const handleConfirm = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      setShowConfirm(false)
      setShowDestructive(false)
      alert('Action confirmed!')
    }, 2000)
  }

  return (
    <div className='space-y-8 p-8'>
      {/* Theme Toggle */}
      <div className='flex items-center gap-4'>
        <label className='text-sm font-medium'>Theme:</label>
        <Button
          variant={isDark ? 'active' : 'secondary'}
          size='small'
          onClick={() => setIsDark(!isDark)}>
          {isDark ? 'Dark' : 'Light'}
        </Button>
      </div>

      {/* Trigger Buttons */}
      <div className='flex flex-wrap gap-4'>
        <Button onClick={() => setShowDefault(true)}>Show Default Modal</Button>
        <Button onClick={() => setShowCreate(true)}>Show Create Modal</Button>
        <Button onClick={() => setShowConfirm(true)}>Show Confirm Modal</Button>
        <Button onClick={() => setShowDestructive(true)}>
          Show Destructive Modal
        </Button>
      </div>

      {/* Example 1: Default Modal */}
      <DefaultModal
        isOpen={showDefault}
        isDark={isDark}
        onClose={() => setShowDefault(false)}
        size='md'>
        <div className='space-y-4'>
          <h2 className='text-xl font-semibold'>Default Modal</h2>
          <p className='text-sm opacity-70'>
            This is a default modal with custom content. You can put any React
            components inside.
          </p>
          <div className='flex justify-end gap-2'>
            <Button
              variant='secondary'
              size='medium'
              onClick={() => setShowDefault(false)}>
              Close
            </Button>
          </div>
        </div>
      </DefaultModal>

      {/* Example 2: Create Modal */}
      <CreateModal
        isOpen={showCreate}
        isDark={isDark}
        onClose={() => {
          setShowCreate(false)
          setInputValue('')
        }}
        title='Create New File'
        subtitle='Enter a name for your new file'>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            alert(`Creating file: ${inputValue}`)
            setShowCreate(false)
            setInputValue('')
          }}>
          <div className='mb-4'>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder='filename.txt'
              variant='surface'
              isDark={isDark}
              autoFocus
            />
          </div>
          <div className='flex gap-2'>
            <Button
              type='button'
              variant='secondary'
              size='medium'
              onClick={() => {
                setShowCreate(false)
                setInputValue('')
              }}
              className='flex-1'>
              Cancel
            </Button>
            <Button
              type='submit'
              variant='active'
              size='medium'
              disabled={!inputValue.trim()}
              className='flex-1'>
              Create
            </Button>
          </div>
        </form>
      </CreateModal>

      {/* Example 3: Confirm Modal (Non-destructive) */}
      <ConfirmModal
        isOpen={showConfirm}
        isDark={isDark}
        onClose={() => setShowConfirm(false)}
        title='Save Changes'
        message='Do you want to save your changes before closing?'
        confirmText='Save'
        cancelText='Discard'
        onConfirm={handleConfirm}
        isLoading={isLoading}
        variant='confirm'
      />

      {/* Example 4: Destructive Modal */}
      <ConfirmModal
        isOpen={showDestructive}
        isDark={isDark}
        onClose={() => setShowDestructive(false)}
        title='Delete File'
        message='Are you sure you want to delete this file? This action cannot be undone.'
        confirmText='Delete'
        onConfirm={handleConfirm}
        isLoading={isLoading}
        variant='destructive'
      />

      {/* Example 5: Using the base Modal component directly with variants */}
      <div className='rounded-lg border border-black/10 bg-black/5 p-4 dark:border-white/10 dark:bg-white/5'>
        <h3 className='mb-2 text-sm font-semibold'>
          Using Modal component directly:
        </h3>
        <pre className='text-xs'>
          {`<Modal
  isOpen={isOpen}
  isDark={isDark}
  onClose={onClose}
  variant="confirm"
  title="Confirm Action"
  message="Are you sure?"
  confirmText="Yes"
  onConfirm={handleConfirm}
/>`}
        </pre>
      </div>

      {/* Usage Documentation */}
      <div className='space-y-4 rounded-lg border border-black/10 bg-black/5 p-6 dark:border-white/10 dark:bg-white/5'>
        <h3 className='text-lg font-semibold'>Usage Guide</h3>

        <div className='space-y-3'>
          <div>
            <h4 className='mb-1 text-sm font-semibold'>Default Modal</h4>
            <p className='text-xs opacity-70'>
              Use for custom content. Accepts any children React components.
            </p>
          </div>

          <div>
            <h4 className='mb-1 text-sm font-semibold'>Create Modal</h4>
            <p className='text-xs opacity-70'>
              Use for creating new items. Has title, subtitle, and custom
              content area. Automatically includes close button.
            </p>
          </div>

          <div>
            <h4 className='mb-1 text-sm font-semibold'>Confirm Modal</h4>
            <p className='text-xs opacity-70'>
              Use for non-destructive confirmations. Has title, message, and
              confirm/cancel buttons. Cancel button style: secondary, Confirm
              button style: active.
            </p>
          </div>

          <div>
            <h4 className='mb-1 text-sm font-semibold'>Destructive Modal</h4>
            <p className='text-xs opacity-70'>
              Use for destructive actions (delete, remove, etc.). Similar to
              Confirm but with destructive button styling (red).
            </p>
          </div>
        </div>

        <div className='mt-4 border-t border-black/10 pt-4 dark:border-white/10'>
          <h4 className='mb-2 text-sm font-semibold'>Common Props</h4>
          <ul className='space-y-1 text-xs opacity-70'>
            <li>
              <code>isOpen</code>: boolean - Controls modal visibility
            </li>
            <li>
              <code>isDark</code>: boolean - Dark/light theme
            </li>
            <li>
              <code>onClose</code>: function - Close handler
            </li>
            <li>
              <code>size</code>: 'sm' | 'md' | 'lg' - Modal size (default: 'md')
            </li>
            <li>
              <code>showCloseButton</code>: boolean - Show/hide X button
              (default: true)
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
