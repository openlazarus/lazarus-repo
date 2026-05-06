import { cn } from '@/lib/utils'

/**
 * Chat-specific markdown styles for compact, inline message rendering
 * All text constrained to 14-17px range for consistency
 * Based on Apple design language but optimized for chat bubbles
 */
export const chatMarkdownStyles = cn(
  // Remove prose classes - we define everything ourselves
  'max-w-none',

  // Base typography matching chat context (14px)
  'font-[-apple-system,BlinkMacSystemFont,"SF_Pro_Display","SF_Pro_Text",system-ui,sans-serif]',
  '[&]:text-gray-500',

  // Paragraphs - compact for chat (14px)
  '[&_p]:!my-0 [&_p]:!mb-2 [&_p]:!text-[14px] [&_p]:!leading-[1.5]',
  '[&_p]:!font-normal [&_p]:!text-gray-500',
  '[&_p:last-child]:!mb-0',

  // Headings - all 14px, differentiated by weight only
  '[&_h1]:!text-[14px] [&_h1]:!leading-[1.3] [&_h1]:!font-bold',
  '[&_h1]:!mb-2 [&_h1]:!mt-0 [&_h1]:!text-gray-700',

  '[&_h2]:!text-[14px] [&_h2]:!leading-[1.3] [&_h2]:!font-bold',
  '[&_h2]:!mb-1.5 [&_h2]:!mt-3 [&_h2]:!text-gray-700',

  '[&_h3]:!text-[14px] [&_h3]:!leading-[1.3] [&_h3]:!font-semibold',
  '[&_h3]:!mb-1.5 [&_h3]:!mt-2.5 [&_h3]:!text-gray-600',

  '[&_h4]:!text-[14px] [&_h4]:!leading-[1.3] [&_h4]:!font-semibold',
  '[&_h4]:!mb-1 [&_h4]:!mt-2 [&_h4]:!text-gray-600',

  '[&_h5]:!text-[14px] [&_h5]:!leading-[1.3] [&_h5]:!font-medium',
  '[&_h5]:!mb-1 [&_h5]:!mt-2 [&_h5]:!text-gray-500',

  '[&_h6]:!text-[14px] [&_h6]:!leading-[1.3] [&_h6]:!font-medium',
  '[&_h6]:!mb-1 [&_h6]:!mt-2 [&_h6]:!text-gray-500',

  // Compact Lists for chat
  '[&_ul]:!pl-0 [&_ul]:!my-2 [&_ul]:!list-none',
  '[&_ol]:!pl-0 [&_ol]:!my-2 [&_ol]:!list-none',

  '[&_li]:!relative [&_li]:!pl-5 [&_li]:!my-0.5',
  '[&_li]:!text-[14px] [&_li]:!leading-[1.5]',
  '[&_li]:!text-gray-500',

  // Bullet points with subtle styling
  '[&_ul>li]:before:content-["•"] [&_ul>li]:before:absolute',
  '[&_ul>li]:before:left-1 [&_ul>li]:before:text-gray-400',
  '[&_ul>li]:before:font-normal',

  // Numbered lists
  '[&_ol]:counter-reset-[list-item]',
  '[&_ol>li]:before:counter-increment-[list-item]',
  '[&_ol>li]:before:content-[counter(list-item)_".\u00a0"]',
  '[&_ol>li]:before:absolute [&_ol>li]:before:left-0',
  '[&_ol>li]:before:text-gray-400',
  '[&_ol>li]:before:font-normal [&_ol>li]:before:min-w-[1.25rem]',

  // Compact quote design for chat
  '[&_blockquote]:!my-3 [&_blockquote]:!pl-3 [&_blockquote]:!py-0.5',
  '[&_blockquote]:!border-l-[2px] [&_blockquote]:!border-gray-300',
  '[&_blockquote]:!italic',
  '[&_blockquote]:!text-[14px] [&_blockquote]:!leading-[1.5]',
  '[&_blockquote]:!text-gray-400',

  // Code blocks - compact for chat (12px for code)
  '[&_pre]:!block [&_pre]:!bg-gray-50',
  '[&_pre]:!border [&_pre]:!border-gray-200',
  '[&_pre]:!rounded-lg [&_pre]:!px-3 [&_pre]:!py-2',
  '[&_pre]:!my-2 [&_pre]:!font-["SF_Mono",Monaco,"Cascadia_Code","Roboto_Mono",Consolas,"Courier_New",monospace]',
  '[&_pre]:!text-[12px] [&_pre]:!leading-[1.5]',
  '[&_pre]:!text-gray-700',
  '[&_pre]:!overflow-x-auto [&_pre]:!whitespace-pre',

  // Inline code - subtle (12px for code)
  '[&_:not(pre)>code]:!bg-gray-100',
  '[&_:not(pre)>code]:!border-none [&_:not(pre)>code]:!rounded',
  '[&_:not(pre)>code]:!px-1 [&_:not(pre)>code]:!py-0.5',
  '[&_:not(pre)>code]:!font-["SF_Mono",Monaco,"Cascadia_Code","Roboto_Mono",Consolas,"Courier_New",monospace]',
  '[&_:not(pre)>code]:!text-[12px] [&_:not(pre)>code]:!font-normal',
  '[&_:not(pre)>code]:!text-gray-700',
  '[&_code]:before:content-none [&_code]:after:content-none',

  // Links - subtle for chat
  '[&_a]:!text-gray-600',
  '[&_a]:!underline [&_a]:!decoration-gray-300 [&_a]:!decoration-1',
  '[&_a]:!underline-offset-2',
  '[&_a:hover]:!text-gray-700 [&_a:hover]:!decoration-gray-400',

  // Text formatting (14px)
  '[&_strong]:!font-semibold [&_strong]:!text-gray-600',
  '[&_em]:!italic',
  '[&_u]:!underline [&_u]:!decoration-gray-400 [&_u]:!decoration-1 [&_u]:!underline-offset-2',
  '[&_s]:!line-through [&_s]:!decoration-gray-400 [&_s]:!decoration-1 [&_s]:!opacity-70',

  // Compact Tables for chat
  '[&_table]:!w-full [&_table]:!my-3',
  '[&_table]:!border-collapse',
  '[&_table]:!rounded-lg',
  '[&_table]:!bg-gray-50',
  '[&_table]:!border [&_table]:!border-gray-200',

  // Table headers - minimal
  '[&_thead]:!bg-gray-100',
  '[&_th]:!text-left [&_th]:!font-semibold',
  '[&_th]:!text-[12px] [&_th]:!uppercase [&_th]:!tracking-wider',
  '[&_th]:!text-gray-600',
  '[&_th]:!px-3 [&_th]:!py-2',
  '[&_th]:!border-b [&_th]:!border-gray-200',

  // Table body
  '[&_tbody_tr]:!transition-colors',
  '[&_tbody_tr:hover]:!bg-gray-50',

  // Table cells (14px)
  '[&_td]:!px-3 [&_td]:!py-2',
  '[&_td]:!text-[14px] [&_td]:!leading-[1.5]',
  '[&_td]:!text-gray-500',
  '[&_td]:!border-b [&_td]:!border-gray-200',

  // Remove border from last row
  '[&_tbody_tr:last-child_td]:!border-b-0',

  // Horizontal rules - subtle
  '[&_hr]:!border-none [&_hr]:!h-px',
  '[&_hr]:!bg-gray-200',
  '[&_hr]:!my-3',

  // Images - compact
  '[&_img]:!rounded-md [&_img]:!my-2',
  '[&_img]:!max-w-full',

  // Nested lists - tighter spacing
  '[&_ul_ul]:!mt-0.5 [&_ul_ul]:!mb-0',
  '[&_ol_ol]:!mt-0.5 [&_ol_ol]:!mb-0',
  '[&_ul_ol]:!mt-0.5 [&_ul_ol]:!mb-0',
  '[&_ol_ul]:!mt-0.5 [&_ol_ul]:!mb-0',
)

/**
 * Get chat markdown styles with optional additional classes
 */
export function getChatMarkdownStyles(additionalClasses?: string) {
  return cn(chatMarkdownStyles, additionalClasses)
}
