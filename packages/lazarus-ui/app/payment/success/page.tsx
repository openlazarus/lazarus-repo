'use client'

import * as m from 'motion/react-m'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import Logo from '@/components/ui/logo'
import { useQueryParams } from '@/hooks/data/use-query-params'

export default function PaymentSuccessPage() {
  const router = useRouter()
  const { queryParams } = useQueryParams()
  const transactionId = queryParams?.session_id || '****'

  // Only show last 4 digits of transaction ID
  const displayTransactionId = `•••• ${transactionId.slice(-4)}`

  const handleContinue = () => {
    router.push('/')
  }

  return (
    <div className='flex min-h-screen flex-col bg-[#F9F9F9]'>
      {/* Main Content */}
      <div className='flex flex-1 items-center justify-center p-4'>
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className='w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-sm'>
          {/* Logo */}
          <div className='mb-6 flex justify-center'>
            <div className='relative flex h-20 w-20 items-center justify-center'>
              <Logo size='large' />
            </div>
          </div>

          {/* Success Message */}
          <div className='mb-8 text-center'>
            <h1 className='mb-2 text-2xl font-medium text-gray-900'>
              Payment Successful
            </h1>
            <p className='text-gray-600'>
              Thank you for your contribution to the community
            </p>
          </div>

          {/* Transaction Details */}
          <div className='mb-8 space-y-3 rounded-xl bg-gray-50 p-4'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-gray-600'>Transaction ID</span>
              <span className='font-medium text-gray-900'>
                {displayTransactionId}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-gray-600'>Status</span>
              <div className='flex items-center gap-1.5'>
                <div className='h-2 w-2 rounded-full bg-[#0098FC]' />
                <span className='font-medium text-[#0098FC]'>Completed</span>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <Button
            onClick={handleContinue}
            className='relative w-full rounded-xl bg-[#0098FC] py-3 text-sm font-medium text-white transition-colors hover:bg-[#0077C4]'>
            Continue to Memory
          </Button>
        </m.div>
      </div>
    </div>
  )
}
