'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { INSERT_TABLE_COMMAND } from '@lexical/table'
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_LOW } from 'lexical'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'

export function TableActionsPlugin() {
  const [editor] = useLexicalComposerContext()
  const [isTableSelected, setIsTableSelected] = useState(false)

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode()
          const element = anchorNode.getTopLevelElement()
          if (element) {
            const type = element.getType()
            setIsTableSelected(type === 'table')
          }
        }
      })
    })
  }, [editor])

  // Add keyboard shortcuts for table operations
  useEffect(() => {
    return editor.registerCommand(
      INSERT_TABLE_COMMAND,
      () => {
        // Handle table insertion
        return true
      },
      COMMAND_PRIORITY_LOW,
    )
  }, [editor])

  if (!isTableSelected) {
    return null
  }

  return (
    <div className='fixed right-4 top-20 z-50 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800'>
      <div className='mb-1 text-xs text-gray-500 dark:text-gray-400'>
        Table Actions
      </div>
      <div className='flex gap-1'>
        <Button
          variant='secondary'
          size='small'
          shape='rounded'
          title='Add Row (Tab in last cell)'>
          Add Row
        </Button>
        <Button
          variant='secondary'
          size='small'
          shape='rounded'
          title='Add Column'>
          Add Column
        </Button>
      </div>
    </div>
  )
}
