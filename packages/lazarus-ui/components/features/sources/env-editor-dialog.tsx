'use client'

import {
  RiCloseLine,
  RiEyeLine,
  RiEyeOffLine,
  RiKey2Line,
} from '@remixicon/react'
import { useEffect, useState } from 'react'

import { Button, Input } from '@/components/ui'
import { DefaultModal } from '@/components/ui/modal'
import type { MCPPreset } from '@/hooks/features/mcp/types'
import { useGetMcpPresets } from '@/hooks/features/mcp/use-get-mcp-presets'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'

import { Source } from './types'

interface EnvEditorDialogProps {
  open: boolean
  serverName: string
  source: Source | null
  onClose: () => void
  onSave: (name: string, env: Record<string, string>) => Promise<void>
}

export function EnvEditorDialog({
  open,
  serverName,
  source,
  onClose,
  onSave,
}: EnvEditorDialogProps) {
  const { isDark } = useTheme()
  const [envValues, setEnvValues] = useState<Record<string, string>>({})
  const [showValues, setShowValues] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [preset, setPreset] = useState<MCPPreset | null>(null)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const { data: presetsData } = useGetMcpPresets()

  useEffect(() => {
    if (open && source) {
      setEnvValues(source.env || {})
      const hidden: Record<string, boolean> = {}
      Object.keys(source.env || {}).forEach((key) => {
        hidden[key] = false
      })
      setShowValues(hidden)
      if (source.preset_id && presetsData) {
        setPreset(
          presetsData.presets.find((p) => p.id === source.preset_id) ?? null,
        )
      }
    }
  }, [open, source, presetsData])

  const handleSave = async () => {
    setLoading(true)
    try {
      await onSave(serverName, envValues)
      handleClose()
    } catch (error) {
      console.error('Failed to save environment variables:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setEnvValues({})
    setShowValues({})
    setNewKey('')
    setNewValue('')
    setPreset(null)
    onClose()
  }

  const addNewVariable = () => {
    if (newKey && newValue) {
      setEnvValues({ ...envValues, [newKey]: newValue })
      setShowValues({ ...showValues, [newKey]: false })
      setNewKey('')
      setNewValue('')
    }
  }

  const removeVariable = (key: string) => {
    const updated = { ...envValues }
    delete updated[key]
    setEnvValues(updated)
  }

  const toggleShowValue = (key: string) => {
    setShowValues({ ...showValues, [key]: !showValues[key] })
  }

  const isSecureKey = (key: string) => {
    const securePatterns = ['TOKEN', 'KEY', 'SECRET', 'PASSWORD', 'API']
    return securePatterns.some((pattern) => key.toUpperCase().includes(pattern))
  }

  return (
    <DefaultModal
      isOpen={open}
      isDark={isDark}
      onClose={handleClose}
      size='lg'
      showCloseButton={true}>
      <div className='mb-4 flex items-center justify-between border-b pb-4'>
        <div>
          <h2 className='text-xl font-semibold'>Environment Variables</h2>
          <p
            className={cn(
              'text-sm',
              isDark ? 'text-white/60' : 'text-black/60',
            )}>
            {serverName}
          </p>
        </div>
      </div>

      <div className='max-h-[60vh] overflow-y-auto'>
        <div className='space-y-4'>
          {Object.entries(envValues).length > 0 ? (
            Object.entries(envValues).map(([key, value]) => {
              const schema = preset?.env_schema?.[key]
              return (
                <div
                  key={key}
                  className={cn(
                    'rounded-lg border p-4',
                    isDark
                      ? 'border-white/10 bg-white/[0.02]'
                      : 'border-black/10 bg-black/[0.02]',
                  )}>
                  <div className='mb-2 flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium'>{key}</span>
                      {isSecureKey(key) && (
                        <RiKey2Line size={14} className='text-yellow-500' />
                      )}
                    </div>
                    <Button
                      variant='secondary'
                      size='small'
                      onClick={() => removeVariable(key)}
                      className='!p-1 text-red-500 hover:bg-red-500/10'>
                      <RiCloseLine size={16} />
                    </Button>
                  </div>
                  {schema?.description && (
                    <p
                      className={cn(
                        'mb-2 text-xs',
                        isDark ? 'text-white/60' : 'text-black/60',
                      )}>
                      {schema.description}
                    </p>
                  )}
                  <div className='flex items-center gap-2'>
                    <Input
                      type={showValues[key] ? 'text' : 'password'}
                      value={value}
                      onChange={(e) =>
                        setEnvValues({
                          ...envValues,
                          [key]: e.target.value,
                        })
                      }
                      placeholder={schema?.placeholder || 'Enter value...'}
                      className='flex-1'
                    />
                    <Button
                      variant='secondary'
                      size='small'
                      onClick={() => toggleShowValue(key)}
                      className='!p-2'>
                      {showValues[key] ? (
                        <RiEyeOffLine size={16} />
                      ) : (
                        <RiEyeLine size={16} />
                      )}
                    </Button>
                  </div>
                </div>
              )
            })
          ) : (
            <div
              className={cn(
                'rounded-lg border border-dashed p-8 text-center',
                isDark ? 'border-white/20' : 'border-black/20',
              )}>
              <p className={isDark ? 'text-white/60' : 'text-black/60'}>
                No environment variables configured
              </p>
            </div>
          )}

          <div className='mt-6 border-t pt-6'>
            <h3 className='mb-4 font-medium'>Add New Variable</h3>
            <div className='flex gap-2'>
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                placeholder='VARIABLE_NAME'
                className='flex-1'
              />
              <Input
                type='password'
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder='Value'
                className='flex-1'
              />
              <Button
                variant='secondary'
                onClick={addNewVariable}
                disabled={!newKey || !newValue}>
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className='mt-4 flex justify-between border-t pt-4'>
        <div
          className={cn(
            'flex items-center gap-2 text-sm',
            isDark ? 'text-yellow-400/80' : 'text-yellow-600',
          )}>
          <RiKey2Line size={16} />
          <span>Sensitive data will be stored securely</span>
        </div>
        <div className='flex gap-3'>
          <Button variant='secondary' onClick={handleClose}>
            Cancel
          </Button>
          <Button variant='primary' onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </DefaultModal>
  )
}
