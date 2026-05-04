'use client'

import { useCallback, useState } from 'react'

type UseTextInputProps = {
  initialText?: string
  onTextChange?: (text: string) => void
}

export const useTextInput = ({
  initialText = '',
  onTextChange = () => {},
}: UseTextInputProps = {}) => {
  const [inputText, setInputTextInternal] = useState(initialText)

  const setInputText = useCallback(
    (text: string) => {
      setInputTextInternal(text)
      onTextChange(text)
    },
    [onTextChange],
  )

  const handleInputChange = useCallback(
    (text: string) => {
      setInputText(text)
    },
    [setInputText],
  )

  return {
    inputText,
    setInputText,
    handleInputChange,
  }
}
