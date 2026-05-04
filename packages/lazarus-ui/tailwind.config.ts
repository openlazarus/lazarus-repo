import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        lazarus: {
          gray: {
            100: 'hsl(var(--lazarus-gray-100))',
            200: 'hsl(var(--lazarus-gray-200))',
            300: 'hsl(var(--lazarus-gray-300))',
            400: 'hsl(var(--lazarus-gray-400))',
            500: 'hsl(var(--lazarus-gray-500))',
            600: 'hsl(var(--lazarus-gray-600))',
            700: 'hsl(var(--lazarus-gray-700))',
            800: 'hsl(var(--lazarus-gray-800))',
            900: 'hsl(var(--lazarus-gray-900))',
          },
          blue: {
            DEFAULT: 'hsl(var(--lazarus-blue))',
            light: 'hsl(var(--lazarus-blue-light))',
            dark: 'hsl(var(--lazarus-blue-dark))',
            hover: 'hsl(var(--lazarus-blue-hover))',
          },
        },
        background: {
          DEFAULT: 'hsl(var(--background))',
          secondary: 'hsl(var(--background-secondary))',
        },
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          dark: 'hsl(var(--muted-dark))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        'button-secondary': 'hsl(var(--button-secondary))',
        'button-secondary-hover': 'hsl(var(--button-secondary-hover))',
        'chat-agent-bg': 'hsl(var(--chat-agent-bg))',
        'dark-bg': '#111112',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-helvetica)'],
        display: ['var(--font-helvetica)'],
      },
      fontSize: {
        '11': ['0.6875rem', { lineHeight: '1.3' }], // 11px
        '12': ['0.75rem', { lineHeight: '1.3' }], // 12px
        '14': ['0.875rem', { lineHeight: '1.47' }], // 14px
        '15': ['0.9375rem', { lineHeight: '1.47' }], // 15px
        '16': ['1rem', { lineHeight: '1.47' }], // 16px
        '17': ['1.0625rem', { lineHeight: '1.47' }], // 17px
        '20': ['1.25rem', { lineHeight: '1.2' }], // 20px
        '22': ['1.375rem', { lineHeight: '1.2' }], // 22px
        '24': ['1.5rem', { lineHeight: '1.2' }], // 24px
        '28': ['1.75rem', { lineHeight: '1.1' }], // 28px
        '32': ['2rem', { lineHeight: '1.1' }], // 32px
        '40': ['2.5rem', { lineHeight: '1.1' }], // 40px
        '48': ['3rem', { lineHeight: '1.1' }], // 48px
        '56': ['3.5rem', { lineHeight: '1.1' }], // 56px
        '64': ['4rem', { lineHeight: '1.1' }], // 64px
        xs: ['0.75rem', { lineHeight: '1.3' }], // 12px
        sm: ['0.875rem', { lineHeight: '1.47' }], // 14px
        base: ['0.9375rem', { lineHeight: '1.47' }], // 15px
        lg: ['1.0625rem', { lineHeight: '1.47' }], // 17px
        xl: ['1.25rem', { lineHeight: '1.2' }], // 20px
        '2xl': ['1.5rem', { lineHeight: '1.2' }], // 24px
        '3xl': ['1.875rem', { lineHeight: '1.1' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '1.1' }], // 36px
        '5xl': ['3rem', { lineHeight: '1.1' }], // 48px
        '6xl': ['3.75rem', { lineHeight: '1.1' }], // 60px
        '7xl': ['4.5rem', { lineHeight: '1.1' }], // 72px
        '8xl': ['6rem', { lineHeight: '1.1' }], // 96px
        '9xl': ['8rem', { lineHeight: '1.1' }], // 128px
        xxs: ['0.5rem', { lineHeight: '1.3' }], // 8px
      },
      fontWeight: {
        normal: '400', // Standard normal weight
        regular: '400', // Standard regular weight
        medium: '550', // Synthesized medium for Helvetica (500 rounds to 400)
        semibold: '600', // Standard semibold weight
        bold: '700', // Standard bold weight
      },
      letterSpacing: {
        tightest: '-0.025em', // Extra tight for headings
        tighter: '-0.02em', // For large headings
        tight: '-0.015em', // For medium headings
        normal: '-0.01em', // Standard slight negative tracking
        wide: '0.01em', // For labels/all caps
        wider: '0.02em',
        widest: '0.05em',
      },
      lineHeight: {
        tight: '1.1', // For headings
        normal: '1.2', // For subheadings
        relaxed: '1.3', // For small text
        body: '1.47', // Standard body line height
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        flow: {
          '0%, 100%': { backgroundPosition: '0% 0%' },
          '50%': { backgroundPosition: '100% 100%' },
        },
        'border-sweep': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        flow: 'flow 15s ease infinite',
        'border-sweep': 'border-sweep 3s linear infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT:
          '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
