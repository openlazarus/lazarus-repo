'use client'

import * as m from 'motion/react-m'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { CapsuleSearchInput, Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import Spinner from '@/components/ui/spinner'
import { Stack, StackItem } from '@/components/ui/stack'
import { useAuth } from '@/hooks/auth/use-auth'
import { useWorkspace } from '@/hooks/core/use-workspace'
import {
  createApiKey,
  revokeApiKey,
  useApiKeys,
  type ApiKeyWithSecret,
  type CreateApiKeyParams,
} from '@/hooks/features/api-keys/use-api-keys'
import { useAllWorkspaces } from '@/hooks/features/workspace/use-workspaces-with-teams'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'

export function DeveloperSection() {
  const { isDark } = useTheme()
  const { profile } = useAuth()
  const { workspaces: apiKeyWorkspaces } = useAllWorkspaces({
    filterByRoles: ['owner', 'developer'],
  })
  const { selectedWorkspace } = useWorkspace()
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null,
  )
  const effectiveWorkspaceId =
    selectedWorkspaceId ||
    selectedWorkspace?.id ||
    apiKeyWorkspaces[0]?.id ||
    null

  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showKeyDialog, setShowKeyDialog] = useState(false)
  const [createdKey, setCreatedKey] = useState<ApiKeyWithSecret | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const {
    apiKeys,
    isLoading: keysLoading,
    mutate,
  } = useApiKeys(effectiveWorkspaceId)

  const filteredKeys = useMemo(() => {
    if (!searchQuery.trim()) return apiKeys
    const query = searchQuery.toLowerCase()
    return apiKeys.filter(
      (key) =>
        key.name.toLowerCase().includes(query) ||
        key.keyPrefix.toLowerCase().includes(query),
    )
  }, [apiKeys, searchQuery])

  if (!profile) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Spinner size='sm' />
      </div>
    )
  }

  return (
    <m.div
      className='w-full'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}>
      <div className='space-y-8'>
        {/* API Keys Section */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}>
          <div className='mb-4 flex items-center justify-between'>
            <div>
              <h3
                className={cn(
                  'text-[13px] font-semibold uppercase tracking-wider',
                  isDark ? 'text-foreground/60' : 'text-[#666666]',
                )}>
                API keys
              </h3>
              <p
                className={cn(
                  'mt-1 text-[12px]',
                  isDark ? 'text-foreground/40' : 'text-black/40',
                )}>
                Programmatic access to your workspaces
              </p>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              variant='active'
              size='small'
              shape='pill'>
              Create API key
            </Button>
          </div>

          {/* Workspace selector */}
          {apiKeyWorkspaces.length > 0 && (
            <div className='mb-4 max-w-sm'>
              <Select
                value={effectiveWorkspaceId ?? ''}
                onValueChange={(v) => setSelectedWorkspaceId(v)}
                isDark={isDark}
                size='small'>
                {apiKeyWorkspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Search - only show when there are keys to search */}
          {apiKeys.length > 0 && (
            <div className='mb-4 max-w-sm'>
              <CapsuleSearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                placeholder='Search API keys...'
                variant='surface'
                isDark={isDark}
                size='small'
              />
            </div>
          )}

          {/* Keys list */}
          {keysLoading ? (
            <div className='flex items-center justify-center py-12'>
              <Spinner size='sm' />
            </div>
          ) : filteredKeys.length === 0 ? (
            <div
              className={cn(
                'py-12 text-center',
                isDark ? 'text-foreground/40' : 'text-black/40',
              )}>
              <p className='text-[13px]'>
                {searchQuery.trim()
                  ? 'No API keys match your search.'
                  : 'No API keys yet. Create one to get started.'}
              </p>
            </div>
          ) : (
            <Stack isDark={isDark}>
              {filteredKeys.map((key, index) => {
                const isDeleting = deleteConfirm === key.id

                return (
                  <StackItem key={key.id} isDark={isDark} index={index}>
                    <div className='flex items-center justify-between py-4'>
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-2.5'>
                          <p
                            className={cn(
                              'text-[14px] font-medium',
                              isDark ? 'text-foreground' : 'text-[#1a1a1a]',
                            )}>
                            {key.name}
                          </p>
                          <code
                            className={cn(
                              'font-mono text-[11px]',
                              isDark ? 'text-foreground/30' : 'text-black/30',
                            )}>
                            {key.keyPrefix}...
                          </code>
                        </div>
                        <div
                          className={cn(
                            'mt-1 flex items-center gap-1.5 text-[12px]',
                            isDark ? 'text-foreground/50' : 'text-black/50',
                          )}>
                          <span>
                            {new Date(key.createdAt).toLocaleDateString(
                              'en-US',
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              },
                            )}
                          </span>
                          {key.lastUsedAt && (
                            <>
                              <span className='opacity-40'>·</span>
                              <span>
                                Last used{' '}
                                {new Date(key.lastUsedAt).toLocaleDateString(
                                  'en-US',
                                  {
                                    month: 'short',
                                    day: 'numeric',
                                  },
                                )}
                              </span>
                            </>
                          )}
                          <span className='opacity-40'>·</span>
                          <span>{key.rateLimit} req/min</span>
                        </div>
                        <div className='mt-2 flex items-center gap-1.5'>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                              isDark
                                ? 'bg-[#0098FC]/10 text-[#0098FC]'
                                : 'bg-[#0098FC]/8 text-[#0098FC]',
                            )}>
                            {key.permissions.operations.join(' · ')}
                          </span>
                          {key.permissions.databases.includes('*') ? (
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                                isDark
                                  ? 'bg-foreground/5 text-foreground/50'
                                  : 'bg-black/5 text-black/50',
                              )}>
                              All databases
                            </span>
                          ) : (
                            key.permissions.databases.map((db: string) => (
                              <span
                                key={db}
                                className={cn(
                                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                                  isDark
                                    ? 'bg-foreground/5 text-foreground/50'
                                    : 'bg-black/5 text-black/50',
                                )}>
                                {db}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className='ml-4 flex-shrink-0'>
                        {isDeleting ? (
                          <div className='flex items-center gap-2'>
                            <Button
                              size='small'
                              variant='secondary'
                              shape='pill'
                              onClick={() => setDeleteConfirm(null)}>
                              Cancel
                            </Button>
                            <Button
                              size='small'
                              variant='destructive'
                              shape='pill'
                              onClick={async () => {
                                await revokeApiKey(key.serverId, key.id)
                                mutate()
                                setDeleteConfirm(null)
                              }}>
                              Delete
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size='small'
                            variant='secondary'
                            shape='pill'
                            onClick={() => setDeleteConfirm(key.id)}
                            className={cn(
                              isDark
                                ? 'text-foreground/50 hover:text-red-400'
                                : 'text-black/40 hover:text-red-500',
                            )}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </StackItem>
                )
              })}
            </Stack>
          )}
        </m.div>
      </div>

      {/* Create API Key Dialog */}
      {showCreateDialog && (
        <CreateApiKeyDialog
          workspaces={apiKeyWorkspaces}
          userId={profile.id}
          onClose={() => setShowCreateDialog(false)}
          onCreated={(key) => {
            setCreatedKey(key)
            setShowCreateDialog(false)
            setShowKeyDialog(true)
            mutate()
          }}
        />
      )}

      {/* Show Created Key Dialog */}
      {showKeyDialog && createdKey && (
        <ShowKeyDialog
          apiKey={createdKey}
          onClose={() => {
            setShowKeyDialog(false)
            setCreatedKey(null)
          }}
        />
      )}
    </m.div>
  )
}

// Create API Key Dialog
function CreateApiKeyDialog({
  workspaces,
  userId,
  onClose,
  onCreated,
}: {
  workspaces: any[]
  userId: string
  onClose: () => void
  onCreated: (key: ApiKeyWithSecret) => void
}) {
  const { isDark } = useTheme()
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('')
  const [name, setName] = useState('')
  const [operations, setOperations] = useState<('read' | 'write' | 'delete')[]>(
    ['read'],
  )
  const [databases, setDatabases] = useState<string>('*')
  const [rateLimit, setRateLimit] = useState(100)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a name for the API key')
      return
    }

    if (!selectedWorkspaceId) {
      setError('Please select a workspace')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const params: CreateApiKeyParams = {
        serverId: selectedWorkspaceId,
        name: name.trim(),
        operations,
        databases:
          databases === '*' ? ['*'] : databases.split(',').map((s) => s.trim()),
        rateLimit,
      }

      const key = await createApiKey(params)
      onCreated(key)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      isDark={isDark}
      onClose={onClose}
      size='lg'
      showCloseButton={true}>
      <div className='space-y-5'>
        <div>
          <h3
            className={cn(
              'text-[16px] font-semibold',
              isDark ? 'text-foreground' : 'text-[#1a1a1a]',
            )}>
            Create API key
          </h3>
          <p
            className={cn(
              'mt-1 text-[13px]',
              isDark ? 'text-foreground/50' : 'text-black/50',
            )}>
            Generate a new key for programmatic access
          </p>
        </div>

        <div className='space-y-4'>
          {/* Key Name */}
          <div>
            <label
              className={cn(
                'mb-2 block text-[11px] font-medium uppercase tracking-wider',
                isDark ? 'text-foreground/50' : 'text-[#999999]',
              )}>
              Key name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='My API key'
              variant='surface'
              isDark={isDark}
            />
          </div>

          {/* Workspace Selector */}
          <Select
            label='Workspace'
            isDark={isDark}
            variant='ghost'
            size='medium'
            value={selectedWorkspaceId}
            onValueChange={setSelectedWorkspaceId}
            className='mt-1.5'>
            <option value=''>Select a workspace...</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </Select>

          {/* Permissions */}
          <div>
            <label
              className={cn(
                'mb-2 block text-[11px] font-medium uppercase tracking-wider',
                isDark ? 'text-foreground/50' : 'text-[#999999]',
              )}>
              Permissions
            </label>
            <div className='mt-2 flex gap-2'>
              {(['read', 'write', 'delete'] as const).map((op) => {
                const isActive = operations.includes(op)
                return (
                  <button
                    key={op}
                    type='button'
                    onClick={() => {
                      if (isActive) {
                        setOperations(operations.filter((o) => o !== op))
                      } else {
                        setOperations([...operations, op])
                      }
                    }}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-[12px] font-medium capitalize transition-all duration-200',
                      isActive
                        ? 'bg-[#0098FC]/10 text-[#0098FC]'
                        : isDark
                          ? 'bg-foreground/5 text-foreground/40 hover:bg-foreground/10'
                          : 'bg-black/5 text-black/40 hover:bg-black/10',
                    )}>
                    {op}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Databases */}
          <div>
            <label
              className={cn(
                'mb-2 block text-[11px] font-medium uppercase tracking-wider',
                isDark ? 'text-foreground/50' : 'text-[#999999]',
              )}>
              Databases
            </label>
            <Input
              value={databases}
              onChange={(e) => setDatabases(e.target.value)}
              placeholder='* (all databases)'
              variant='surface'
              isDark={isDark}
            />
            <p
              className={cn(
                'mt-1.5 text-[11px]',
                isDark ? 'text-foreground/30' : 'text-black/30',
              )}>
              Use * for all databases, or comma-separated names
            </p>
          </div>

          {/* Rate Limit */}
          <div>
            <label
              className={cn(
                'mb-2 block text-[11px] font-medium uppercase tracking-wider',
                isDark ? 'text-foreground/50' : 'text-[#999999]',
              )}>
              Rate limit (req/min)
            </label>
            <Input
              type='number'
              value={rateLimit}
              onChange={(e) => setRateLimit(parseInt(e.target.value) || 100)}
              min={1}
              max={1000}
              variant='surface'
              isDark={isDark}
            />
          </div>

          {error && <p className='text-[12px] text-red-500'>{error}</p>}
        </div>

        <div className='flex justify-end gap-2 pt-2'>
          <Button
            variant='secondary'
            size='small'
            shape='pill'
            onClick={onClose}
            disabled={isCreating}>
            Cancel
          </Button>
          <Button
            variant='active'
            size='small'
            shape='pill'
            onClick={handleCreate}
            loading={isCreating}
            disabled={!name.trim() || !selectedWorkspaceId}>
            Create key
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Show Created Key Dialog
function ShowKeyDialog({
  apiKey,
  onClose,
}: {
  apiKey: ApiKeyWithSecret
  onClose: () => void
}) {
  const { isDark } = useTheme()
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey.key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal
      isOpen={true}
      isDark={isDark}
      onClose={onClose}
      size='md'
      showCloseButton={false}>
      <div className='space-y-5'>
        <div>
          <h3
            className={cn(
              'text-[16px] font-semibold',
              isDark ? 'text-foreground' : 'text-[#1a1a1a]',
            )}>
            API key created
          </h3>
          <p
            className={cn(
              'mt-1 text-[13px]',
              isDark ? 'text-foreground/50' : 'text-black/50',
            )}>
            Copy your key now — you won't be able to see it again.
          </p>
        </div>

        <div>
          <label
            className={cn(
              'mb-2 block text-[11px] font-medium uppercase tracking-wider',
              isDark ? 'text-foreground/50' : 'text-[#999999]',
            )}>
            Your API key
          </label>
          <div className='flex gap-2'>
            <code
              className={cn(
                'flex-1 overflow-x-auto rounded-xl p-3 font-mono text-[12px]',
                isDark
                  ? 'bg-foreground/5 text-foreground/80'
                  : 'bg-black/[0.04] text-[#1a1a1a]',
              )}>
              {apiKey.key}
            </code>
            <Button
              variant='secondary'
              size='small'
              shape='pill'
              onClick={copyToClipboard}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        <div className='flex justify-end pt-2'>
          <Button variant='active' size='small' shape='pill' onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  )
}
