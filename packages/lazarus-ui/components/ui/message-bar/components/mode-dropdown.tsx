'use client'

import { DropdownMenu } from '@/components/ui'
import { MessageCircleIcon } from '@/components/ui/icons/chat'
import { PlayIcon } from '@/components/ui/icons/play'
import { WorkflowIcon } from '@/components/ui/icons/workflow'

type Mode = 'agent' | 'chat' | 'background'

interface ModeDropdownProps {
  value: Mode
  onChange: (mode: Mode) => void
  size?: 'small' | 'default'
  variant?: 'mobile' | 'desktop'
  isDark?: boolean
}

// We'll need to format the label to include the icon inline
const getModeLabel = (mode: Mode): string => {
  switch (mode) {
    case 'agent':
      return 'Agent'
    case 'chat':
      return 'Ask'
    case 'background':
      return 'Background'
    default:
      return 'Agent'
  }
}

const modeOptions = [
  {
    value: 'agent',
    label: 'Agent',
    icon: <PlayIcon size={14} />,
  },
  {
    value: 'chat',
    label: 'Ask',
    icon: <MessageCircleIcon size={14} />,
  },
  {
    value: 'background',
    label: 'Background',
    icon: <WorkflowIcon size={14} />,
  },
]

export function ModeDropdown({
  value,
  onChange,
  size = 'default',
  variant = 'desktop',
  isDark = false,
}: ModeDropdownProps) {
  const dropdownSize = size === 'small' ? 'small' : 'medium'

  return (
    <DropdownMenu
      options={modeOptions}
      value={value}
      onChange={(newValue) => onChange(newValue as Mode)}
      placeholder='Select mode'
      size={dropdownSize}
      variant='surface'
      isDark={isDark}
    />
  )
}
