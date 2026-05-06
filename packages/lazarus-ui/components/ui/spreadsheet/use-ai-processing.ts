import { useCallback, useState } from 'react'

interface AIProcessingState {
  isProcessing: boolean
  processingCells: Set<string>
  error: string | null
}

interface AIProcessingResult {
  success: boolean
  result?: string | number
  error?: string
}

export function useAIProcessing() {
  const [state, setState] = useState<AIProcessingState>({
    isProcessing: false,
    processingCells: new Set(),
    error: null,
  })

  const processAIFormula = useCallback(
    async (
      cellRef: string,
      formula: string,
      sheetData?: any,
    ): Promise<AIProcessingResult> => {
      // Add cell to processing set
      setState((prev) => ({
        ...prev,
        isProcessing: true,
        processingCells: new Set([
          ...Array.from(prev.processingCells),
          cellRef,
        ]),
        error: null,
      }))

      try {
        // Simulate AI processing delay (1-3 seconds)
        const delay = Math.random() * 2000 + 1000
        await new Promise((resolve) => setTimeout(resolve, delay))

        // Mock AI processing based on formula content
        const result = await mockAIProcessing(formula, sheetData)

        // Remove cell from processing set
        setState((prev) => {
          const newProcessingCells = new Set(prev.processingCells)
          newProcessingCells.delete(cellRef)
          return {
            ...prev,
            isProcessing: newProcessingCells.size > 0,
            processingCells: newProcessingCells,
          }
        })

        return { success: true, result: result.value }
      } catch (error) {
        // Remove cell from processing set and set error
        setState((prev) => {
          const newProcessingCells = new Set(prev.processingCells)
          newProcessingCells.delete(cellRef)
          return {
            ...prev,
            isProcessing: newProcessingCells.size > 0,
            processingCells: newProcessingCells,
            error:
              error instanceof Error ? error.message : 'AI processing failed',
          }
        })

        return {
          success: false,
          error:
            error instanceof Error ? error.message : 'AI processing failed',
        }
      }
    },
    [],
  )

  const isCellProcessing = useCallback(
    (cellRef: string): boolean => {
      return state.processingCells.has(cellRef)
    },
    [state.processingCells],
  )

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    processAIFormula,
    isCellProcessing,
    clearError,
  }
}

// Mock AI processing function
async function mockAIProcessing(
  formula: string,
  sheetData?: any,
): Promise<{ value: string | number }> {
  const prompt = formula
    .replace(/^=AI:\s*/i, '')
    .trim()
    .toLowerCase()

  // Simple pattern matching for common formulas
  if (prompt.includes('sum') || prompt.includes('total')) {
    // Mock sum calculation
    const randomSum = Math.floor(Math.random() * 10000) + 1000
    return { value: randomSum }
  }

  if (prompt.includes('average') || prompt.includes('mean')) {
    // Mock average calculation
    const randomAvg = Math.floor(Math.random() * 1000) + 100
    return { value: randomAvg }
  }

  if (prompt.includes('count')) {
    // Mock count
    const randomCount = Math.floor(Math.random() * 50) + 1
    return { value: randomCount }
  }

  if (prompt.includes('percentage') || prompt.includes('%')) {
    // Mock percentage
    const randomPercent = (Math.random() * 100).toFixed(2)
    return { value: `${randomPercent}%` }
  }

  if (prompt.includes('growth') || prompt.includes('trend')) {
    // Mock growth calculation
    const randomGrowth = ((Math.random() - 0.5) * 20).toFixed(2)
    return { value: `${randomGrowth}%` }
  }

  if (
    prompt.includes('max') ||
    prompt.includes('highest') ||
    prompt.includes('maximum')
  ) {
    // Mock max value
    const randomMax = Math.floor(Math.random() * 5000) + 1000
    return { value: randomMax }
  }

  if (
    prompt.includes('min') ||
    prompt.includes('lowest') ||
    prompt.includes('minimum')
  ) {
    // Mock min value
    const randomMin = Math.floor(Math.random() * 100) + 1
    return { value: randomMin }
  }

  if (prompt.includes('predict') || prompt.includes('forecast')) {
    // Mock prediction
    const randomPrediction = Math.floor(Math.random() * 8000) + 2000
    return { value: randomPrediction }
  }

  if (prompt.includes('multiply') || prompt.includes('times')) {
    // Mock multiplication
    const randomProduct = Math.floor(Math.random() * 1000) + 100
    return { value: randomProduct }
  }

  if (prompt.includes('divide') || prompt.includes('divided')) {
    // Mock division
    const randomQuotient = (Math.random() * 100 + 10).toFixed(2)
    return { value: parseFloat(randomQuotient) }
  }

  if (prompt.includes('tax') || prompt.includes('fee')) {
    // Mock tax/fee calculation
    const randomTax = Math.floor(Math.random() * 500) + 50
    return { value: randomTax }
  }

  // Default response for unrecognized patterns
  const responses = [
    'Calculated',
    'Processed',
    'Analyzed',
    Math.floor(Math.random() * 1000),
    (Math.random() * 100).toFixed(2) + '%',
    'Complete',
  ]

  return { value: responses[Math.floor(Math.random() * responses.length)] }
}
