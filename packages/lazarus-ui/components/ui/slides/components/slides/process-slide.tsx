'use client'

import React from 'react'

import { ProcessStep, Slide } from '../../types'

interface ProcessSlideProps {
  slide: Slide
  theme: any
}

export function ProcessSlide({ slide, theme }: ProcessSlideProps) {
  const { title, subtitle, steps = [] } = slide

  if (!steps || steps.length === 0) {
    return (
      <div className='flex h-full items-center justify-center text-muted-foreground'>
        <p>No process steps provided</p>
      </div>
    )
  }

  // Determine layout based on number of steps
  const isHorizontal = steps.length <= 5

  return (
    <div
      className='flex h-full flex-col'
      style={{ padding: theme.spacing.slide.padding }}>
      {/* Header */}
      {(title || subtitle) && (
        <div className='mb-8'>
          {title && (
            <h2
              className='mb-3 text-4xl font-semibold'
              style={{
                fontFamily: theme.typography.fontFamily.sans,
                color: theme.colors.text,
              }}>
              {title}
            </h2>
          )}
          {subtitle && (
            <p
              className='text-xl opacity-80'
              style={{
                fontFamily: theme.typography.fontFamily.sans,
                color: theme.colors.muted,
              }}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Process Steps */}
      <div className='flex flex-1 items-center'>
        {isHorizontal ? (
          <HorizontalProcess steps={steps} theme={theme} />
        ) : (
          <VerticalProcess steps={steps} theme={theme} />
        )}
      </div>
    </div>
  )
}

function HorizontalProcess({
  steps,
  theme,
}: {
  steps: ProcessStep[]
  theme: any
}) {
  return (
    <div className='w-full'>
      <div className='flex items-center justify-between'>
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            {/* Step */}
            <div
              className='flex flex-1 flex-col items-center text-center'
              style={{ maxWidth: '200px' }}>
              {/* Step Number/Icon */}
              <div
                className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300 ${step.status === 'completed' ? 'scale-100' : ''} ${step.status === 'current' ? 'scale-110 shadow-lg' : ''} ${step.status === 'upcoming' ? 'opacity-50' : ''} `}
                style={{
                  backgroundColor:
                    step.status === 'completed'
                      ? theme.colors.primary
                      : step.status === 'current'
                        ? theme.colors.primary
                        : theme.colors.border,
                  color:
                    step.status === 'upcoming'
                      ? theme.colors.muted
                      : theme.colors.background,
                }}>
                {step.icon ? (
                  <span className='text-2xl'>{step.icon}</span>
                ) : (
                  <span className='text-xl font-bold'>
                    {step.number || index + 1}
                  </span>
                )}
              </div>

              {/* Title */}
              <h3
                className='mb-2 text-lg font-semibold'
                style={{
                  color:
                    step.status === 'upcoming'
                      ? theme.colors.muted
                      : theme.colors.text,
                  fontFamily: theme.typography.fontFamily.sans,
                }}>
                {step.title}
              </h3>

              {/* Description */}
              <p
                className='text-sm opacity-80'
                style={{
                  color: theme.colors.muted,
                }}>
                {step.description}
              </p>
            </div>

            {/* Connector */}
            {index < steps.length - 1 && (
              <div
                className='mx-2 h-0.5 w-16 flex-shrink-0'
                style={{
                  backgroundColor:
                    steps[index].status === 'completed' &&
                    steps[index + 1].status !== 'upcoming'
                      ? theme.colors.primary
                      : theme.colors.border,
                  opacity: steps[index + 1].status === 'upcoming' ? 0.3 : 1,
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

function VerticalProcess({
  steps,
  theme,
}: {
  steps: ProcessStep[]
  theme: any
}) {
  return (
    <div className='mx-auto w-full max-w-2xl'>
      <div className='space-y-6'>
        {steps.map((step, index) => (
          <div key={index} className='flex items-start gap-6'>
            {/* Step Number/Icon */}
            <div
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300 ${step.status === 'completed' ? 'scale-100' : ''} ${step.status === 'current' ? 'scale-110 shadow-lg' : ''} ${step.status === 'upcoming' ? 'opacity-50' : ''} `}
              style={{
                backgroundColor:
                  step.status === 'completed'
                    ? theme.colors.primary
                    : step.status === 'current'
                      ? theme.colors.primary
                      : theme.colors.border,
                color:
                  step.status === 'upcoming'
                    ? theme.colors.muted
                    : theme.colors.background,
              }}>
              {step.icon ? (
                <span className='text-xl'>{step.icon}</span>
              ) : (
                <span className='text-lg font-bold'>
                  {step.number || index + 1}
                </span>
              )}
            </div>

            {/* Content */}
            <div className='flex-1'>
              <h3
                className='mb-2 text-xl font-semibold'
                style={{
                  color:
                    step.status === 'upcoming'
                      ? theme.colors.muted
                      : theme.colors.text,
                  fontFamily: theme.typography.fontFamily.sans,
                }}>
                {step.title}
              </h3>
              <p
                className='text-base opacity-80'
                style={{
                  color: theme.colors.muted,
                }}>
                {step.description}
              </p>
            </div>

            {/* Status Badge */}
            {step.status && (
              <div
                className={`rounded-full px-3 py-1 text-xs font-medium ${step.status === 'completed' ? 'bg-green-100 text-green-700' : ''} ${step.status === 'current' ? 'bg-blue-100 text-blue-700' : ''} ${step.status === 'upcoming' ? 'bg-gray-100 text-gray-500' : ''} `}>
                {step.status === 'completed'
                  ? '✓ Done'
                  : step.status === 'current'
                    ? 'In Progress'
                    : 'Upcoming'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
