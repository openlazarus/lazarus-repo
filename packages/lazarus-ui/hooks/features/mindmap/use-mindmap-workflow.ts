import { useCallback, useEffect, useState } from 'react'

import { parseFlowDocument } from '@/components/ui/flow'
import { useItems } from '@/hooks/core/use-items'
import { useTabs } from '@/hooks/core/use-tabs'
import { useIsMobile } from '@/hooks/ui/layout/use-media-query'
import { File } from '@/model/file'

export interface MindmapWorkflowState {
  isCreating: boolean
  isEditing: boolean
  currentMindmap: File | null
  originalContent: string
  editedContent: string
  showMarkdownEditor: boolean
}

export interface UseMindmapWorkflowReturn {
  state: MindmapWorkflowState
  createNewMindmap: (topic: string, content?: string) => Promise<File | null>
  openMindmapInTab: (mindmap: File) => Promise<void>
  updateMindmapContent: (content: string) => Promise<void>
  simulateEdit: (editType: string, customRequest?: string) => Promise<void>
  toggleMarkdownEditor: () => void
  autoLayout: () => void
  resetWorkflow: () => void
}

// Global state for mindmap workflow to share between chat and editor
let globalWorkflowState: MindmapWorkflowState = {
  isCreating: false,
  isEditing: false,
  currentMindmap: null,
  originalContent: '',
  editedContent: '',
  showMarkdownEditor: false,
}

// Subscribers for state changes
const subscribers = new Set<() => void>()

// Function to update global state and notify subscribers
function updateGlobalWorkflowState(newState: Partial<MindmapWorkflowState>) {
  globalWorkflowState = { ...globalWorkflowState, ...newState }
  subscribers.forEach((callback) => callback())
}

// Function to subscribe to state changes
function subscribeToWorkflowState(callback: () => void) {
  subscribers.add(callback)
  return () => {
    subscribers.delete(callback)
  }
}

// Function to get current global state
export function getGlobalMindmapWorkflowState(): MindmapWorkflowState {
  return globalWorkflowState
}

/**
 * Generate a Flow YAML mindmap structure based on the topic
 */
export function generateMindmapContent(topic: string): string {
  // Generate Flow YAML format for university essay structure
  return `flow:
  meta:
    title: "${topic}"
    author: "AI Assistant"
    version: "1.0"
    tags: ["mindmap", "essay", "university"]
    
  canvas:
    layout: auto
    theme: light
    spacing: comfortable
    
  nodes:
    - id: central
      type: concept
      title: "${topic}"
      content: |
        University Essay Structure
        Main topic and framework
      position: center
      style: primary
      
    - id: introduction
      type: action
      title: "I. Introduction"
      content: |
        • Hook & Opening Statement
        • Background Context  
        • Clear Thesis Statement
        • Essay Roadmap
      position:
        relative: central
        direction: north
        distance: medium
      style: secondary
      
    - id: literature
      type: concept
      title: "II. Literature Review"
      content: |
        • Theoretical Framework
        • Key Research & Authors
        • Research Gap Identification
      position:
        relative: central
        direction: northwest
        distance: medium
      style: secondary
      
    - id: methodology
      type: action
      title: "III. Methodology"
      content: |
        • Research Design
        • Data Collection Methods
        • Sample & Scope
      position:
        relative: central
        direction: west
        distance: medium
      style: secondary
      
    - id: analysis
      type: concept
      title: "IV. Analysis & Findings"
      content: |
        • Key Research Findings
        • Critical Discussion
        • Evidence & Examples
        • Counter-arguments
      position:
        relative: central
        direction: southwest
        distance: medium
      style: warning
      
    - id: conclusion
      type: action
      title: "V. Conclusion"
      content: |
        • Summary of Findings
        • Implications & Significance
        • Future Research Directions
      position:
        relative: central
        direction: south
        distance: medium
      style: success
      
    - id: references
      type: note
      title: "VI. References"
      content: |
        • Academic Sources
        • Proper Citations
        • Bibliography
      position:
        relative: central
        direction: southeast
        distance: medium
      style: subtle
      
  connections:
    - from: central
      to: [introduction, literature, methodology, analysis, conclusion, references]
      type: hierarchy
      
    - from: introduction
      to: literature
      type: flow
      label: "leads to"
      
    - from: literature
      to: methodology
      type: flow
      label: "informs"
      
    - from: methodology
      to: analysis
      type: flow
      label: "enables"
      
    - from: analysis
      to: conclusion
      type: flow
      label: "supports"
      
    - from: conclusion
      to: references
      type: dependency
      label: "cites"
      style: dashed
      
  containers:
    - id: main-structure
      title: "Essay Framework"
      contains: [introduction, literature, methodology, analysis, conclusion]
      style: subtle
      
  annotations:
    - target: analysis
      content: |
        This is typically the largest section
        containing your main arguments
      author: "AI Assistant"`
}

/**
 * Hook for orchestrating mindmap creation and editing workflow
 * Coordinates between mindmap creation, tab management, and editing operations
 * Uses global state to share between chat and editor instances
 */
export function useMindmapWorkflow(): UseMindmapWorkflowReturn {
  const { createItem } = useItems()
  const { openFileTab } = useTabs()
  const isMobile = useIsMobile()

  const [state, setState] = useState<MindmapWorkflowState>(globalWorkflowState)

  // Subscribe to global state changes
  useEffect(() => {
    const unsubscribe = subscribeToWorkflowState(() => {
      setState(globalWorkflowState)
    })
    return unsubscribe
  }, [])

  // Create a new mindmap with the given content
  const createNewMindmap = useCallback(
    async (topic: string, content?: string): Promise<File | null> => {
      updateGlobalWorkflowState({ isCreating: true })

      try {
        const mindmapContent = content || generateMindmapContent(topic)

        // Debug logging
        console.log('Creating mindmap with topic:', topic)
        console.log('Generated content length:', mindmapContent.length)
        console.log(
          'Generated content preview:',
          mindmapContent.substring(0, 200) + '...',
        )

        // Use createItem with correct signature - it will handle missing properties
        const savedMindmap = await createItem<File>('file', {
          name: topic,
          fileType: 'mindmap',
          content: mindmapContent,
          path: '/mindmaps',
          preview: `Mind map for ${topic}`,
          metadata: {
            createdByWorkflow: true,
            originalTopic: topic,
          },
        })

        updateGlobalWorkflowState({
          isCreating: false,
          currentMindmap: savedMindmap,
          originalContent: mindmapContent,
          editedContent: mindmapContent,
        })

        console.log('Mindmap created successfully:', savedMindmap.name)
        return savedMindmap
      } catch (error) {
        console.error('Error creating mindmap:', error)
        updateGlobalWorkflowState({ isCreating: false })
        return null
      }
    },
    [createItem],
  )

  // Open mindmap in tab (only on desktop)
  const openMindmapInTab = useCallback(
    async (mindmap: File) => {
      if (!isMobile && mindmap.id) {
        try {
          await openFileTab(mindmap.id, {
            name: mindmap.name || 'Untitled',
            fileType: mindmap.fileType || 'mindmap',
          })
        } catch (error) {
          console.error('Error opening mindmap in tab:', error)
        }
      }
    },
    [openFileTab, isMobile],
  )

  // Update mindmap content (for markdown editor)
  const updateMindmapContent = useCallback(async (content: string) => {
    updateGlobalWorkflowState({
      editedContent: content,
    })
  }, [])

  // Simulate mindmap editing with different types
  const simulateEdit = useCallback(
    async (editType: string, customRequest?: string) => {
      if (!globalWorkflowState.currentMindmap) return

      updateGlobalWorkflowState({ isEditing: true })

      try {
        let editedContent = globalWorkflowState.originalContent

        switch (editType) {
          case 'add-branch':
            // Add a new node to the Flow YAML
            editedContent = globalWorkflowState.originalContent.replace(
              '       style: subtle',
              `       style: subtle
       
     - id: appendix
       type: note
       title: "VII. Appendix"
       content: |
         • Supporting Materials
         • Additional Data
         • Supplementary Information
       position:
         relative: central
         direction: east
         distance: medium
       style: subtle`,
            )
            // Also add connection
            editedContent = editedContent.replace(
              'to: [introduction, literature, methodology, analysis, conclusion, references]',
              'to: [introduction, literature, methodology, analysis, conclusion, references, appendix]',
            )
            break

          case 'modify-structure':
            // Modify the structure based on custom request
            if (customRequest) {
              if (customRequest.toLowerCase().includes('remove')) {
                // Remove references section
                editedContent = globalWorkflowState.originalContent
                  .replace(/- id: references[\s\S]*?style: subtle\n/, '')
                  .replace(', references', '')
                  .replace('references, ', '')
              }
            }
            break

          case 'change-style':
            // Update visual styling
            editedContent = globalWorkflowState.originalContent.replace(
              'style: primary',
              'style: success',
            )
            break

          case 'add-annotation':
            // Add a new annotation
            editedContent = globalWorkflowState.originalContent.replace(
              'author: "AI Assistant"',
              `author: "AI Assistant"
       
     - target: methodology
       content: |
         Consider mixed-methods approach
         for comprehensive analysis
       author: "AI Assistant"`,
            )
            break

          default:
            // Custom edit based on request
            if (customRequest) {
              // Add a custom annotation based on the request
              editedContent = globalWorkflowState.originalContent.replace(
                'author: "AI Assistant"',
                `author: "AI Assistant"
         
     - target: central
       content: |
         Custom edit: ${customRequest}
       author: "User Request"`,
              )
            }
        }

        // Simulate processing delay
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Validate the edited content by trying to parse it
        try {
          parseFlowDocument(editedContent)
          updateGlobalWorkflowState({
            isEditing: false,
            editedContent,
          })
        } catch (parseError) {
          console.error('Generated invalid Flow YAML:', parseError)
          // Fall back to original content if edit produced invalid YAML
          updateGlobalWorkflowState({
            isEditing: false,
            editedContent: globalWorkflowState.originalContent,
          })
        }
      } catch (error) {
        console.error('Error simulating mindmap edit:', error)
        updateGlobalWorkflowState({ isEditing: false })
      }
    },
    [],
  )

  // Toggle markdown editor visibility
  const toggleMarkdownEditor = useCallback(() => {
    updateGlobalWorkflowState({
      showMarkdownEditor: !globalWorkflowState.showMarkdownEditor,
    })
  }, [])

  // Auto-layout the mindmap
  const autoLayout = useCallback(() => {
    // This would trigger a re-layout of the mindmap
    // For now, just log it
    console.log('Auto-layout triggered for mindmap')
  }, [])

  // Reset the workflow state
  const resetWorkflow = useCallback(() => {
    updateGlobalWorkflowState({
      isCreating: false,
      isEditing: false,
      currentMindmap: null,
      originalContent: '',
      editedContent: '',
      showMarkdownEditor: false,
    })
  }, [])

  return {
    state,
    createNewMindmap,
    openMindmapInTab,
    updateMindmapContent,
    simulateEdit,
    toggleMarkdownEditor,
    autoLayout,
    resetWorkflow,
  }
}
