import { cn } from '@/lib/utils'

/**
 * Chat-specific markdown styles for message rendering
 * Self-contained within the chat component
 */
export const chatMarkdownStyles = cn(
  // Remove prose classes - we define everything ourselves
  'max-w-none',

  // Base typography matching lexical editor
  'font-[-apple-system,BlinkMacSystemFont,"SF_Pro_Display","SF_Pro_Text",system-ui,sans-serif]',
  '[&]:text-[#1d1d1f] dark:[&]:text-[#f5f5f7]',

  // Paragraphs - compact spacing for chat
  '[&_p]:!mt-0 [&_p]:!mb-2 [&_p]:!text-[14px] [&_p]:!leading-[1.47059]',
  '[&_p]:!font-normal [&_p]:!text-[#1d1d1f] dark:[&_p]:!text-[#f5f5f7]',
  '[&_p:last-child]:!mb-0',
  // Paragraphs after other block elements need top spacing
  '[&_*+p]:!mt-2',

  // Compact Typography - ALL 14px, minimal spacing
  '[&_h1]:!text-[14px] [&_h1]:!leading-[1.3] [&_h1]:!font-bold',
  '[&_h1]:!mb-0.5 [&_h1]:!mt-0 [&_h1]:!text-[#1d1d1f] dark:[&_h1]:!text-[#f5f5f7]',
  '[&_h1]:!tracking-[0]',

  '[&_h2]:!text-[14px] [&_h2]:!leading-[1.3] [&_h2]:!font-bold',
  '[&_h2]:!mb-0.5 [&_h2]:!mt-2 [&_h2]:!text-[#1d1d1f] dark:[&_h2]:!text-[#f5f5f7]',

  '[&_h3]:!text-[14px] [&_h3]:!leading-[1.3] [&_h3]:!font-semibold',
  '[&_h3]:!mb-0.5 [&_h3]:!mt-1.5 [&_h3]:!text-[#1d1d1f] dark:[&_h3]:!text-[#f5f5f7]',

  '[&_h4]:!text-[14px] [&_h4]:!leading-[1.3] [&_h4]:!font-semibold',
  '[&_h4]:!mb-0.5 [&_h4]:!mt-1.5 [&_h4]:!text-[#1d1d1f] dark:[&_h4]:!text-[#f5f5f7]',

  '[&_h5]:!text-[14px] [&_h5]:!leading-[1.3] [&_h5]:!font-semibold',
  '[&_h5]:!mb-0.5 [&_h5]:!mt-1 [&_h5]:!text-[#424245] dark:[&_h5]:!text-[#a1a1a6]',

  '[&_h6]:!text-[14px] [&_h6]:!leading-[1.3] [&_h6]:!font-semibold',
  '[&_h6]:!mb-0.5 [&_h6]:!mt-1 [&_h6]:!text-[#424245] dark:[&_h6]:!text-[#a1a1a6]',

  // Lists - compact spacing
  '[&_ul]:!pl-0 [&_ul]:!mt-0 [&_ul]:!mb-2 [&_ul]:!list-none [&_ul]:!space-y-0',
  '[&_ol]:!pl-0 [&_ol]:!mt-0 [&_ol]:!mb-2 [&_ol]:!list-none [&_ol]:!space-y-0',
  // First child list needs no top margin
  '[&>ul:first-child]:!mt-0 [&>ol:first-child]:!mt-0',
  '[&_ul:last-child]:!mb-0 [&_ol:last-child]:!mb-0',
  // Lists after other block elements need top spacing
  '[&_*+ul]:!mt-2 [&_*+ol]:!mt-2',

  // List items - keep content on same line as number/bullet
  '[&_li]:!relative [&_li]:!pl-5 [&_li]:!my-0 [&_li]:!py-0',
  '[&_li]:!text-[14px] [&_li]:!leading-[1.47059]',
  '[&_li]:!text-[#1d1d1f] dark:[&_li]:!text-[#f5f5f7]',
  // CRITICAL: Force paragraphs inside list items to be inline to prevent line breaks
  '[&_li>p]:[display:inline!important] [&_li>p]:!my-0 [&_li>p]:!mb-0 [&_li>p]:!m-0',
  '[&_li_p]:[display:inline!important] [&_li_p]:!my-0 [&_li_p]:!mb-0 [&_li_p]:!m-0',
  '[&_li_strong]:[display:inline!important] [&_li_em]:[display:inline!important] [&_li_a]:[display:inline!important]',

  // Bullet points with Lazarus blue - inline positioning
  '[&_ul>li]:before:content-["•"] [&_ul>li]:before:absolute',
  '[&_ul>li]:before:left-0 [&_ul>li]:before:text-[hsl(var(--lazarus-blue))]',
  '[&_ul>li]:before:font-normal [&_ul>li]:before:top-0',

  // Numbered lists with Lazarus blue - inline positioning
  '[&_ol]:counter-reset-[list-item]',
  '[&_ol>li]:before:counter-increment-[list-item]',
  '[&_ol>li]:before:content-[counter(list-item)_"."]',
  '[&_ol>li]:before:absolute [&_ol>li]:before:left-0 [&_ol>li]:before:top-0',
  '[&_ol>li]:before:text-[hsl(var(--lazarus-blue))]',
  '[&_ol>li]:before:font-normal [&_ol>li]:before:min-w-[1.25rem]',

  // Checkboxes for task lists
  '[&_li]:has(input[type="checkbox"]):!pl-6',
  '[&_li_input[type="checkbox"]]:!appearance-none [&_li_input[type="checkbox"]]:!w-4 [&_li_input[type="checkbox"]]:!h-4',
  '[&_li_input[type="checkbox"]]:!rounded [&_li_input[type="checkbox"]]:!border [&_li_input[type="checkbox"]]:!border-[hsl(var(--border))]',
  '[&_li_input[type="checkbox"]]:!mr-2',
  '[&_li_input[type="checkbox"]]:!relative [&_li_input[type="checkbox"]]:!top-[0.15em]',
  '[&_li_input[type="checkbox"]]:!bg-[hsl(var(--background))]',
  '[&_li_input[type="checkbox"]:checked]:!bg-[hsl(var(--lazarus-blue))]',
  '[&_li_input[type="checkbox"]:checked]:!border-[hsl(var(--lazarus-blue))]',
  '[&_li_input[type="checkbox"]:checked]:after:content-["✓"] [&_li_input[type="checkbox"]:checked]:after:!absolute',
  '[&_li_input[type="checkbox"]:checked]:after:!text-white [&_li_input[type="checkbox"]:checked]:after:!text-[10px]',
  '[&_li_input[type="checkbox"]:checked]:after:!left-[3px] [&_li_input[type="checkbox"]:checked]:after:!top-[-1px]',
  '[&_li_input[type="checkbox"]:checked]:after:!font-bold',

  // Blockquotes with compact spacing
  '[&_blockquote]:!mt-2 [&_blockquote]:!mb-2 [&_blockquote]:!px-3 [&_blockquote]:!py-1.5',
  '[&_blockquote:first-child]:!mt-0 [&_blockquote:last-child]:!mb-0',
  '[&_blockquote]:!border-l-[3px] [&_blockquote]:!border-[hsl(var(--lazarus-blue))]',
  '[&_blockquote]:!bg-[hsl(var(--lazarus-blue)/0.03)]',
  '[&_blockquote]:!rounded-r-lg [&_blockquote]:!italic',
  '[&_blockquote]:!text-[14px] [&_blockquote]:!leading-[1.47059]',
  '[&_blockquote]:!text-[#424245] dark:[&_blockquote]:!text-[#a1a1a6]',

  // Code blocks - Minimal design with wrapping
  '[&_pre]:!block [&_pre]:!bg-transparent dark:[&_pre]:!bg-transparent',
  '[&_pre]:!border [&_pre]:!border-[rgba(0,0,0,0.06)] dark:[&_pre]:!border-[rgba(255,255,255,0.08)]',
  '[&_pre]:!rounded-lg [&_pre]:!px-3 [&_pre]:!py-2',
  '[&_pre]:!mt-2 [&_pre]:!mb-2 [&_pre]:!font-["SF_Mono",Monaco,"Cascadia_Code","Roboto_Mono",Consolas,"Courier_New",monospace]',
  '[&_pre:first-child]:!mt-0 [&_pre:last-child]:!mb-0',
  '[&_pre]:!text-[13px] [&_pre]:!leading-[1.6]',
  '[&_pre]:!text-[#1d1d1f] dark:[&_pre]:!text-[#f5f5f7]',
  '[&_pre]:!overflow-x-auto [&_pre]:!whitespace-pre-wrap [&_pre]:!break-words',
  '[&_pre_code]:!block [&_pre_code]:!whitespace-pre-wrap [&_pre_code]:!break-words',

  // Inline code - compact Apple style
  '[&_:not(pre)>code]:!bg-[rgba(142,142,147,0.12)] dark:[&_:not(pre)>code]:!bg-[rgba(142,142,147,0.24)]',
  '[&_:not(pre)>code]:!border-none [&_:not(pre)>code]:!rounded',
  '[&_:not(pre)>code]:!px-1 [&_:not(pre)>code]:!py-0',
  '[&_:not(pre)>code]:!font-["SF_Mono",Monaco,"Cascadia_Code","Roboto_Mono",Consolas,"Courier_New",monospace]',
  '[&_:not(pre)>code]:!text-[0.92em] [&_:not(pre)>code]:!font-medium',
  '[&_:not(pre)>code]:!text-[#1d1d1f] dark:[&_:not(pre)>code]:!text-[#f5f5f7]',
  '[&_:not(pre)>code]:!tracking-[-0.01em]',
  '[&_code]:before:content-none [&_code]:after:content-none',

  // Links with Lazarus blue
  '[&_a]:!text-[hsl(var(--lazarus-blue))]',
  '[&_a]:!underline [&_a]:!underline-offset-2 [&_a]:!decoration-1',

  // Text formatting
  '[&_strong]:!font-semibold [&_strong]:!text-[hsl(var(--text-primary))]',
  '[&_em]:!italic',
  '[&_u]:!underline [&_u]:!decoration-[hsl(var(--lazarus-blue))] [&_u]:!decoration-1 [&_u]:!underline-offset-2',
  '[&_del]:!line-through [&_del]:!opacity-70',
  '[&_s]:!line-through [&_s]:!opacity-70',

  // Table wrapper for scrollable tables with actions
  '[&_[data-table-wrapper]]:!mt-2 [&_[data-table-wrapper]]:!mb-2',
  '[&_[data-table-wrapper]:first-child]:!mt-0 [&_[data-table-wrapper]:last-child]:!mb-0',

  // Scroll container inside wrapper - this gets the visual styling
  '[&_.table-scroll-container]:!rounded-xl',
  '[&_.table-scroll-container]:!bg-[#fafafa] dark:[&_.table-scroll-container]:!bg-[#1c1c1e]',
  '[&_.table-scroll-container]:!shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_2px_4px_rgba(0,0,0,0.08)]',
  'dark:[&_.table-scroll-container]:!shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.3)]',

  // Tables - inside scrollable wrapper
  '[&_table]:!w-full [&_table]:!min-w-max',
  '[&_table]:!border-collapse',
  '[&_table]:!bg-transparent',

  // Table headers - minimal Apple style with rounded top corners
  '[&_thead]:!bg-[#f5f5f7] dark:[&_thead]:!bg-[#2c2c2e]',
  '[&_th]:!text-left [&_th]:!font-semibold',
  '[&_th]:!text-[11px] [&_th]:!uppercase [&_th]:!tracking-[0.06em]',
  '[&_th]:!text-[#6e6e73] dark:[&_th]:!text-[#98989d]',
  '[&_th]:!px-4 [&_th]:!py-3 [&_th]:!whitespace-nowrap',
  '[&_th]:!border-b [&_th]:!border-[#e5e5e7] dark:[&_th]:!border-[#38383a]',
  // Rounded top corners for first header row
  '[&_thead_tr:first-child_th:first-child]:!rounded-tl-xl',
  '[&_thead_tr:first-child_th:last-child]:!rounded-tr-xl',

  // Table body - clean rows
  '[&_tbody_tr]:!transition-colors',
  '[&_tbody_tr:hover]:!bg-[#f0f0f2] dark:[&_tbody_tr:hover]:!bg-[#2c2c2e]',

  // Table cells - nowrap to enable horizontal scrolling for wide tables
  '[&_td]:!px-4 [&_td]:!py-3 [&_td]:!whitespace-nowrap',
  '[&_td]:!text-[14px] [&_td]:!leading-[1.47059]',
  '[&_td]:!text-[#1d1d1f] dark:[&_td]:!text-[#f5f5f7]',
  '[&_td]:!border-b [&_td]:!border-[#e5e5e7] dark:[&_td]:!border-[#38383a]',

  // Remove border from last row and add rounded bottom corners
  '[&_tbody_tr:last-child_td]:!border-b-0',
  '[&_tbody_tr:last-child_td:first-child]:!rounded-bl-xl',
  '[&_tbody_tr:last-child_td:last-child]:!rounded-br-xl',

  // Horizontal rules
  '[&_hr]:!border-none [&_hr]:!h-px',
  '[&_hr]:!bg-[#d1d1d6] dark:[&_hr]:!bg-[#48484a]',
  '[&_hr]:!my-2',

  // Images
  '[&_img]:!rounded-lg [&_img]:!shadow-md',
  '[&_img]:!my-1.5',
  'dark:[&_img]:!opacity-90',

  // Nested lists - no extra margin
  '[&_ul_ul]:!mt-0 [&_ul_ul]:!mb-0',
  '[&_ol_ol]:!mt-0 [&_ol_ol]:!mb-0',
  '[&_ul_ol]:!mt-0 [&_ul_ol]:!mb-0',
  '[&_ol_ul]:!mt-0 [&_ol_ul]:!mb-0',

  // Math blocks (KaTeX)
  '[&_.katex-display]:!my-1.5 [&_.katex-display]:!overflow-x-auto [&_.katex-display]:!overflow-y-hidden',
  '[&_.katex]:!text-[14px] [&_.katex]:!font-normal',
  '[&_.katex-html]:!text-[hsl(var(--text-primary))]',
)

/**
 * Get chat markdown styles with optional additional classes
 */
export function getChatMarkdownStyles(additionalClasses?: string) {
  return cn(chatMarkdownStyles, additionalClasses)
}
