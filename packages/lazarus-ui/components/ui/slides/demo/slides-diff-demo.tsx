'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { SlideCanvasWithDiff } from '../core/slide-canvas-with-diff'
import { parsePresentation } from '../parser'

// Original presentation YAML
const originalYaml = `presentation:
  meta:
    title: "Q4 2023 Results"
    author: "John Smith"
    date: "2023-12-15"
    theme: "minimal"
    aspectRatio: "16:9"
  
  slides:
    - type: title
      title: "Q4 2023 Financial Results"
      subtitle: "Year-End Performance Review"
      
    - type: metrics
      title: "Key Performance Indicators"
      metrics:
        - label: "Revenue"
          value: "$45M"
          change: "+15%"
          trend: "up"
        - label: "Active Users"
          value: "125K"
          change: "+22%"
          trend: "up"
        - label: "NPS Score"
          value: "72"
          change: "+5"
          trend: "up"
          
    - type: content
      title: "Revenue Growth"
      layout: two-column
      content:
        left:
          - type: text
            value: "## Quarterly Performance\n\nOur Q4 results show strong growth across all key metrics:\n\n- **Revenue**: Exceeded targets by 8%\n- **New Customers**: 2,500 new enterprise accounts\n- **Retention**: 94% customer retention rate"
        right:
          - type: image
            src: "/api/placeholder/600/400"
            alt: "Revenue growth chart"
            
    - type: comparison
      title: "Year-over-Year Comparison"
      items:
        - "2022":
            title: "2022"
            points:
              - "Revenue: $38M"
              - "Users: 95K"
              - "Markets: 12"
          "2023":
            title: "2023"
            points:
              - "Revenue: $45M"
              - "Users: 125K"
              - "Markets: 18"
            
    - type: summary
      title: "Looking Ahead"
      highlights:
        - "Launch new enterprise features in Q1"
        - "Expand to Asian markets"
        - "Target $60M revenue for 2024"`

// Modified presentation YAML with changes
const modifiedYaml = `presentation:
  meta:
    title: "Q4 2023 Results - Final"
    author: "John Smith"
    date: "2024-01-10"
    theme: "minimal"
    aspectRatio: "16:9"
  
  slides:
    - type: title
      title: "Q4 2023 Financial Results"
      subtitle: "Record-Breaking Performance"
      
    - type: metrics
      title: "Key Performance Indicators"
      metrics:
        - label: "Revenue"
          value: "$48M"
          change: "+20%"
          trend: "up"
        - label: "Active Users"
          value: "132K"
          change: "+28%"
          trend: "up"
        - label: "NPS Score"
          value: "75"
          change: "+8"
          trend: "up"
        - label: "Churn Rate"
          value: "5.2%"
          change: "-2.1%"
          trend: "down"
          
    - type: data-viz
      title: "Revenue Breakdown by Region"
      data:
        type: "pie"
        datasets:
          - label: "Revenue by Region"
            data: [45, 30, 15, 10]
            labels: ["North America", "Europe", "Asia", "Other"]
            
    - type: content
      title: "Revenue Growth Analysis"
      layout: two-column
      content:
        left:
          - type: text
            value: "## Record Quarter Performance\n\nQ4 2023 marks our best quarter ever:\n\n- **Revenue**: $48M (exceeded targets by 12%)\n- **New Customers**: 3,200 enterprise accounts\n- **Retention**: 96% customer retention rate\n- **International Growth**: 40% of revenue from new markets"
        right:
          - type: image
            src: "/api/placeholder/600/400"
            alt: "Updated revenue growth chart"
            
    - type: comparison
      title: "Year-over-Year Comparison"
      items:
        - "2022":
            title: "2022"
            points:
              - "Revenue: $38M"
              - "Users: 95K"
              - "Markets: 12"
              - "Products: 3"
          "2023":
            title: "2023"
            points:
              - "Revenue: $48M"
              - "Users: 132K" 
              - "Markets: 22"
              - "Products: 5"
            
    - type: timeline
      title: "2024 Roadmap"
      events:
        - date: "Q1 2024"
          title: "Product Launch"
          description: "Enterprise AI features"
        - date: "Q2 2024"
          title: "Market Expansion"
          description: "Launch in Japan and Korea"
        - date: "Q3 2024"
          title: "Platform 2.0"
          description: "Next-gen architecture"
        - date: "Q4 2024"
          title: "IPO Preparation"
          description: "Target $100M revenue"
            
    - type: summary
      title: "Key Takeaways"
      highlights:
        - "Record revenue of $48M (+20% YoY)"
        - "Successful expansion to 22 markets"
        - "96% customer retention rate"
        - "Strong foundation for 2024 growth"`

export function SlidesDiffDemo() {
  const [showDemo, setShowDemo] = useState(false)

  // Parse presentations
  const originalPresentation = parsePresentation(originalYaml)
  const modifiedPresentation = parsePresentation(modifiedYaml)

  return (
    <div className='space-y-6'>
      <div className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
        <h2 className='mb-4 text-xl font-semibold'>Slides Diff View Demo</h2>
        <p className='mb-6 text-gray-600'>
          This demo shows the temporal diff navigation for presentations.
          Changes are shown in a timeline that you can navigate through to see
          what changed between versions.
        </p>

        <div className='mb-6 space-y-4 text-sm'>
          <div>
            <h3 className='mb-2 font-medium'>Key Changes in This Demo:</h3>
            <ul className='ml-4 space-y-1 text-gray-600'>
              <li>• Metadata: Title updated to include "Final"</li>
              <li>
                • Slide 1: Subtitle changed from "Year-End Performance Review"
                to "Record-Breaking Performance"
              </li>
              <li>
                • Slide 2: All metrics updated with new values, added "Churn
                Rate" metric
              </li>
              <li>• New Slide 3: "Revenue Breakdown by Region" chart added</li>
              <li>• Slide 4: Revenue figures and text content updated</li>
              <li>
                • Slide 5: Year-over-year comparison data updated, added
                "Products" row
              </li>
              <li>
                • Slide 6: Complete change from summary to timeline format
              </li>
              <li>• Slide 7: New summary slide with different highlights</li>
            </ul>
          </div>

          <div>
            <h3 className='mb-2 font-medium'>Navigation Controls:</h3>
            <ul className='ml-4 space-y-1 text-gray-600'>
              <li>• Click "Show Diff" button to enable diff mode</li>
              <li>• Use timeline at bottom to navigate through changes</li>
              <li>• Use [ and ] keys to jump between changes</li>
              <li>• Press D to toggle diff view</li>
              <li>• Filter changes by type using the filter button</li>
              <li>• Play button for automatic change progression</li>
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
            <p className='mb-2 text-sm text-gray-600'>
              <strong>Tip:</strong> Click the "Show Diff" button in the
              top-right corner to enable diff mode and see the timeline.
            </p>
          </div>

          <div className='h-[600px] overflow-hidden rounded-lg border border-gray-200'>
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
