/**
 * Complete Markdown Transformers Configuration
 * Includes all built-in Lexical transformers plus additional custom transformers
 */

import {
  // Import individual format transformers
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  CHECK_LIST,
  CODE,
  ELEMENT_TRANSFORMERS,
  ElementTransformer,
  HEADING,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  LINK,
  MULTILINE_ELEMENT_TRANSFORMERS,
  ORDERED_LIST,
  QUOTE,
  STRIKETHROUGH,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
  TextMatchTransformer,
  Transformer,
  UNORDERED_LIST,
} from '@lexical/markdown'
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode,
} from '@lexical/react/LexicalHorizontalRuleNode'
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table'
import { $createTextNode, LexicalNode, TextNode } from 'lexical'

// Horizontal Rule Transformer
export const HORIZONTAL_RULE: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node: LexicalNode) => {
    return $isHorizontalRuleNode(node) ? '---' : null
  },
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: (parentNode, _1, _2, isImport) => {
    const line = $createHorizontalRuleNode()

    if (isImport || parentNode.getNextSibling() != null) {
      parentNode.replace(line)
    } else {
      parentNode.insertBefore(line)
    }

    line.selectNext()
  },
  type: 'element',
}

// Table Transformer (simplified implementation)
const TABLE_ROW_REG_EXP = /^(?:\|)(.+)(?:\|)\s?$/
const TABLE_ROW_DIVIDER_REG_EXP = /^(\| ?:?-*:? ?)+\|\s?$/

// Helper to convert a text node with formatting back to markdown
const exportTextNodeToMarkdown = (node: LexicalNode): string => {
  if (node.getType() !== 'text') {
    return node.getTextContent()
  }

  const textNode = node as TextNode
  const text = textNode.getTextContent()
  const format = textNode.getFormat()

  if (format === 0) {
    return text
  }

  let result = text

  // Apply formatting in reverse order of parsing
  // Code (16)
  if (format & 0b10000) {
    result = `\`${result}\``
  }
  // Strikethrough (4)
  if (format & 0b100) {
    result = `~~${result}~~`
  }
  // Bold (1) + Italic (2)
  if ((format & 0b11) === 0b11) {
    result = `***${result}***`
  } else if (format & 0b1) {
    // Bold only
    result = `**${result}**`
  } else if (format & 0b10) {
    // Italic only
    result = `*${result}*`
  }

  return result
}

export const TABLE: ElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node: LexicalNode) => {
    if (!$isTableNode(node)) {
      return null
    }

    const output: string[] = []

    for (const row of node.getChildren()) {
      const rowOutput: string[] = []
      if (!$isTableRowNode(row)) {
        continue
      }

      let isHeaderRow = false
      for (const cell of row.getChildren()) {
        if ($isTableCellNode(cell)) {
          // Export cell content preserving formatting
          const cellParts: string[] = []
          for (const child of cell.getChildren()) {
            cellParts.push(exportTextNodeToMarkdown(child))
          }
          const cellText = cellParts.join('').replace(/\n/g, ' ').trim()
          rowOutput.push(cellText)

          if (cell.hasHeaderState(TableCellHeaderStates.ROW)) {
            isHeaderRow = true
          }
        }
      }

      output.push(`| ${rowOutput.join(' | ')} |`)
      if (isHeaderRow) {
        output.push(`| ${rowOutput.map(() => '---').join(' | ')} |`)
      }
    }

    return output.join('\n')
  },
  regExp: TABLE_ROW_REG_EXP,
  replace: (parentNode, _1, match) => {
    // Handle divider row (e.g., | --- | --- |)
    if (TABLE_ROW_DIVIDER_REG_EXP.test(match[0])) {
      const table = parentNode.getPreviousSibling()
      if (!table || !$isTableNode(table)) {
        return
      }

      const rows = table.getChildren()
      const lastRow = rows[rows.length - 1]
      if (!$isTableRowNode(lastRow)) {
        return
      }

      // Set the header state for all cells in the last row
      lastRow.getChildren().forEach((cell) => {
        if ($isTableCellNode(cell)) {
          cell.toggleHeaderStyle(TableCellHeaderStates.ROW)
        }
      })

      parentNode.remove()
      return
    }

    const matchCells = mapToTableCells(match[0])

    if (matchCells == null) {
      return
    }

    const table = parentNode.getPreviousSibling()
    if (!table || !$isTableNode(table)) {
      // Create new table with this row
      const newTable = $createTableNode()
      const newTableRowNode = $createTableRowNode()
      newTable.append(newTableRowNode)
      newTableRowNode.append(...matchCells)
      parentNode.replace(newTable)
      return
    }

    if ($isTableNode(table)) {
      // Append row to existing table
      const newTableRowNode = $createTableRowNode()
      newTableRowNode.append(...matchCells)
      table.append(newTableRowNode)
      parentNode.remove()
    }
  },
  type: 'element',
}

// Parse inline markdown formatting within a cell and return formatted text nodes
const parseInlineMarkdown = (text: string): TextNode[] => {
  const nodes: TextNode[] = []
  let remaining = text

  // Regex patterns for inline formatting
  // Order matters: check bold+italic first, then bold, then italic
  const patterns = [
    // Bold + Italic: ***text*** or ___text___
    { regex: /^\*\*\*(.+?)\*\*\*/, format: 0b11 }, // bold (1) + italic (2) = 3
    { regex: /^___(.+?)___/, format: 0b11 },
    // Bold: **text** or __text__
    { regex: /^\*\*(.+?)\*\*/, format: 0b1 }, // bold = 1
    { regex: /^__(.+?)__/, format: 0b1 },
    // Italic: *text* or _text_
    { regex: /^\*([^*]+?)\*/, format: 0b10 }, // italic = 2
    { regex: /^_([^_]+?)_/, format: 0b10 },
    // Strikethrough: ~~text~~
    { regex: /^~~(.+?)~~/, format: 0b100 }, // strikethrough = 4
    // Inline code: `code`
    { regex: /^`([^`]+?)`/, format: 0b10000 }, // code = 16
  ]

  while (remaining.length > 0) {
    let matched = false

    for (const { regex, format } of patterns) {
      const match = remaining.match(regex)
      if (match) {
        const textNode = $createTextNode(match[1])
        textNode.setFormat(format)
        nodes.push(textNode)
        remaining = remaining.slice(match[0].length)
        matched = true
        break
      }
    }

    if (!matched) {
      // Find the next formatting marker or end of string
      const nextMarker = remaining.search(/[*_~`]/)
      if (nextMarker === -1 || nextMarker === 0) {
        // No marker found or marker at start but didn't match patterns
        // Take one character and continue
        if (remaining.length > 0) {
          const char = remaining[0]
          // Try to batch plain text together
          let plainEnd = 1
          while (
            plainEnd < remaining.length &&
            !/[*_~`]/.test(remaining[plainEnd])
          ) {
            plainEnd++
          }
          const plainText = remaining.slice(0, plainEnd)
          if (nodes.length > 0 && nodes[nodes.length - 1].getFormat() === 0) {
            // Append to existing plain text node
            const lastNode = nodes[nodes.length - 1]
            const newNode = $createTextNode(
              lastNode.getTextContent() + plainText,
            )
            nodes[nodes.length - 1] = newNode
          } else {
            nodes.push($createTextNode(plainText))
          }
          remaining = remaining.slice(plainEnd)
        }
      } else {
        // Take text up to the marker
        const plainText = remaining.slice(0, nextMarker)
        if (nodes.length > 0 && nodes[nodes.length - 1].getFormat() === 0) {
          // Append to existing plain text node
          const lastNode = nodes[nodes.length - 1]
          const newNode = $createTextNode(lastNode.getTextContent() + plainText)
          nodes[nodes.length - 1] = newNode
        } else {
          nodes.push($createTextNode(plainText))
        }
        remaining = remaining.slice(nextMarker)
      }
    }
  }

  // If no nodes were created, return a single empty text node
  if (nodes.length === 0) {
    nodes.push($createTextNode(''))
  }

  return nodes
}

// Helper function for table cells
const mapToTableCells = (textContent: string): Array<TableCellNode> | null => {
  const match = textContent.match(/^\|(.*)\|$/m)
  if (!match || !match[1]) {
    return null
  }
  const cells = match[1].split('|')
  return cells.map((cellContent) => {
    const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS)
    const trimmedContent = cellContent.trim()
    const textNodes = parseInlineMarkdown(trimmedContent)
    cell.append(...textNodes)
    return cell
  })
}

// Image Transformer
export const IMAGE: TextMatchTransformer = {
  dependencies: [],
  export: () => null, // For now, we'll just handle import
  importRegExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))/,
  regExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))$/,
  replace: (textNode, match) => {
    const [, altText, src] = match
    // For now, just replace with a text representation
    // In a full implementation, you'd create an ImageNode
    textNode.replace($createTextNode(`![${altText}](${src})`))
  },
  trigger: ')',
  type: 'text-match',
}

// All available transformers combined
export const COMPLETE_TRANSFORMERS: Array<Transformer> = [
  // Built-in element transformers
  HEADING,
  QUOTE,
  CODE,
  UNORDERED_LIST,
  ORDERED_LIST,
  CHECK_LIST,

  // Custom element transformers
  HORIZONTAL_RULE,
  TABLE,

  // Built-in text format transformers
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
  INLINE_CODE,

  // Built-in text match transformers
  LINK,

  // Custom text match transformers
  IMAGE,
]

// Export individual transformer bundles for granular control
export {
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  CHECK_LIST,
  CODE,
  // Built-in bundles
  ELEMENT_TRANSFORMERS,
  // Individual transformers for custom configurations
  HEADING,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  LINK,
  MULTILINE_ELEMENT_TRANSFORMERS,
  ORDERED_LIST,
  QUOTE,
  STRIKETHROUGH,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
  UNORDERED_LIST,
}
