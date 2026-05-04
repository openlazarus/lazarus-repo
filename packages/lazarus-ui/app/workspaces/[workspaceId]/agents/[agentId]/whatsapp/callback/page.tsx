'use client'

import {
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiLoader4Line,
} from '@remixicon/react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { getWorkspaceBaseUrl } from '@/hooks/data/use-workspace-api'
import { api } from '@/lib/api-client'

/**
 * WhatsApp Callback Page
 *
 * This page handles the redirect from Kapso after a user completes WhatsApp setup.
 * It receives query parameters with the phone number details and calls the assign API.
 *
 * Query params from Kapso:
 * - setup_link_id: UUID of the setup link
 * - status: "completed" on success
 * - phone_number_id: WhatsApp phone number ID (for API calls)
 * - business_account_id: Meta WABA ID
 * - display_phone_number: E.164 formatted number (URL encoded)
 * - provisioned_phone_number_id: Kapso phone ID (if provisioned)
 */
export default function WhatsAppCallbackPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const workspaceId = params.workspaceId as string
  const agentId = params.agentId as string

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  )
  const [message, setMessage] = useState('Completing WhatsApp setup...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const completeSetup = async () => {
      try {
        // Log ALL query params to see what Kapso sends
        const allParams: Record<string, string> = {}
        searchParams.forEach((value, key) => {
          allParams[key] = value
        })
        console.log('[WhatsApp Callback] ALL params received:', allParams)

        // Parse query params from Kapso redirect
        // Try multiple possible parameter names
        const setupStatus = searchParams.get('status')
        const phoneNumberId =
          searchParams.get('phone_number_id') ||
          searchParams.get('phoneNumberId')
        const displayPhoneNumber =
          searchParams.get('display_phone_number') ||
          searchParams.get('phone_number') ||
          searchParams.get('phoneNumber')
        const businessAccountId =
          searchParams.get('business_account_id') || searchParams.get('waba_id')
        const setupLinkId = searchParams.get('setup_link_id')

        console.log('[WhatsApp Callback] Parsed params:', {
          setupStatus,
          phoneNumberId,
          displayPhoneNumber,
          businessAccountId,
          setupLinkId,
        })

        // Check for failure status
        if (setupStatus !== 'completed') {
          const errorCode = searchParams.get('error_code')
          const errorMessage = searchParams.get('error_message')
          throw new Error(
            errorMessage || errorCode || 'Setup was not completed',
          )
        }

        // Validate required params - only phoneNumberId is required
        // displayPhoneNumber will be fetched from Kapso API by the backend
        if (!phoneNumberId) {
          throw new Error(
            `Missing phone_number_id. Received params: ${JSON.stringify(allParams)}`,
          )
        }

        setMessage('Saving WhatsApp configuration...')

        // Get Kapso customer ID from the workspace
        const wsBase = getWorkspaceBaseUrl(workspaceId)
        const wsHeaders = { 'x-workspace-id': workspaceId }
        const customerData = await api
          .get<{
            kapsoCustomerId?: string
          }>(`${wsBase}/api/workspaces/whatsapp/customer`, {
            headers: wsHeaders,
          })
          .catch(() => ({ kapsoCustomerId: undefined }))

        // Call the assign API to save the phone number
        // Backend will fetch phone details from Kapso if not provided
        const result = await api.post<{
          success: boolean
          whatsapp: {
            phoneNumber: string
            phoneNumberId: string
            displayName?: string
            status: string
            webhookConfigured?: boolean
          }
          message: string
        }>(
          `${wsBase}/api/workspaces/agents/${agentId}/whatsapp/assign`,
          {
            phoneNumber: displayPhoneNumber
              ? decodeURIComponent(displayPhoneNumber)
              : undefined,
            phoneNumberId,
            displayName: displayPhoneNumber
              ? decodeURIComponent(displayPhoneNumber)
              : undefined,
            kapsoCustomerId: customerData.kapsoCustomerId,
            businessAccountId,
          },
          { headers: wsHeaders },
        )

        console.log('[WhatsApp Callback] Assign result:', result)

        if (!result.success) {
          throw new Error('Failed to save WhatsApp configuration')
        }

        setStatus('success')
        setMessage(`WhatsApp connected! Phone: ${result.whatsapp.phoneNumber}`)

        // Redirect back to agent settings after a short delay
        setTimeout(() => {
          // Navigate to the main app - this will close the callback tab behavior
          // or redirect within the same tab if opened directly
          router.push(
            `/?workspace=${workspaceId}&agent=${agentId}&tab=whatsapp`,
          )
        }, 2000)
      } catch (err) {
        console.error('[WhatsApp Callback] Error:', err)
        setStatus('error')
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to complete WhatsApp setup',
        )
      }
    }

    if (workspaceId && agentId) {
      completeSetup()
    }
  }, [workspaceId, agentId, searchParams, router])

  return (
    <div className='flex min-h-screen items-center justify-center bg-black'>
      <div className='max-w-md space-y-4 p-8 text-center'>
        {status === 'loading' && (
          <>
            <RiLoader4Line className='mx-auto h-12 w-12 animate-spin text-white/50' />
            <p className='text-lg text-white/70'>{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20'>
              <RiCheckboxCircleLine className='h-10 w-10 text-green-500' />
            </div>
            <p className='text-lg font-medium text-white'>{message}</p>
            <p className='text-sm text-white/50'>
              Redirecting to your agent...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20'>
              <RiErrorWarningLine className='h-10 w-10 text-red-500' />
            </div>
            <p className='text-lg font-medium text-white'>Setup Failed</p>
            <p className='text-sm text-red-400'>{error}</p>
            <button
              onClick={() =>
                router.push(`/?workspace=${workspaceId}&agent=${agentId}`)
              }
              className='mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20'>
              Return to Agent
            </button>
          </>
        )}
      </div>
    </div>
  )
}
