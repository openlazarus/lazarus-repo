'use client'

import { RiCodeLine, RiExternalLinkLine, RiRefreshLine } from '@remixicon/react'

import { Button } from '@/components/ui/button'
import Spinner from '@/components/ui/spinner'
import { useV0Project } from '@/hooks/features/v0/use-v0-project'
import { cn } from '@/lib/utils'

interface V0ProjectViewProps {
  workspaceId: string
  projectId: string
  filePath: string
}

export function V0ProjectView({
  workspaceId,
  projectId,
  filePath,
}: V0ProjectViewProps) {
  const { project, loading, error, refreshProject } = useV0Project(
    workspaceId,
    projectId,
    filePath,
  )

  if (loading) {
    return (
      <div className='flex h-full items-center justify-center'>
        <Spinner size='md' />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='text-center'>
          <p className='text-red-600 dark:text-red-400'>
            {error || 'Project not found'}
          </p>
          <Button
            onClick={refreshProject}
            variant='primary'
            size='medium'
            className='mt-4'>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Get the deployment URL from the .app file
  const deploymentUrl = project.deploymentUrl || project.latestDeployment?.url
  const v0ChatUrl = project.webUrl || `https://v0.dev/chat/${project.chatId}`

  return (
    <div className='flex h-full flex-col'>
      {/* Header with app info and actions */}
      <div className='flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4'>
        <div className='flex items-center gap-4'>
          {/* App icon */}
          <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0098FC] to-[#0066CC]'>
            <RiCodeLine className='h-6 w-6 text-white' />
          </div>

          {/* App name and description */}
          <div>
            <h1 className='text-xl font-semibold text-[hsl(var(--text-primary))]'>
              {project.name}
            </h1>
            {project.description && (
              <p className='mt-0.5 max-w-xl text-sm text-[hsl(var(--text-secondary))]'>
                {project.description}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className='flex items-center gap-3'>
          {/* Refresh button */}
          <Button
            onClick={refreshProject}
            variant='secondary'
            size='small'
            className='gap-2'>
            <RiRefreshLine className='h-4 w-4' />
            Refresh
          </Button>

          {/* Open v0 Chat */}
          <a href={v0ChatUrl} target='_blank' rel='noopener noreferrer'>
            <Button variant='secondary' size='small' className='gap-2'>
              <RiExternalLinkLine className='h-4 w-4' />
              Edit in v0
            </Button>
          </a>

          {/* Open Deployment - Primary action */}
          {deploymentUrl && (
            <a href={deploymentUrl} target='_blank' rel='noopener noreferrer'>
              <Button variant='primary' size='small' className='gap-2'>
                <RiExternalLinkLine className='h-4 w-4' />
                Open App
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className='flex items-center gap-6 border-b border-[hsl(var(--border))] bg-[hsl(var(--background-secondary))] px-6 py-3'>
        {/* Status */}
        <div className='flex items-center gap-2'>
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              project.status === 'deployed' && 'bg-green-500',
              project.status === 'deploying' && 'bg-yellow-500',
              project.status === 'ready' && 'bg-blue-500',
              project.status === 'error' && 'bg-red-500',
            )}
          />
          <span className='text-sm capitalize text-[hsl(var(--text-secondary))]'>
            {project.status || 'Unknown'}
          </span>
        </div>

        {/* Platform */}
        {project.deploymentPlatform && (
          <div className='text-sm text-[hsl(var(--text-secondary))]'>
            <span className='text-[hsl(var(--text-tertiary))]'>Platform:</span>{' '}
            <span className='capitalize'>{project.deploymentPlatform}</span>
          </div>
        )}

        {/* Tech stack */}
        {project.technicalStack && project.technicalStack.length > 0 && (
          <div className='flex items-center gap-2'>
            <span className='text-sm text-[hsl(var(--text-tertiary))]'>
              Stack:
            </span>
            <div className='flex items-center gap-1.5'>
              {project.technicalStack.slice(0, 4).map((tech: string) => (
                <span
                  key={tech}
                  className='rounded-md bg-[hsl(var(--border))] px-2 py-0.5 text-xs text-[hsl(var(--text-secondary))]'>
                  {tech}
                </span>
              ))}
              {project.technicalStack.length > 4 && (
                <span className='text-xs text-[hsl(var(--text-tertiary))]'>
                  +{project.technicalStack.length - 4}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main content - iframe preview */}
      <div className='flex-1 overflow-hidden p-6'>
        {deploymentUrl ? (
          <div className='h-full overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-white'>
            <iframe
              src={deploymentUrl}
              className='h-full w-full'
              title={`${project.name} Preview`}
            />
          </div>
        ) : (
          <div className='flex h-full items-center justify-center rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--background-secondary))]'>
            <div className='text-center'>
              <p className='text-sm text-[hsl(var(--text-secondary))]'>
                No deployment available
              </p>
              <p className='mt-1 text-xs text-[hsl(var(--text-tertiary))]'>
                Deploy this project from v0 to see a preview
              </p>
              <a
                href={v0ChatUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='mt-4 inline-block'>
                <Button variant='primary' size='small' className='gap-2'>
                  <RiExternalLinkLine className='h-4 w-4' />
                  Open in v0
                </Button>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
