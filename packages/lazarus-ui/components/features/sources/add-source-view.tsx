'use client'

import {
  RiAddLine,
  RiArrowLeftLine,
  RiDeleteBinLine,
  RiInformationLine,
  RiSettings3Line,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { FileInput } from '@/components/ui/file-input'
import { Input, PasswordInput } from '@/components/ui/input'
import { useAppEvents } from '@/hooks/core/use-app-events'
import { useWorkspace } from '@/hooks/core/use-workspace'
import type { MCPPreset } from '@/hooks/features/mcp/types'
import { useAddMcpServer } from '@/hooks/features/mcp/use-add-mcp-server'
import { useGetMcpPresets } from '@/hooks/features/mcp/use-get-mcp-presets'
import { useUploadMcpCredential } from '@/hooks/features/mcp/use-upload-mcp-credential'
import { useTheme } from '@/hooks/ui/use-theme'
import { getSourceLogoPath } from '@/lib/source-logos'
import { cn } from '@/lib/utils'

// Smooth easing — matches get-started viewer
const smoothEaseOut = [0.22, 1, 0.36, 1] as const

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: smoothEaseOut },
  },
}

interface AddSourceViewProps {
  onClose: () => void
  onAdd: (name: string, config: any) => Promise<void>
}

interface EnvVar {
  id: string
  key: string
  valueType: 'text' | 'file'
  value: string
  file?: File
}

type ViewState = 'select' | 'configure'

const STORAGE_KEY = 'add-source-form-state'

interface FormState {
  selectedPreset: string | null
  isCustom: boolean
  viewState: ViewState
  customName: string
  envValues: Record<string, string>
  customCommand: string
  customArgs: string
  customDescription: string
  customEnvVars: EnvVar[]
}

const getStoredState = (): Partial<FormState> | null => {
  if (typeof window === 'undefined') return null
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

const storeState = (state: FormState) => {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage errors
  }
}

const clearStoredState = () => {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage errors
  }
}

export function AddSourceView({ onClose, onAdd }: AddSourceViewProps) {
  const { isDark } = useTheme()
  const { selectedWorkspace: currentWorkspace } = useWorkspace()
  const { emit } = useAppEvents()
  const { data: presetsData } = useGetMcpPresets()

  // Initialize state from storage or defaults
  const storedState = getStoredState()
  const [selectedPreset, setSelectedPreset] = useState<string | null>(
    storedState?.selectedPreset ?? null,
  )
  const [isCustom, setIsCustom] = useState(storedState?.isCustom ?? false)
  const [viewState, setViewState] = useState<ViewState>(
    storedState?.viewState ?? 'select',
  )

  // Form state
  const [customName, setCustomName] = useState(storedState?.customName ?? '')
  const [envValues, setEnvValues] = useState<Record<string, string>>(
    storedState?.envValues ?? {},
  )
  const [loading, setLoading] = useState(false)
  const [customCommand, setCustomCommand] = useState(
    storedState?.customCommand ?? 'npx',
  )
  const [customArgs, setCustomArgs] = useState(storedState?.customArgs ?? '')
  const [customDescription, setCustomDescription] = useState(
    storedState?.customDescription ?? '',
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isExiting, setIsExiting] = useState(false)
  const [customEnvVars, setCustomEnvVars] = useState<EnvVar[]>(
    storedState?.customEnvVars ?? [],
  )
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set())

  const serverName =
    customName !== selectedPreset ? customName : (selectedPreset ?? '')
  const [addMcpServer] = useAddMcpServer(currentWorkspace?.id ?? '', serverName)
  const [uploadCredential] = useUploadMcpCredential(currentWorkspace?.id ?? '')

  // Persist state changes to sessionStorage
  useEffect(() => {
    storeState({
      selectedPreset,
      isCustom,
      viewState,
      customName,
      envValues,
      customCommand,
      customArgs,
      customDescription,
      customEnvVars,
    })
  }, [
    selectedPreset,
    isCustom,
    viewState,
    customName,
    envValues,
    customCommand,
    customArgs,
    customDescription,
    customEnvVars,
  ])

  // Convert presets array to Record keyed by id
  const presets = useMemo<Record<string, MCPPreset>>(() => {
    const record: Record<string, MCPPreset> = {}
    presetsData?.presets.forEach((p) => {
      if (p.id) record[p.id] = p
    })
    return record
  }, [presetsData])

  // Convert presets to array with IDs
  const presetsArray = useMemo(() => {
    return Object.entries(presets).map(([id, preset]) => ({
      ...preset,
      id,
    }))
  }, [presets])

  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId)
    setIsCustom(false)
    const preset = presets[presetId]
    if (preset) {
      setCustomName(presetId)
      const initialEnv: Record<string, string> = {}
      if (preset.env_schema) {
        Object.keys(preset.env_schema).forEach((key) => {
          initialEnv[key] = ''
        })
      }
      setEnvValues(initialEnv)
    }
    setViewState('configure')
  }

  const handleCustomSelect = () => {
    setSelectedPreset(null)
    setIsCustom(true)
    setCustomName('')
    setEnvValues({})
    setCustomEnvVars([])
    setViewState('configure')
  }

  const handleBack = () => {
    setViewState('select')
    setSelectedPreset(null)
    setIsCustom(false)
  }

  const validateEnvValues = () => {
    const newErrors: Record<string, string> = {}
    if (!isCustom && selectedPreset && presets[selectedPreset]) {
      const preset = presets[selectedPreset]
      if (preset.env_schema) {
        Object.entries(preset.env_schema).forEach(([key, schema]) => {
          const value = envValues[key]
          if (schema.required && !value) {
            newErrors[key] = 'This field is required'
          } else if (value) {
            if (schema.min_length && value.length < schema.min_length) {
              newErrors[key] = `Minimum length is ${schema.min_length}`
            }
            if (schema.max_length && value.length > schema.max_length) {
              newErrors[key] = `Maximum length is ${schema.max_length}`
            }
            if (schema.validation) {
              const regex = new RegExp(schema.validation)
              if (!regex.test(value)) {
                newErrors[key] = 'Invalid format'
              }
            }
          }
        })
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Custom env var handlers
  const addEnvVar = () => {
    const newEnvVar: EnvVar = {
      id: `env-${Date.now()}`,
      key: '',
      valueType: 'text',
      value: '',
    }
    setCustomEnvVars([...customEnvVars, newEnvVar])
  }

  const removeEnvVar = (id: string) => {
    setCustomEnvVars(customEnvVars.filter((env) => env.id !== id))
  }

  const updateEnvVar = (id: string, updates: Partial<EnvVar>) => {
    setCustomEnvVars(
      customEnvVars.map((env) =>
        env.id === id ? { ...env, ...updates } : env,
      ),
    )
  }

  const handleFileUpload = async (
    envVarId: string,
    file: File,
  ): Promise<void> => {
    if (!currentWorkspace) {
      console.error('No workspace selected')
      return
    }

    try {
      setUploadingFiles((prev) => new Set(prev).add(envVarId))

      const formData = new FormData()
      formData.append('file', file)
      formData.append('serverName', customName || 'custom-server')
      formData.append(
        'envKey',
        customEnvVars.find((e) => e.id === envVarId)?.key || '',
      )

      const data = (await uploadCredential(formData)) as any

      // Update env var with the file path
      updateEnvVar(envVarId, {
        value: data?.filePath,
        file: file,
      })
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload credential file. Please try again.')
    } finally {
      setUploadingFiles((prev) => {
        const newSet = new Set(prev)
        newSet.delete(envVarId)
        return newSet
      })
    }
  }

  const handleSubmit = async () => {
    console.log('[AddSourceView] handleSubmit called', {
      isCustom,
      selectedPreset,
      currentWorkspace: currentWorkspace?.id,
      customName,
    })

    if (!validateEnvValues()) {
      console.log('[AddSourceView] Validation failed')
      return
    }

    setLoading(true)
    try {
      if (isCustom) {
        const args = customArgs ? customArgs.split(' ').filter(Boolean) : []

        // Build env vars from custom env var list
        const env: Record<string, string> = {}
        customEnvVars.forEach((envVar) => {
          if (envVar.key && envVar.value) {
            env[envVar.key] = envVar.value
          }
        })

        console.log('[AddSourceView] Adding custom server:', customName)
        // For custom servers, onAdd handles the API call
        await onAdd(customName || 'custom-server', {
          command: customCommand,
          args,
          description: customDescription,
          env,
          enabled: true,
        })
        // Clear stored state on success
        clearStoredState()
        // Close tab after successful add
        onClose()
      } else if (selectedPreset && currentWorkspace) {
        console.log('[AddSourceView] Adding preset server:', selectedPreset)
        await addMcpServer({
          preset_id: selectedPreset,
          env: envValues,
          enabled: true,
        })
        console.log('[AddSourceView] Preset server added successfully')
        // Dispatch event to refresh sources list (don't call onAdd which would try to create again)
        emit('sourceCreated', customName || selectedPreset || '')
        // Clear stored state on success
        clearStoredState()
        onClose()
      } else {
        console.error(
          '[AddSourceView] Cannot submit: missing selectedPreset or currentWorkspace',
          {
            selectedPreset,
            hasWorkspace: !!currentWorkspace,
          },
        )
      }
    } catch (error) {
      console.error('[AddSourceView] Failed to add source:', error)
    } finally {
      setLoading(false)
    }
  }

  const currentPreset = selectedPreset ? presets[selectedPreset] : null

  // ─── Select view — grid layout matching get-started ───
  if (viewState === 'select') {
    // Build items: custom first, then presets
    const gridItems = [
      {
        id: '__custom__',
        name: 'Custom tool',
        description: 'Your own MCP server with custom command and environment',
        logoPath: null as string | null,
        onClick: handleCustomSelect,
      },
      ...presetsArray.map((preset) => ({
        id: preset.id,
        name: preset.name,
        description: preset.description || 'No description',
        logoPath: getSourceLogoPath(preset.id),
        onClick: () => handlePresetSelect(preset.id),
      })),
    ]

    return (
      <div className='relative flex h-full flex-col overflow-hidden'>
        <div className='flex-1 overflow-y-auto'>
          {/* Hero */}
          <m.div
            initial='hidden'
            animate='visible'
            variants={staggerContainer}
            className='flex flex-col items-center px-8 pt-12'>
            <m.h1
              variants={fadeUp}
              className={cn(
                'mb-4 text-center text-[32px] font-semibold tracking-[-0.03em]',
                isDark ? 'text-white' : 'text-black',
              )}>
              Connect a tool
            </m.h1>

            <m.p
              variants={fadeUp}
              className={cn(
                'mb-10 max-w-[380px] text-center text-[15px] leading-relaxed',
                isDark ? 'text-white/50' : 'text-black/50',
              )}>
              Tools extend your agents with external services, data sources, and
              custom integrations via MCP.
            </m.p>
          </m.div>

          {/* Grid — gap-px divider pattern */}
          <div className='mx-auto w-full max-w-3xl px-8 pb-32'>
            <div
              className={cn(
                'grid grid-cols-3 gap-px',
                isDark ? 'bg-white/[0.06]' : 'bg-black/[0.06]',
              )}>
              {gridItems.map((item, index) => {
                const isCustomItem = item.id === '__custom__'
                return (
                  <m.button
                    key={item.id}
                    type='button'
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.6,
                      delay: 0.2 + index * 0.04,
                      ease: smoothEaseOut,
                    }}
                    onClick={item.onClick}
                    className={cn(
                      'group flex flex-col px-6 py-6 text-left transition-colors duration-200',
                      isDark
                        ? 'bg-[#09090b] hover:bg-white/[0.03]'
                        : 'bg-white hover:bg-black/[0.02]',
                    )}>
                    {/* Icon / Logo */}
                    <div className='mb-3 flex h-[28px] w-[28px] items-center justify-center'>
                      {isCustomItem ? (
                        <RiAddLine
                          className={cn(
                            'h-[18px] w-[18px]',
                            isDark ? 'text-white/30' : 'text-black/30',
                          )}
                        />
                      ) : item.logoPath ? (
                        <Image
                          src={item.logoPath}
                          alt={item.name}
                          width={28}
                          height={28}
                          className='h-7 w-7 object-contain'
                        />
                      ) : (
                        <RiSettings3Line
                          className={cn(
                            'h-[18px] w-[18px]',
                            isDark ? 'text-white/30' : 'text-black/30',
                          )}
                        />
                      )}
                    </div>

                    {/* Name */}
                    <span
                      className={cn(
                        'mb-2 text-[15px] font-medium',
                        isDark ? 'text-white/70' : 'text-black/70',
                      )}>
                      {item.name}
                    </span>

                    {/* Description */}
                    <span
                      className={cn(
                        'line-clamp-2 text-[13px] leading-relaxed',
                        isDark ? 'text-white/40' : 'text-black/40',
                      )}>
                      {item.description}
                    </span>
                  </m.button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Configure view — form for selected preset or custom ───
  return (
    <m.div
      className='h-full overflow-y-auto px-6 py-6'
      initial={{ opacity: 0 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}>
      <m.div
        className='relative z-10'
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: isExiting ? 0 : 1,
          y: isExiting ? -20 : 0,
        }}
        transition={{ duration: 0.5, ease: smoothEaseOut }}>
        {/* Header */}
        <div className='sticky top-0 z-20 mb-8 pb-4 backdrop-blur-sm'>
          <m.div
            className='mb-6 flex items-center gap-3 pt-2'
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: smoothEaseOut, delay: 0.1 }}>
            <m.button
              type='button'
              onClick={handleBack}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                isDark
                  ? 'bg-white/10 hover:bg-white/15'
                  : 'bg-black/[0.06] hover:bg-black/10',
              )}
              whileTap={{ opacity: 0.8 }}>
              <RiArrowLeftLine
                size={16}
                className={isDark ? 'text-white/70' : 'text-black/70'}
              />
            </m.button>
          </m.div>

          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: smoothEaseOut }}>
            <h1 className='text-[18px] font-semibold tracking-[-0.02em]'>
              {isCustom
                ? 'Custom tool'
                : currentPreset?.name || 'Configure tool'}
            </h1>
          </m.div>
        </div>

        {/* Form */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: smoothEaseOut }}
          className='mx-auto max-w-3xl'>
          <div className='space-y-6'>
            {isCustom ? (
              /* Custom Configuration Form */
              <>
                <Input
                  label='Server name'
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder='my-custom-server'
                  variant='ghost'
                  isDark={isDark}
                />

                <Input
                  label='Command'
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  placeholder='npx'
                  variant='ghost'
                  isDark={isDark}
                />

                <Input
                  label='Arguments'
                  value={customArgs}
                  onChange={(e) => setCustomArgs(e.target.value)}
                  placeholder='-y @modelcontextprotocol/server-name'
                  variant='ghost'
                  isDark={isDark}
                />

                <Input
                  label='Description'
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder='Custom MCP server integration'
                  variant='ghost'
                  isDark={isDark}
                />

                {/* Environment Variables Section */}
                <div
                  className={cn(
                    'space-y-4 rounded-lg border p-4',
                    isDark
                      ? 'border-white/10 bg-white/5'
                      : 'border-black/10 bg-black/5',
                  )}>
                  <div className='flex items-center justify-between'>
                    <h3 className='text-[14px] font-medium'>
                      Environment variables
                      <span className='ml-2 text-xs font-normal opacity-60'>
                        (optional)
                      </span>
                    </h3>
                    <Button
                      onClick={addEnvVar}
                      variant='secondary'
                      size='small'
                      iconLeft={<RiAddLine className='h-4 w-4' />}>
                      Add variable
                    </Button>
                  </div>

                  {customEnvVars.length === 0 ? (
                    <p
                      className={cn(
                        'text-center text-sm',
                        isDark ? 'text-foreground/60' : 'text-[#666666]',
                      )}>
                      No environment variables added yet
                    </p>
                  ) : (
                    <div className='space-y-4'>
                      {customEnvVars.map((envVar) => (
                        <m.div
                          key={envVar.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={cn(
                            'space-y-3 rounded-lg border p-4',
                            isDark
                              ? 'border-white/10 bg-white/5'
                              : 'border-black/10 bg-white',
                          )}>
                          {/* Variable Name */}
                          <Input
                            label='Variable name'
                            value={envVar.key}
                            onChange={(e) =>
                              updateEnvVar(envVar.id, { key: e.target.value })
                            }
                            placeholder='GOOGLE_APPLICATION_CREDENTIALS'
                            variant='ghost'
                            isDark={isDark}
                          />

                          {/* Value Type Selector */}
                          <div className='flex gap-2'>
                            <button
                              type='button'
                              onClick={() =>
                                updateEnvVar(envVar.id, {
                                  valueType: 'text',
                                  value: '',
                                })
                              }
                              className={cn(
                                'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                                envVar.valueType === 'text'
                                  ? 'border-[#0098FC] bg-[#0098FC]/10 text-[#0098FC]'
                                  : isDark
                                    ? 'border-white/10 text-foreground/60 hover:border-white/20'
                                    : 'border-black/10 text-black/60 hover:border-black/20',
                              )}>
                              Text value
                            </button>
                            <button
                              type='button'
                              onClick={() =>
                                updateEnvVar(envVar.id, {
                                  valueType: 'file',
                                  value: '',
                                })
                              }
                              className={cn(
                                'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                                envVar.valueType === 'file'
                                  ? 'border-[#0098FC] bg-[#0098FC]/10 text-[#0098FC]'
                                  : isDark
                                    ? 'border-white/10 text-foreground/60 hover:border-white/20'
                                    : 'border-black/10 text-black/60 hover:border-black/20',
                              )}>
                              File upload
                            </button>
                          </div>

                          {/* Value Input */}
                          {envVar.valueType === 'text' ? (
                            <Input
                              label='Value'
                              value={envVar.value}
                              onChange={(e) =>
                                updateEnvVar(envVar.id, {
                                  value: e.target.value,
                                })
                              }
                              placeholder='Enter value'
                              variant='ghost'
                              isDark={isDark}
                            />
                          ) : (
                            <FileInput
                              label='Upload credential file'
                              accept='.json'
                              maxSize={5 * 1024 * 1024}
                              disabled={uploadingFiles.has(envVar.id)}
                              isDark={isDark}
                              variant='ghost'
                              onFileSelect={(file) =>
                                handleFileUpload(envVar.id, file)
                              }
                              helperText={
                                envVar.file
                                  ? `Uploaded: ${envVar.file.name}`
                                  : 'Upload your credential JSON file'
                              }
                            />
                          )}

                          {/* Remove Button */}
                          <Button
                            onClick={() => removeEnvVar(envVar.id)}
                            variant='secondary'
                            size='small'
                            iconLeft={<RiDeleteBinLine className='h-4 w-4' />}>
                            Remove
                          </Button>
                        </m.div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Preset Configuration Form */
              <>
                {/* OAuth Info Banner */}
                {currentPreset?.requiresOAuth && (
                  <m.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'flex items-start gap-3 rounded-lg p-4',
                      isDark ? 'bg-blue-500/10' : 'bg-blue-50',
                    )}>
                    <RiInformationLine
                      size={20}
                      className={cn(
                        'mt-0.5 flex-shrink-0',
                        isDark ? 'text-blue-400' : 'text-blue-600',
                      )}
                    />
                    <div>
                      <p
                        className={cn(
                          'text-sm font-medium',
                          isDark ? 'text-blue-400' : 'text-blue-700',
                        )}>
                        Browser authorization required
                      </p>
                      <p
                        className={cn(
                          'mt-1 text-xs',
                          isDark ? 'text-blue-400/70' : 'text-blue-600/70',
                        )}>
                        {currentPreset?.authInstructions ||
                          'After adding this tool, you will need to authorize it by clicking the authorization link in the tool detail view.'}
                      </p>
                    </div>
                  </m.div>
                )}

                <Input
                  label='Server name'
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={selectedPreset || ''}
                  variant='ghost'
                  isDark={isDark}
                />

                {currentPreset?.env_schema && (
                  <div>
                    <h3 className='mb-4 text-[14px] font-medium'>
                      Environment variables
                    </h3>

                    <div className='space-y-4'>
                      {Object.entries(currentPreset.env_schema).map(
                        ([key, schema]) => {
                          // Handle file upload type
                          if (schema.type === 'file') {
                            return (
                              <FileInput
                                key={key}
                                label={key}
                                accept='.json'
                                maxSize={5 * 1024 * 1024}
                                disabled={uploadingFiles.has(key)}
                                isDark={isDark}
                                variant='ghost'
                                onFileSelect={async (file) => {
                                  if (!currentWorkspace) return

                                  try {
                                    setUploadingFiles((prev) =>
                                      new Set(prev).add(key),
                                    )

                                    const formData = new FormData()
                                    formData.append('file', file)
                                    formData.append(
                                      'serverName',
                                      customName || selectedPreset || '',
                                    )
                                    formData.append('envKey', key)

                                    const data = (await uploadCredential(
                                      formData,
                                    )) as any

                                    // Update env values with the file path
                                    setEnvValues({
                                      ...envValues,
                                      [key]: data?.filePath,
                                    })
                                  } catch (error) {
                                    console.error(
                                      'Error uploading file:',
                                      error,
                                    )
                                    alert(
                                      'Failed to upload credential file. Please try again.',
                                    )
                                  } finally {
                                    setUploadingFiles((prev) => {
                                      const newSet = new Set(prev)
                                      newSet.delete(key)
                                      return newSet
                                    })
                                  }
                                }}
                                helperText={
                                  envValues[key]
                                    ? `Uploaded: ${envValues[key].split('/').pop()}`
                                    : schema.description ||
                                      'Upload your credential file'
                                }
                                required={schema.required}
                              />
                            )
                          }

                          // Handle text/password inputs
                          const InputComponent = schema.secure
                            ? PasswordInput
                            : Input
                          return (
                            <InputComponent
                              key={key}
                              label={key}
                              value={envValues[key] || ''}
                              onChange={(e) =>
                                setEnvValues({
                                  ...envValues,
                                  [key]: e.target.value,
                                })
                              }
                              placeholder={schema.placeholder}
                              helperText={schema.description}
                              error={errors[key]}
                              required={schema.required}
                              variant='ghost'
                              isDark={isDark}
                            />
                          )
                        },
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Action Buttons */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.4,
                ease: smoothEaseOut,
              }}
              className={cn(
                'flex justify-end gap-3 border-t pt-6',
                isDark ? 'border-white/5' : 'border-black/5',
              )}>
              <Button onClick={onClose} variant='secondary' size='small'>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !customName}
                variant='active'
                size='small'>
                {loading ? 'Adding...' : 'Add tool'}
              </Button>
            </m.div>
          </div>
        </m.div>
      </m.div>
    </m.div>
  )
}
