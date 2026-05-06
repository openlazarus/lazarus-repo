'use client'

interface SpreadsheetEditorProps {
  value: string
  onChange: (value: string) => void
  errors?: string[]
}

export function SpreadsheetEditor({
  value,
  onChange,
  errors = [],
}: SpreadsheetEditorProps) {
  return (
    <div className='flex h-full flex-col bg-[#1e1e1e]'>
      <div className='flex-1 overflow-hidden'>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className='h-full w-full resize-none bg-[#1e1e1e] p-4 font-mono text-sm text-gray-300 outline-none'
          style={{
            fontFamily: 'SF Mono, Monaco, Consolas, "Courier New", monospace',
            lineHeight: 1.6,
          }}
          spellCheck={false}
        />
      </div>
      {errors.length > 0 && (
        <div className='border-t border-red-500/20 bg-red-950 p-4'>
          <h3 className='mb-2 text-sm font-medium text-red-400'>
            Validation Errors
          </h3>
          <ul className='space-y-1 text-xs'>
            {errors.map((error, index) => (
              <li key={index} className='text-red-300'>
                • {error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
