'use client'

import {
  RiAlignCenter,
  RiAlignLeft,
  RiAlignRight,
  RiArrowDownSLine,
  RiBold,
  RiCheckLine,
  RiEraserLine,
  RiFontSize,
  RiItalic,
  RiLayoutColumnLine,
  RiLayoutRowLine,
  RiPaletteLine,
  RiStackLine,
  RiTableLine,
  RiTextWrap,
  RiUnderline,
} from '@remixicon/react'
import { useRef, useState } from 'react'

import { CellFormat } from './types'

export type TextWrapMode = 'nowrap' | 'wrap' | 'clip' | 'auto'
export type TextAlignment = 'left' | 'center' | 'right'
export type SelectionType = 'cell' | 'range' | 'column' | 'row' | 'mixed'

interface ColorTheme {
  name: string
  colors: string[]
}

const COLOR_THEMES: ColorTheme[] = [
  {
    name: 'Pastel',
    colors: ['#FFE5E5', '#E5F3FF', '#E5FFE5', '#FFF9E5', '#F3E5FF', '#FFE5F5'],
  },
  {
    name: 'Ocean',
    colors: ['#E3F2FD', '#B3E5FC', '#81D4FA', '#4FC3F7', '#29B6F6', '#03A9F4'],
  },
  {
    name: 'Sunset',
    colors: ['#FFF3E0', '#FFE0B2', '#FFCC80', '#FFB74D', '#FFA726', '#FF9800'],
  },
  {
    name: 'Forest',
    colors: ['#E8F5E9', '#C8E6C9', '#A5D6A7', '#81C784', '#66BB6A', '#4CAF50'],
  },
]

const FONT_COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Gray', value: '#6B7280' },
  { name: 'White', value: '#FFFFFF' },
]

interface FormattingRibbonProps {
  isVisible: boolean
  selectionType: SelectionType
  selectedCount: number
  currentFormat?: CellFormat
  onFormatChange: (format: CellFormat) => void
  onClose: () => void
}

export function FormattingRibbon({
  isVisible,
  selectionType,
  selectedCount,
  currentFormat = {},
  onFormatChange,
  onClose,
}: FormattingRibbonProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showTextColorPicker, setShowTextColorPicker] = useState(false)
  const ribbonRef = useRef<HTMLDivElement>(null)

  if (!isVisible) return null

  const handleTextWrapChange = (mode: TextWrapMode) => {
    onFormatChange({ wrapMode: mode })
  }

  const handleAlignmentChange = (alignment: TextAlignment) => {
    onFormatChange({ alignment })
  }

  const handleColorSelect = (color: string) => {
    onFormatChange({ backgroundColor: color })
    setShowColorPicker(false)
  }

  const handleTextColorSelect = (color: string) => {
    onFormatChange({ textColor: color })
    setShowTextColorPicker(false)
  }

  const handleClearFormat = () => {
    // Clear all formatting
    onFormatChange({
      bold: false,
      italic: false,
      underline: false,
      alignment: 'left',
      wrapMode: 'nowrap',
      backgroundColor: '',
      textColor: '',
      clearFormat: true, // Special flag for the parent to handle
    })
  }

  const getSelectionIcon = () => {
    switch (selectionType) {
      case 'column':
        return <RiLayoutColumnLine className='h-3 w-3' />
      case 'row':
        return <RiLayoutRowLine className='h-3 w-3' />
      case 'range':
        return <RiTableLine className='h-3 w-3' />
      default:
        return <RiStackLine className='h-3 w-3' />
    }
  }

  return (
    <div
      ref={ribbonRef}
      className={`relative z-50 origin-top border-b border-gray-200 bg-white transition-all duration-300 ease-out ${isVisible ? 'h-11 scale-y-100 opacity-100' : 'h-0 scale-y-0 opacity-0'} `}
      style={{
        overflow: isVisible ? 'visible' : 'hidden',
        transformOrigin: 'top center',
      }}>
      {/* Single Row with Cell Count, Formatting Options, and Clear Button - matching header height */}
      <div className='flex h-11 items-center justify-between px-4'>
        {/* Cell Count on Left */}
        <div className='flex items-center space-x-2 text-sm font-medium text-gray-700'>
          {getSelectionIcon()}
          <span>
            {selectionType === 'column' &&
              `${selectedCount} column${selectedCount > 1 ? 's' : ''}`}
            {selectionType === 'row' &&
              `${selectedCount} row${selectedCount > 1 ? 's' : ''}`}
            {selectionType === 'range' && `${selectedCount} cells`}
            {selectionType === 'cell' && '1 cell'}
          </span>
        </div>

        {/* Formatting Options on Right - all aligned right */}
        <div className='flex items-center space-x-2'>
          {/* Text Formatting */}
          <div className='flex items-center space-x-1 border-r border-gray-200 pr-2'>
            <button
              onClick={() => onFormatChange({ bold: !currentFormat.bold })}
              className={`rounded p-1.5 transition-colors ${
                currentFormat.bold
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title='Bold'>
              <RiBold className='h-4 w-4' />
            </button>
            <button
              onClick={() => onFormatChange({ italic: !currentFormat.italic })}
              className={`rounded p-1.5 transition-colors ${
                currentFormat.italic
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title='Italic'>
              <RiItalic className='h-4 w-4' />
            </button>
            <button
              onClick={() =>
                onFormatChange({ underline: !currentFormat.underline })
              }
              className={`rounded p-1.5 transition-colors ${
                currentFormat.underline
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title='Underline'>
              <RiUnderline className='h-4 w-4' />
            </button>
          </div>

          {/* Font Color */}
          <div className='relative border-r border-gray-200 pr-2'>
            <button
              onClick={() => setShowTextColorPicker(!showTextColorPicker)}
              className='flex items-center gap-1 rounded p-1.5 transition-colors hover:bg-gray-100'
              title='Text Color'>
              <RiFontSize className='h-4 w-4' />
              <div
                className='h-1 w-4 rounded'
                style={{
                  backgroundColor: currentFormat.textColor || '#000000',
                }}
              />
            </button>

            {showTextColorPicker && (
              <div className='absolute right-0 top-full z-[60] mt-1 rounded-md border border-gray-200 bg-white p-2 shadow-lg'>
                <div className='flex gap-1'>
                  {FONT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => handleTextColorSelect(color.value)}
                      className='group relative'
                      title={color.name}>
                      <div
                        className='h-6 w-6 rounded border-2 border-gray-300 transition-colors hover:border-gray-400'
                        style={{
                          backgroundColor:
                            color.value === '#FFFFFF' ? '#f3f4f6' : color.value,
                        }}>
                        {color.value === '#FFFFFF' && (
                          <span className='absolute inset-0 flex items-center justify-center text-xs text-gray-400'>
                            W
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Text Alignment */}
          <div className='flex items-center gap-1 border-r border-gray-200 pr-2'>
            <button
              onClick={() => handleAlignmentChange('left')}
              className={`rounded p-1.5 transition-colors hover:bg-gray-100 ${
                currentFormat.alignment === 'left' ? 'bg-gray-200' : ''
              }`}
              title='Align Left'>
              <RiAlignLeft className='h-4 w-4' />
            </button>
            <button
              onClick={() => handleAlignmentChange('center')}
              className={`rounded p-1.5 transition-colors hover:bg-gray-100 ${
                currentFormat.alignment === 'center' ? 'bg-gray-200' : ''
              }`}
              title='Align Center'>
              <RiAlignCenter className='h-4 w-4' />
            </button>
            <button
              onClick={() => handleAlignmentChange('right')}
              className={`rounded p-1.5 transition-colors hover:bg-gray-100 ${
                currentFormat.alignment === 'right' ? 'bg-gray-200' : ''
              }`}
              title='Align Right'>
              <RiAlignRight className='h-4 w-4' />
            </button>
          </div>

          {/* Text Wrapping */}
          <div className='group relative border-r border-gray-200 pr-2'>
            <button
              className='flex items-center gap-1 rounded p-1.5 transition-colors hover:bg-gray-100'
              title='Text Wrap'>
              <RiTextWrap className='h-4 w-4' />
              <RiArrowDownSLine className='h-2.5 w-2.5' />
            </button>

            <div className='invisible absolute right-0 top-full z-[60] mt-1 w-36 rounded-md border border-gray-200 bg-white opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100'>
              <div className='p-0.5'>
                <button
                  onClick={() => handleTextWrapChange('nowrap')}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-gray-100 ${
                    currentFormat.wrapMode === 'nowrap' ? 'bg-gray-100' : ''
                  }`}>
                  <span>No Wrap</span>
                  {currentFormat.wrapMode === 'nowrap' && (
                    <RiCheckLine className='ml-auto h-3 w-3' />
                  )}
                </button>
                <button
                  onClick={() => handleTextWrapChange('wrap')}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-gray-100 ${
                    currentFormat.wrapMode === 'wrap' ? 'bg-gray-100' : ''
                  }`}>
                  <span>Wrap Text</span>
                  {currentFormat.wrapMode === 'wrap' && (
                    <RiCheckLine className='ml-auto h-3 w-3' />
                  )}
                </button>
                <button
                  onClick={() => handleTextWrapChange('clip')}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-gray-100 ${
                    currentFormat.wrapMode === 'clip' ? 'bg-gray-100' : ''
                  }`}>
                  <span>Clip Text</span>
                  {currentFormat.wrapMode === 'clip' && (
                    <RiCheckLine className='ml-auto h-3 w-3' />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Background Color */}
          <div className='relative pr-2'>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className='flex items-center gap-1 rounded p-1.5 transition-colors hover:bg-gray-100'
              title='Fill Color'>
              <div
                className='h-4 w-4 rounded border border-gray-300'
                style={{
                  backgroundColor: currentFormat.backgroundColor || '#ffffff',
                }}
              />
              <RiPaletteLine className='h-4 w-4' />
            </button>

            {showColorPicker && (
              <div className='absolute right-0 top-full z-[60] mt-1 w-52 rounded-md border border-gray-200 bg-white p-2 shadow-lg'>
                {/* Color Themes */}
                <div className='space-y-1.5'>
                  {COLOR_THEMES.map((theme, index) => (
                    <div key={theme.name}>
                      <div className='mb-1 flex items-center justify-between'>
                        <span className='text-xs text-gray-600'>
                          {theme.name}
                        </span>
                      </div>
                      <div className='flex gap-0.5'>
                        {theme.colors.map((color) => (
                          <button
                            key={color}
                            onClick={() => handleColorSelect(color)}
                            className='h-6 w-6 rounded border-2 border-white shadow-sm transition-transform hover:scale-110'
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Clear Color */}
                <button
                  onClick={() => handleColorSelect('')}
                  className='mt-2 w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-50'>
                  Clear Color
                </button>
              </div>
            )}
          </div>

          {/* Clear Button */}
          <button
            onClick={() => {
              handleClearFormat()
              onClose()
            }}
            className='ml-2 rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600'
            title='Clear formatting'>
            <RiEraserLine className='h-4 w-4' />
          </button>
        </div>
      </div>
    </div>
  )
}
