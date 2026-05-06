'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { SlideCanvasWithDiff } from '../core/slide-canvas-with-diff'
import { parsePresentation } from '../parser'

// Original presentation YAML - simpler for testing
const originalYaml = `presentation:
  meta:
    title: "Product Launch 2024"
    author: "John Smith"
    date: "2024-01-15"
    theme: "minimal"
    aspectRatio: "16:9"
  
  slides:
    - type: title
      title: "Introducing ProductX"
      subtitle: "The future of productivity"
      
    - type: content
      title: "Key Features"
      layout: single
      content:
        - type: text
          value: "ProductX revolutionizes how teams work together with intelligent automation and seamless collaboration."
        - type: list
          items:
            - "Real-time sync across devices"
            - "AI-powered suggestions"
            - "End-to-end encryption"
            
    - type: metrics
      title: "Performance Metrics"
      metrics:
        - label: "Speed"
          value: "10x"
          change: "+900%"
          trend: "up"
        - label: "Users"
          value: "50K"
          change: "+150%"
          trend: "up"`

// Modified presentation with clear changes
const modifiedYaml = `presentation:
  meta:
    title: "Product Launch 2024 - Update"
    author: "John Smith"
    date: "2024-01-20"
    theme: "minimal"
    aspectRatio: "16:9"
  
  slides:
    - type: title
      title: "Introducing ProductX Pro"
      subtitle: "The ultimate solution for enterprise productivity"
      
    - type: content
      title: "Key Features & Benefits"
      layout: single
      content:
        - type: text
          value: "ProductX Pro revolutionizes how enterprise teams collaborate with advanced AI automation and military-grade security."
        - type: list
          items:
            - "Real-time sync across all platforms"
            - "Advanced AI-powered workflow automation"
            - "Military-grade end-to-end encryption"
            - "24/7 enterprise support"
            
    - type: metrics
      title: "Performance & Growth Metrics"
      metrics:
        - label: "Speed"
          value: "15x"
          change: "+1400%"
          trend: "up"
        - label: "Enterprise Users"
          value: "125K"
          change: "+250%"
          trend: "up"
        - label: "Uptime"
          value: "99.99%"
          change: "+0.09%"
          trend: "up"`

export function SlidesDiffDemoEnhanced() {
  const [showDemo, setShowDemo] = useState(false)

  // Parse presentations
  const originalPresentation = parsePresentation(originalYaml)
  const modifiedPresentation = parsePresentation(modifiedYaml)

  return (
    <div className='space-y-6'>
      <div className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
        <h2 className='mb-4 text-xl font-semibold'>
          Enhanced Slides Diff View Demo
        </h2>
        <p className='mb-6 text-gray-600'>
          This demo shows a unified inline diff view with word-level
          highlighting, similar to GitHub's diff viewer.
        </p>

        <div className='mb-6 space-y-4 text-sm'>
          <div>
            <h3 className='mb-2 font-medium'>What's Different:</h3>
            <ul className='ml-4 space-y-1 text-gray-600'>
              <li>
                •{' '}
                <span
                  className='inline-block rounded px-1'
                  style={{ backgroundColor: '#fecaca' }}>
                  Red background with strikethrough
                </span>{' '}
                for removed text
              </li>
              <li>
                •{' '}
                <span
                  className='inline-block rounded px-1'
                  style={{ backgroundColor: '#bbf7d0' }}>
                  Green background
                </span>{' '}
                for added text
              </li>
              <li>• Word-level diff highlighting for precise changes</li>
              <li>
                • All slide types supported with appropriate diff visualization
              </li>
            </ul>
          </div>

          <div>
            <h3 className='mb-2 font-medium'>Changes in This Demo:</h3>
            <ul className='ml-4 space-y-1 text-gray-600'>
              <li>• Title: "ProductX" → "ProductX Pro"</li>
              <li>• Subtitle expanded with "enterprise" focus</li>
              <li>• Content updated with stronger language</li>
              <li>• New list item added: "24/7 enterprise support"</li>
              <li>• Metrics improved: Speed 10x → 15x, Users 50K → 125K</li>
              <li>• New metric added: "Uptime"</li>
            </ul>
          </div>
        </div>

        <Button
          onClick={() => setShowDemo(!showDemo)}
          variant={showDemo ? 'default' : 'outline'}>
          {showDemo ? 'Hide Demo' : 'Show Demo'}
        </Button>
      </div>

      {showDemo && (
        <div className='space-y-4'>
          <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
            <p className='text-sm text-gray-600'>
              Navigate through the slides to see the inline diff highlighting.
              Use arrow keys or the navigation controls.
            </p>
          </div>

          <div className='h-[600px] overflow-hidden rounded-lg border border-gray-200 bg-white'>
            <SlideCanvasWithDiff
              presentation={modifiedPresentation}
              originalPresentation={originalPresentation}
              diffMode={true}
              showControls={true}
              showDiffTimeline={true}
            />
          </div>
        </div>
      )}
    </div>
  )
}
