import { cn } from '@/lib/utils'

/**
 * Centralized markdown styles for consistent rendering across the application
 * Uses Apple-inspired design language matching Lexical editor
 */
export const markdownStyles = cn(
  // Remove prose classes - we define everything ourselves
  'max-w-none',

  // Base typography matching lexical editor
  'font-[-apple-system,BlinkMacSystemFont,"SF_Pro_Display","SF_Pro_Text",system-ui,sans-serif]',
  '[&]:text-[#1d1d1f] dark:[&]:text-[#f5f5f7]',

  // Paragraphs - Apple-like spacing
  '[&_p]:!my-0 [&_p]:!mb-4 [&_p]:!text-[14px] [&_p]:!leading-[1.47059]',
  '[&_p]:!font-normal [&_p]:!text-[#1d1d1f] dark:[&_p]:!text-[#f5f5f7]',
  '[&_p:last-child]:!mb-0',

  // Compact Typography - ALL 14px
  '[&_h1]:!text-[14px] [&_h1]:!leading-[1.3] [&_h1]:!font-bold',
  '[&_h1]:!mb-2 [&_h1]:!mt-0 [&_h1]:!text-[#1d1d1f] dark:[&_h1]:!text-[#f5f5f7]',
  '[&_h1]:!tracking-[0]',

  '[&_h2]:!text-[14px] [&_h2]:!leading-[1.3] [&_h2]:!font-bold',
  '[&_h2]:!mb-2 [&_h2]:!mt-4 [&_h2]:!text-[#1d1d1f] dark:[&_h2]:!text-[#f5f5f7]',

  '[&_h3]:!text-[14px] [&_h3]:!leading-[1.3] [&_h3]:!font-semibold',
  '[&_h3]:!mb-2 [&_h3]:!mt-3.5 [&_h3]:!text-[#1d1d1f] dark:[&_h3]:!text-[#f5f5f7]',

  '[&_h4]:!text-[14px] [&_h4]:!leading-[1.3] [&_h4]:!font-semibold',
  '[&_h4]:!mb-2 [&_h4]:!mt-3 [&_h4]:!text-[#1d1d1f] dark:[&_h4]:!text-[#f5f5f7]',

  '[&_h5]:!text-[14px] [&_h5]:!leading-[1.3] [&_h5]:!font-semibold',
  '[&_h5]:!mb-2 [&_h5]:!mt-3 [&_h5]:!text-[#424245] dark:[&_h5]:!text-[#a1a1a6]',

  '[&_h6]:!text-[14px] [&_h6]:!leading-[1.3] [&_h6]:!font-semibold',
  '[&_h6]:!mb-2 [&_h6]:!mt-3 [&_h6]:!text-[#424245] dark:[&_h6]:!text-[#a1a1a6]',

  // Apple-style Lists with proper spacing
  '[&_ul]:!pl-0 [&_ul]:!my-4 [&_ul]:!list-none',
  '[&_ol]:!pl-0 [&_ol]:!my-4 [&_ol]:!list-none',

  '[&_li]:!relative [&_li]:!pl-7 [&_li]:!my-1',
  '[&_li]:!text-[14px] [&_li]:!leading-[1.47059]',
  '[&_li]:!text-[#1d1d1f] dark:[&_li]:!text-[#f5f5f7]',

  // Bullet points with iOS blue color
  '[&_ul>li]:before:content-["•"] [&_ul>li]:before:absolute',
  '[&_ul>li]:before:left-2 [&_ul>li]:before:text-[#007aff] dark:[&_ul>li]:before:text-[#0a84ff]',
  '[&_ul>li]:before:font-normal',

  // Numbered lists with iOS blue color
  '[&_ol]:counter-reset-[list-item]',
  '[&_ol>li]:before:counter-increment-[list-item]',
  '[&_ol>li]:before:content-[counter(list-item)_"."]',
  '[&_ol>li]:before:absolute [&_ol>li]:before:left-0',
  '[&_ol>li]:before:text-[#007aff] dark:[&_ol>li]:before:text-[#0a84ff]',
  '[&_ol>li]:before:font-normal [&_ol>li]:before:min-w-[1.5rem]',

  // Clean quote design with iOS blue color
  '[&_blockquote]:!my-8 [&_blockquote]:!px-6 [&_blockquote]:!py-4',
  '[&_blockquote]:!border-l-[3px] [&_blockquote]:!border-[#007aff] dark:[&_blockquote]:!border-[#0a84ff]',
  '[&_blockquote]:!bg-[rgba(0,122,255,0.03)] dark:[&_blockquote]:!bg-[rgba(10,132,255,0.05)]',
  '[&_blockquote]:!rounded-r-lg [&_blockquote]:!italic',
  '[&_blockquote]:!text-[14px] [&_blockquote]:!leading-[1.47059]',
  '[&_blockquote]:!text-[#424245] dark:[&_blockquote]:!text-[#a1a1a6]',

  // Code blocks - Apple-inspired design matching Lexical
  '[&_pre]:!block [&_pre]:!bg-[#f5f5f7] dark:[&_pre]:!bg-[#1c1c1e]',
  '[&_pre]:!border [&_pre]:!border-[rgba(0,0,0,0.06)] dark:[&_pre]:!border-[rgba(255,255,255,0.08)]',
  '[&_pre]:!rounded-[12px] [&_pre]:!px-[18px] [&_pre]:!py-4',
  '[&_pre]:!my-5 [&_pre]:!font-["SF_Mono",Monaco,"Cascadia_Code","Roboto_Mono",Consolas,"Courier_New",monospace]',
  '[&_pre]:!text-[14px] [&_pre]:!leading-[1.6]',
  '[&_pre]:!text-[#1d1d1f] dark:[&_pre]:!text-[#f5f5f7]',
  '[&_pre]:!overflow-x-auto [&_pre]:!whitespace-pre',
  '[&_pre]:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.02)]',
  'dark:[&_pre]:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.06)]',

  // Inline code - clean Apple style
  '[&_:not(pre)>code]:!bg-[rgba(142,142,147,0.12)] dark:[&_:not(pre)>code]:!bg-[rgba(142,142,147,0.24)]',
  '[&_:not(pre)>code]:!border-none [&_:not(pre)>code]:!rounded-md',
  '[&_:not(pre)>code]:!px-1.5 [&_:not(pre)>code]:!py-0.5',
  '[&_:not(pre)>code]:!font-["SF_Mono",Monaco,"Cascadia_Code","Roboto_Mono",Consolas,"Courier_New",monospace]',
  '[&_:not(pre)>code]:!text-[0.92em] [&_:not(pre)>code]:!font-medium',
  '[&_:not(pre)>code]:!text-[#1d1d1f] dark:[&_:not(pre)>code]:!text-[#f5f5f7]',
  '[&_:not(pre)>code]:!tracking-[-0.01em]',
  '[&_code]:before:content-none [&_code]:after:content-none',

  // Links with iOS blue color
  '[&_a]:!text-[#007aff] dark:[&_a]:!text-[#0a84ff]',
  '[&_a]:!no-underline [&_a]:!relative [&_a]:!transition-all',
  '[&_a:hover]:!bg-[rgba(0,122,255,0.08)] dark:[&_a:hover]:!bg-[rgba(10,132,255,0.12)]',
  '[&_a:hover]:!rounded-sm',

  // Text formatting
  '[&_strong]:!font-semibold [&_strong]:!text-[#1d1d1f] dark:[&_strong]:!text-[#f5f5f7]',
  '[&_em]:!italic [&_em]:![font-variation-settings:"slnt"_-10]',
  '[&_u]:!underline [&_u]:!decoration-[#007aff] [&_u]:!decoration-1 [&_u]:!underline-offset-2',
  '[&_s]:!line-through [&_s]:!decoration-[#ff3b30] [&_s]:!decoration-1 [&_s]:!opacity-70',

  // Apple-style Tables
  '[&_table]:!w-full [&_table]:!my-6',
  '[&_table]:!border-collapse',
  '[&_table]:!overflow-hidden',
  '[&_table]:!rounded-xl',
  '[&_table]:!bg-[#fafafa] dark:[&_table]:!bg-[#1c1c1e]',
  '[&_table]:!shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_2px_4px_rgba(0,0,0,0.08)]',
  'dark:[&_table]:!shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.3)]',

  // Table headers - minimal Apple style
  '[&_thead]:!bg-[#f5f5f7] dark:[&_thead]:!bg-[#2c2c2e]',
  '[&_th]:!text-left [&_th]:!font-semibold',
  '[&_th]:!text-[11px] [&_th]:!uppercase [&_th]:!tracking-[0.06em]',
  '[&_th]:!text-[#6e6e73] dark:[&_th]:!text-[#98989d]',
  '[&_th]:!px-4 [&_th]:!py-3',
  '[&_th]:!border-b [&_th]:!border-[#e5e5e7] dark:[&_th]:!border-[#38383a]',
  '[&_th:first-child]:!rounded-tl-xl',
  '[&_th:last-child]:!rounded-tr-xl',

  // Table body - clean rows
  '[&_tbody_tr]:!transition-colors',
  '[&_tbody_tr:hover]:!bg-[#f0f0f2] dark:[&_tbody_tr:hover]:!bg-[#2c2c2e]',

  // Table cells
  '[&_td]:!px-4 [&_td]:!py-3',
  '[&_td]:!text-[14px] [&_td]:!leading-[1.47059]',
  '[&_td]:!text-[#1d1d1f] dark:[&_td]:!text-[#f5f5f7]',
  '[&_td]:!border-b [&_td]:!border-[#e5e5e7] dark:[&_td]:!border-[#38383a]',

  // Remove border from last row
  '[&_tbody_tr:last-child_td]:!border-b-0',

  // First and last cell rounded corners on last row
  '[&_tbody_tr:last-child_td:first-child]:!rounded-bl-xl',
  '[&_tbody_tr:last-child_td:last-child]:!rounded-br-xl',

  // Horizontal rules
  '[&_hr]:!border-none [&_hr]:!h-px',
  '[&_hr]:!bg-[#d1d1d6] dark:[&_hr]:!bg-[#48484a]',
  '[&_hr]:!my-8',

  // Images
  '[&_img]:!rounded-lg [&_img]:!shadow-md',
  '[&_img]:!my-4',
  'dark:[&_img]:!opacity-90',

  // Nested lists
  '[&_ul_ul]:!mt-2 [&_ul_ul]:!mb-0',
  '[&_ol_ol]:!mt-2 [&_ol_ol]:!mb-0',
  '[&_ul_ol]:!mt-2 [&_ul_ol]:!mb-0',
  '[&_ol_ul]:!mt-2 [&_ol_ul]:!mb-0',
)

/**
 * Get markdown styles with optional additional classes
 */
export function getMarkdownStyles(additionalClasses?: string) {
  return cn(markdownStyles, additionalClasses)
}
