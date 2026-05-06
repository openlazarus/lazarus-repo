'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: false, // We'll capture pageviews manually
    capture_pageleave: true,
  })
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Capture initial pageview
    posthog.capture('$pageview')
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
