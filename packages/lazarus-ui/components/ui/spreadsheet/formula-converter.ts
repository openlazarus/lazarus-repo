/**
 * Formula Converter Utility
 * Converts between Excel formulas and AI formulas
 */

export interface FormulaConversion {
  converted: boolean
  formula: string
  note?: string
}

/**
 * Attempts to convert an Excel formula to an AI formula
 */
export function excelToAIFormula(excelFormula: string): FormulaConversion {
  // Remove leading = if present
  const formula = excelFormula.startsWith('=')
    ? excelFormula.substring(1)
    : excelFormula

  // Try to convert common Excel formulas to AI prompts
  const upperFormula = formula.toUpperCase()

  // SUM formulas
  if (upperFormula.startsWith('SUM(')) {
    const range = extractRange(formula, 'SUM')
    if (range) {
      return {
        converted: true,
        formula: `=AI: sum ${range}`,
      }
    }
  }

  // AVERAGE formulas
  if (upperFormula.startsWith('AVERAGE(')) {
    const range = extractRange(formula, 'AVERAGE')
    if (range) {
      return {
        converted: true,
        formula: `=AI: average ${range}`,
      }
    }
  }

  // COUNT formulas
  if (upperFormula.startsWith('COUNT(')) {
    const range = extractRange(formula, 'COUNT')
    if (range) {
      return {
        converted: true,
        formula: `=AI: count ${range}`,
      }
    }
  }

  // MAX formulas
  if (upperFormula.startsWith('MAX(')) {
    const range = extractRange(formula, 'MAX')
    if (range) {
      return {
        converted: true,
        formula: `=AI: maximum of ${range}`,
      }
    }
  }

  // MIN formulas
  if (upperFormula.startsWith('MIN(')) {
    const range = extractRange(formula, 'MIN')
    if (range) {
      return {
        converted: true,
        formula: `=AI: minimum of ${range}`,
      }
    }
  }

  // Simple arithmetic operations
  const arithmeticMatch = formula.match(
    /^([A-Z]+\d+)\s*([+\-*/])\s*([A-Z]+\d+)$/,
  )
  if (arithmeticMatch) {
    const [, left, operator, right] = arithmeticMatch
    const operations: Record<string, string> = {
      '+': 'add',
      '-': 'subtract',
      '*': 'multiply',
      '/': 'divide',
    }
    const operation = operations[operator]
    if (operation) {
      return {
        converted: true,
        formula: `=AI: ${operation} ${left} and ${right}`,
      }
    }
  }

  // For complex formulas, keep as-is but mark as needing review
  return {
    converted: false,
    formula: `=${formula}`,
    note: 'Complex formula - may need manual conversion',
  }
}

/**
 * Attempts to convert an AI formula to an Excel formula
 */
export function aiToExcelFormula(aiFormula: string): FormulaConversion {
  // Remove =AI: prefix
  const prompt = aiFormula
    .replace(/^=AI:\s*/i, '')
    .trim()
    .toLowerCase()

  // Try to convert common AI prompts to Excel formulas
  if (prompt.includes('sum')) {
    const range = extractAIRange(prompt)
    if (range) {
      return {
        converted: true,
        formula: `=SUM(${range})`,
      }
    }
  }

  if (prompt.includes('average') || prompt.includes('mean')) {
    const range = extractAIRange(prompt)
    if (range) {
      return {
        converted: true,
        formula: `=AVERAGE(${range})`,
      }
    }
  }

  if (prompt.includes('count')) {
    const range = extractAIRange(prompt)
    if (range) {
      return {
        converted: true,
        formula: `=COUNT(${range})`,
      }
    }
  }

  if (prompt.includes('maximum') || prompt.includes('max')) {
    const range = extractAIRange(prompt)
    if (range) {
      return {
        converted: true,
        formula: `=MAX(${range})`,
      }
    }
  }

  if (prompt.includes('minimum') || prompt.includes('min')) {
    const range = extractAIRange(prompt)
    if (range) {
      return {
        converted: true,
        formula: `=MIN(${range})`,
      }
    }
  }

  // Simple arithmetic
  const multiplyMatch = prompt.match(
    /(?:multiply|times)\s+([a-z]+\d+)\s+(?:and|by)\s+([a-z]+\d+)/,
  )
  if (multiplyMatch) {
    return {
      converted: true,
      formula: `=${multiplyMatch[1].toUpperCase()}*${multiplyMatch[2].toUpperCase()}`,
    }
  }

  const divideMatch = prompt.match(
    /(?:divide|divided)\s+([a-z]+\d+)\s+(?:by)\s+([a-z]+\d+)/,
  )
  if (divideMatch) {
    return {
      converted: true,
      formula: `=${divideMatch[1].toUpperCase()}/${divideMatch[2].toUpperCase()}`,
    }
  }

  const addMatch = prompt.match(
    /(?:add|plus)\s+([a-z]+\d+)\s+(?:and|to)\s+([a-z]+\d+)/,
  )
  if (addMatch) {
    return {
      converted: true,
      formula: `=${addMatch[1].toUpperCase()}+${addMatch[2].toUpperCase()}`,
    }
  }

  const subtractMatch = prompt.match(
    /(?:subtract|minus)\s+([a-z]+\d+)\s+(?:from|and)\s+([a-z]+\d+)/,
  )
  if (subtractMatch) {
    return {
      converted: true,
      formula: `=${subtractMatch[2].toUpperCase()}-${subtractMatch[1].toUpperCase()}`,
    }
  }

  // Can't convert - return as comment
  return {
    converted: false,
    formula: aiFormula,
    note: 'AI formula cannot be converted to Excel',
  }
}

/**
 * Extracts range from Excel formula
 */
function extractRange(formula: string, functionName: string): string | null {
  const pattern = new RegExp(`${functionName}\\(([^)]+)\\)`, 'i')
  const match = formula.match(pattern)
  return match ? match[1].trim() : null
}

/**
 * Extracts cell range from AI prompt
 */
function extractAIRange(prompt: string): string | null {
  // Try to find cell references like "B1 to D1" or "B1:D1"
  const rangeMatch = prompt.match(
    /([a-z]+\d+)\s+(?:to|through|-|:)\s+([a-z]+\d+)/,
  )
  if (rangeMatch) {
    return `${rangeMatch[1].toUpperCase()}:${rangeMatch[2].toUpperCase()}`
  }

  // Try to find single cell references
  const cellMatch = prompt.match(/([a-z]+\d+)/)
  if (cellMatch) {
    return cellMatch[1].toUpperCase()
  }

  return null
}

/**
 * Determines if a formula is an AI formula
 */
export function isAIFormula(formula: string): boolean {
  return formula.trim().toUpperCase().startsWith('=AI:')
}

/**
 * Determines if a formula is an Excel formula
 */
export function isExcelFormula(formula: string): boolean {
  return formula.trim().startsWith('=') && !isAIFormula(formula)
}
