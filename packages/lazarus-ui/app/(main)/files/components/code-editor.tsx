import { cn } from '@/lib/utils'

interface CodeEditorProps {
  content: string
  onChange: (content: string) => void
  language?: string
  className?: string
  placeholder?: string
}

export function CodeEditor({
  content,
  onChange,
  language = 'text',
  className,
  placeholder,
}: CodeEditorProps) {
  return (
    <div className={cn('h-full w-full', className)}>
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-full w-full resize-none border-0 bg-transparent p-4 font-mono text-sm leading-relaxed',
          'focus:outline-none focus:ring-0',
          'text-gray-900 placeholder-gray-400',
          'dark:text-gray-100 dark:placeholder-gray-500',
        )}
        spellCheck={false}
      />
    </div>
  )
}
