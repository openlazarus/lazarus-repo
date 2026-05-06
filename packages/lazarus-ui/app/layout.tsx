import Script from 'next/script'

import '../styles/globals.css'
import { Providers } from './providers'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export const metadata = {
  title: 'Lazarus',
  description: 'Instant execution for your ideas.',
  keywords:
    'productivity tools, AI assistant, spreadsheet control, workflow automation, work tools integration, Lazarus AI, command center for work',
  openGraph: {
    title: 'Lazarus',
    description: 'Instant execution for your ideas.',
    type: 'website',
    url: APP_URL,
    images: '/images/lazarus-og-image.jpg',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lazarus',
    description: 'Instant execution for your ideas.',
    images: '/images/lazarus-og-image.jpg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang='en'
      className='h-dvh overflow-x-hidden'
      suppressHydrationWarning>
      <head>
        {/* iOS Safari viewport height fix - must run before page render */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function setViewportHeight() {
                  const vh = window.innerHeight * 0.01;
                  document.documentElement.style.setProperty('--vh', vh + 'px');
                }
                setViewportHeight();
                window.addEventListener('resize', setViewportHeight);
                window.addEventListener('orientationchange', setViewportHeight);
              })();
            `,
          }}
        />
        {/* <script
          crossOrigin="anonymous"
          src="//unpkg.com/react-scan/dist/auto.global.js"
        /> */}
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <link rel='canonical' href={APP_URL} />

        {/* Google Fonts preconnect links */}
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link
          rel='preconnect'
          href='https://fonts.gstatic.com'
          crossOrigin='anonymous'
        />
        {/* <meta name="apple-itunes-app" content="app-id=1200842933"/> */}

        {/* Favicon implementations for cross-browser compatibility */}
        <link rel='icon' href='/images/favicon.ico' sizes='any' />
        <link rel='icon' href='/images/favicon.svg' type='image/svg+xml' />
        <link rel='apple-touch-icon' href='/images/favicon.png' />
        <link
          rel='mask-icon'
          href='/images/safari-pinned-tab.svg'
          color='#000000'
        />
        <meta name='theme-color' content='#F4F4F4' />
        <link rel='manifest' href='/site.webmanifest' />

        {/* Meta tags to disable browser navigation gestures */}
        <meta name='apple-mobile-web-app-capable' content='yes' />
        <meta name='mobile-web-app-capable' content='yes' />
        <meta
          name='apple-mobile-web-app-status-bar-style'
          content='black-translucent'
        />
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover'
        />
        <meta name='HandheldFriendly' content='true' />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy='afterInteractive'
            />
            <Script id='google-analytics' strategy='afterInteractive'>
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}
      </head>
      <body className='min-h-screen overflow-x-hidden bg-background'>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
