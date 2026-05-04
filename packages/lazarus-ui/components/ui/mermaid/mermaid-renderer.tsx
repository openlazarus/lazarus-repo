'use client'

import React, { useEffect, useRef, useState } from 'react'

interface MermaidRendererProps {
  content: string
  className?: string
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({
  content,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mermaidLoaded, setMermaidLoaded] = useState(false)

  // Initialize mermaid
  useEffect(() => {
    import('mermaid').then((mermaid) => {
      mermaid.default.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily:
          'SF Pro Display, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        flowchart: {
          useMaxWidth: false,
          htmlLabels: true,
          curve: 'basis',
          padding: 15,
          nodeSpacing: 40,
          rankSpacing: 60,
          diagramPadding: 20,
        },
        themeVariables: {
          fontSize: '13px',
          fontFamily: 'SF Pro Display, system-ui, sans-serif',
          primaryColor: '#f3f4f6',
          primaryTextColor: '#1f2937',
          primaryBorderColor: '#6b7280',
          lineColor: '#6b7280',
        },
      })
      setMermaidLoaded(true)
    })
  }, [])

  // Render mermaid diagram
  useEffect(() => {
    if (mermaidLoaded && containerRef.current && content) {
      import('mermaid').then(async (mermaid) => {
        try {
          // Clear previous content
          containerRef.current!.innerHTML = ''

          // Validate content before rendering
          if (!content.trim()) {
            throw new Error('Empty mermaid content')
          }

          // Generate unique ID for the diagram
          const id = `mermaid-${Date.now()}`

          // Create a div for the mermaid content
          const div = document.createElement('div')
          div.id = id
          div.className = 'mermaid'
          div.innerHTML = content.trim()

          containerRef.current!.appendChild(div)

          // Render the diagram
          await mermaid.default.run({
            querySelector: `#${id}`,
          })

          // Style the SVG for minimal layout
          const svg = div.querySelector('svg')
          if (svg) {
            svg.style.width = 'auto'
            svg.style.height = 'auto'
            svg.style.maxWidth = '100%'
            svg.style.display = 'block'
            svg.style.margin = '0 auto'

            // Remove any inline width/height attributes for responsiveness
            svg.removeAttribute('width')
            svg.removeAttribute('height')
          }
        } catch (error) {
          if (containerRef.current) {
            containerRef.current.innerHTML = `
              <div class="text-red-500 p-4 text-center">
                <p class="text-sm font-medium">Error rendering diagram</p>
                <p class="text-xs text-gray-500 mt-1">Check console for details</p>
                <details class="mt-2 text-left">
                  <summary class="cursor-pointer text-xs text-gray-600">Show content</summary>
                  <pre class="text-xs bg-gray-100 p-2 mt-1 rounded overflow-auto max-h-32">${content}</pre>
                </details>
              </div>
            `
          }
        }
      })
    }
  }, [content, mermaidLoaded])

  if (!content) {
    return (
      <div className='flex h-full items-center justify-center text-center'>
        <div>
          <div className='mb-4 flex justify-center'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-gray-100'>
              <svg
                className='h-6 w-6 text-gray-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3'
                />
              </svg>
            </div>
          </div>
          <h3 className='mb-2 text-sm font-medium text-gray-900'>
            No diagram content
          </h3>
          <p className='text-xs text-gray-500'>
            Add mermaid content to display a diagram
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-full w-full ${className}`}>
      <div
        ref={containerRef}
        className='flex h-full w-full items-center justify-center p-8'
      />
    </div>
  )
}
