'use client'

import {
  RiAddLine,
  RiArrowRightCircleLine,
  RiBuildingLine,
  RiMoneyDollarCircleLine,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OptionList, type OptionItem } from '@/components/ui/option-list'
import Spinner from '@/components/ui/spinner'
import { Stack, StackItem } from '@/components/ui/stack'
import { Toggle } from '@/components/ui/toggle'
import { useAuth } from '@/hooks/auth/use-auth'
import { useCreateCheckoutSession } from '@/hooks/billing/use-create-checkout-session'
import { useCreateTeamBilling } from '@/hooks/billing/use-create-team-billing'
import { useCredits, useCreditTransactions } from '@/hooks/billing/use-credits'
import { useTeamsBilling } from '@/hooks/billing/use-team-billing'
import { useTheme } from '@/hooks/ui/use-theme'
import { useCurrency } from '@/hooks/utils/use-currency'
import { cn } from '@/lib/utils'

interface BillingAccount {
  id: string
  teamId: string
  balance: number
  createdAt: string
}

interface TeamBilling {
  id: string
  name: string
  billingAccount?: BillingAccount
  monthlyUsage: {
    memoryOps: number
    memoryOpsCost: number
    storageGB: number
    storageCost: number
    totalCost: number
  }
}

interface Invoice {
  id: string
  date: string
  amount: number
  status: 'paid' | 'pending' | 'failed'
  description: string
  teamId?: string
}

export const CreditsSection = () => {
  const { isDark } = useTheme()
  const { currency } = useCurrency()
  const { profile } = useAuth()

  // Billing hooks
  const {
    balance,
    balanceUSD,
    loading: balanceLoading,
    refresh: refreshBalance,
  } = useCredits()
  const { transactions, loading: transactionsLoading } = useCreditTransactions()
  const {
    teams: orgsBillingData,
    isLoading: orgsBillingLoading,
    mutate: refreshOrgsBilling,
  } = useTeamsBilling()

  const [createCheckoutSession] = useCreateCheckoutSession()
  const [pendingTeamBilling, setPendingTeamBilling] = useState<{
    teamId: string
    amount: number
  } | null>(null)
  const [createTeamBillingMutation] = useCreateTeamBilling(
    pendingTeamBilling?.teamId ?? '',
  )

  useEffect(() => {
    if (!pendingTeamBilling) return
    createTeamBillingMutation({})
      .then(() => refreshOrgsBilling())
      .then(() =>
        createCheckoutSession({
          amount_usd: pendingTeamBilling.amount,
          team_id: pendingTeamBilling.teamId,
        }),
      )
      .then((data) => {
        if (data?.url) window.location.href = data.url
      })
      .catch((error) => {
        console.error('Failed to create billing account:', error)
      })
      .finally(() => {
        setPendingTeamBilling(null)
        setIsProcessing(false)
      })
  }, [pendingTeamBilling])

  // Main account
  const [purchaseAmount, setPurchaseAmount] = useState(50)
  const [isProcessing, setIsProcessing] = useState(false)
  const [addCreditsAmount, setAddCreditsAmount] = useState<number>(0)
  const [initialBalanceAmount, setInitialBalanceAmount] = useState<number>(100)
  const [selectedOrgForBalance, setSelectedOrgForBalance] = useState<
    string | null
  >(null)
  const [showBalanceDialog, setShowBalanceDialog] = useState(false)

  // Auto-reload
  const [autoReloadEnabled, setAutoReloadEnabled] = useState(false)
  const [minBalance, setMinBalance] = useState(50)
  const [targetBalance, setTargetBalance] = useState(200)

  // Build orgBilling from real API data
  const orgBilling: TeamBilling[] = orgsBillingData
    .filter((org) => org.role === 'owner') // Only show owned teams
    .map((org) => ({
      id: org.team.id,
      name: org.team.name,
      billingAccount: org.billingAccount
        ? {
            id: org.billingAccount.id,
            teamId: org.billingAccount.team_id,
            balance: org.billingAccount.credit_balance_cents / 100, // Convert cents to dollars
            createdAt: org.billingAccount.created_at,
          }
        : undefined,
      // Usage metrics will be removed per user request (avoid credit consumption tracking)
      monthlyUsage: {
        memoryOps: 0,
        memoryOpsCost: 0,
        storageGB: 0,
        storageCost: 0,
        totalCost: 0,
      },
    }))

  const PLATFORM_LABELS: Record<string, string> = {
    chat: 'Chat',
    discord: 'Discord',
    slack: 'Slack',
    email: 'Email',
    whatsapp: 'WhatsApp',
  }

  const ACTIVITY_LABELS: Record<string, string> = {
    agent_run: 'Agent run',
    tool_use: 'Tool use',
    conversation: 'Conversation',
  }

  const formatActivityLabel = (activityType?: string): string => {
    if (!activityType) return 'Usage'
    if (ACTIVITY_LABELS[activityType]) return ACTIVITY_LABELS[activityType]
    return activityType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  const formatPurchaseDescription = (
    tx: (typeof transactions)[number],
  ): string => {
    const method =
      tx.purchase_method === 'auto_reload' ? 'auto-reload' : 'one-time'
    return `Credit purchase (${method})`
  }

  const formatConsumptionDescription = (
    tx: (typeof transactions)[number],
  ): string => {
    const meta = tx.metadata
    const source = meta?.platform_source
    const inputTokens = meta?.input_tokens
    const outputTokens = meta?.output_tokens
    const hasTokens =
      typeof inputTokens === 'number' && typeof outputTokens === 'number'
    if (source && hasTokens) {
      const label = PLATFORM_LABELS[source] ?? source
      return `${label}: ${inputTokens} input, ${outputTokens} output tokens`
    }
    if (hasTokens) {
      return `${formatActivityLabel(tx.activity_type)}: ${inputTokens} input, ${outputTokens} output tokens`
    }
    return formatActivityLabel(tx.activity_type)
  }

  const formatTransactionDescription = (
    tx: (typeof transactions)[number],
  ): string => {
    if (tx.transaction_type === 'credit_purchase') {
      return tx.description ?? formatPurchaseDescription(tx)
    }
    return formatConsumptionDescription(tx)
  }

  // Convert transactions to invoice format for display
  const invoices: Invoice[] = transactions
    .filter(
      (tx) =>
        tx.transaction_type === 'credit_purchase' ||
        tx.transaction_type === 'credit_consumption',
    )
    .slice(0, 10) // Show last 10 transactions
    .map((tx) => ({
      id: tx.id,
      date: tx.created_at,
      amount: Math.abs(tx.amount_cents) / 100, // Convert cents to dollars
      status: 'paid' as const,
      description: formatTransactionDescription(tx),
      teamId: tx.workspace_id,
    }))

  // Guard clause: don't render if user is not loaded
  if (!profile) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Spinner size='sm' />
      </div>
    )
  }

  const handlePurchaseCredits = async (
    amount: number,
    targetOrgId?: string,
  ) => {
    if (!amount || amount <= 0) return
    setIsProcessing(true)
    try {
      const data = await createCheckoutSession({
        amount_usd: amount,
        team_id: targetOrgId,
      })
      if (data?.url) window.location.href = data.url
      else setIsProcessing(false)
    } catch (error) {
      console.error('Failed to purchase credits:', error)
      setIsProcessing(false)
    }
  }

  const handleCreateBillingAccount = (teamId: string, amount: number) => {
    if (!amount || amount <= 0) return
    setIsProcessing(true)
    setPendingTeamBilling({ teamId, amount })
  }

  const handleSaveAutoReload = () => {
    // console.log('Saving auto-reload settings:', {
    //   enabled: autoReloadEnabled,
    //   minBalance,
    //   targetBalance,
    // })
  }

  // Calculate totals
  const orgsUsingMain = orgBilling.filter((org) => !org.billingAccount)

  // Build team options
  const orgOptions: OptionItem[] = orgBilling.map((org) => ({
    id: org.id,
    icon: RiBuildingLine,
    label: org.name,
    description: org.billingAccount
      ? `Separate billing • ${currency.symbol}${org.billingAccount.balance.toFixed(2)} balance`
      : `Main account billing`,
  }))

  return (
    <m.div
      className='w-full'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}>
      <div className='space-y-8'>
        {/* Main Account Balance & Stats */}
        <div
          className={cn(
            'border-b pb-6',
            isDark ? 'border-white/10' : 'border-black/10',
          )}>
          <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
            {/* Balance */}
            <div>
              <h3
                className={cn(
                  'mb-2 text-[11px] font-semibold uppercase tracking-wider',
                  isDark ? 'text-foreground/60' : 'text-[#666666]',
                )}>
                Main account
              </h3>
              {balanceLoading ? (
                <div className='flex items-center py-2'>
                  <Spinner size='sm' />
                </div>
              ) : (
                <>
                  <div className='text-[36px] font-bold leading-none tracking-tight text-[#0098FC]'>
                    {currency.symbol}
                    {balanceUSD.toFixed(2)}
                  </div>
                  <p
                    className={cn(
                      'mt-1.5 text-[12px]',
                      isDark ? 'text-foreground/50' : 'text-black/50',
                    )}>
                    {orgsUsingMain.length} org
                    {orgsUsingMain.length !== 1 ? 's' : ''} using main account
                  </p>
                </>
              )}
            </div>

            {/* Auto-reload */}
            <div>
              <h3
                className={cn(
                  'mb-2 text-[11px] font-semibold uppercase tracking-wider',
                  isDark ? 'text-foreground/60' : 'text-[#666666]',
                )}>
                Auto-reload
              </h3>
              <Toggle
                checked={autoReloadEnabled}
                onChange={setAutoReloadEnabled}
                size='medium'
                variant='default'
                label={autoReloadEnabled ? 'Enabled' : 'Disabled'}
                isDark={isDark}
              />
            </div>
          </div>
        </div>

        {/* Purchase Credits */}
        <div
          className={cn(
            'border-b pb-6',
            isDark ? 'border-white/10' : 'border-black/10',
          )}>
          <h3
            className={cn(
              'mb-4 text-[11px] font-semibold uppercase tracking-wider',
              isDark ? 'text-foreground/60' : 'text-[#666666]',
            )}>
            Purchase credits
          </h3>
          <div className='max-w-md'>
            <div className='flex items-end gap-3'>
              <div className='flex-1'>
                <Input
                  type='number'
                  placeholder='Enter amount'
                  value={purchaseAmount || ''}
                  onChange={(e) =>
                    setPurchaseAmount(parseFloat(e.target.value) || 0)
                  }
                  variant='surface'
                  isDark={isDark}
                  iconLeft={<RiMoneyDollarCircleLine className='h-4 w-4' />}
                />
              </div>
              <Button
                variant='active'
                size='medium'
                disabled={!purchaseAmount || purchaseAmount <= 0}
                loading={isProcessing}
                onClick={() => handlePurchaseCredits(purchaseAmount)}
                iconRight={<RiArrowRightCircleLine className='h-5 w-5' />}>
                Purchase
              </Button>
            </div>
            <p
              className={cn(
                'mt-2 text-[12px]',
                isDark ? 'text-foreground/50' : 'text-black/50',
              )}>
              Credits will be added to your main account
            </p>
          </div>
        </div>

        {/* Auto-Reload Config */}
        {autoReloadEnabled && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              'border-b pb-6',
              isDark ? 'border-white/10' : 'border-black/10',
            )}>
            <h3
              className={cn(
                'mb-4 text-[11px] font-semibold uppercase tracking-wider',
                isDark ? 'text-foreground/60' : 'text-[#666666]',
              )}>
              Auto-reload settings
            </h3>
            <div className='max-w-md space-y-4'>
              <div>
                <label
                  className={cn(
                    'mb-2 block text-[11px] font-semibold uppercase tracking-wider',
                    isDark ? 'text-foreground/60' : 'text-[#666666]',
                  )}>
                  When balance reaches
                </label>
                <Input
                  type='number'
                  value={minBalance}
                  onChange={(e) =>
                    setMinBalance(parseFloat(e.target.value) || 0)
                  }
                  variant='surface'
                  isDark={isDark}
                  iconLeft={<RiMoneyDollarCircleLine className='h-4 w-4' />}
                />
              </div>
              <div>
                <label
                  className={cn(
                    'mb-2 block text-[11px] font-semibold uppercase tracking-wider',
                    isDark ? 'text-foreground/60' : 'text-[#666666]',
                  )}>
                  Reload to
                </label>
                <Input
                  type='number'
                  value={targetBalance}
                  onChange={(e) =>
                    setTargetBalance(parseFloat(e.target.value) || 0)
                  }
                  variant='surface'
                  isDark={isDark}
                  iconLeft={<RiMoneyDollarCircleLine className='h-4 w-4' />}
                />
              </div>
              <Button
                variant='active'
                size='small'
                onClick={handleSaveAutoReload}>
                Save Settings
              </Button>
            </div>
          </m.div>
        )}

        {/* Teams */}
        <div
          className={cn(
            'border-b pb-6',
            isDark ? 'border-white/10' : 'border-black/10',
          )}>
          <h3
            className={cn(
              'mb-4 text-[11px] font-semibold uppercase tracking-wider',
              isDark ? 'text-foreground/60' : 'text-[#666666]',
            )}>
            Teams & billing
          </h3>

          <OptionList
            options={orgOptions}
            onOptionClick={(teamId) => {
              setSelectedOrgForBalance(teamId as string)
              const org = orgBilling.find((o) => o.id === teamId)
              if (org?.billingAccount) {
                setAddCreditsAmount(0)
              } else {
                setInitialBalanceAmount(100)
              }
              setShowBalanceDialog(true)
            }}
            isDark={isDark}
            showDescriptions={true}
            animated={true}
          />
        </div>

        {/* Recent Transactions */}
        <div>
          <h3
            className={cn(
              'mb-4 text-[11px] font-semibold uppercase tracking-wider',
              isDark ? 'text-foreground/60' : 'text-[#666666]',
            )}>
            Recent transactions
          </h3>

          {transactionsLoading ? (
            <div className='flex items-center justify-center py-8'>
              <Spinner size='sm' />
            </div>
          ) : invoices.length === 0 ? (
            <div
              className={cn(
                'rounded-lg border p-8 text-center',
                isDark ? 'border-white/10' : 'border-black/10',
              )}>
              <p
                className={cn(
                  'text-[13px]',
                  isDark ? 'text-foreground/50' : 'text-black/50',
                )}>
                No transactions yet. Purchase credits to get started.
              </p>
            </div>
          ) : (
            <Stack isDark={isDark}>
              {invoices.map((invoice, index) => {
                const org = orgBilling.find((o) => o.id === invoice.teamId)
                const isConsumption =
                  transactions[index]?.transaction_type === 'credit_consumption'

                return (
                  <StackItem key={invoice.id} isDark={isDark} index={index}>
                    <div className='flex items-center justify-between py-4'>
                      <div className='flex-1'>
                        <p
                          className={cn(
                            'text-[13px] font-medium',
                            isDark ? 'text-foreground' : 'text-black',
                          )}>
                          {invoice.description}
                        </p>
                        <p
                          className={cn(
                            'mt-0.5 text-[12px]',
                            isDark ? 'text-foreground/50' : 'text-black/50',
                          )}>
                          {new Date(invoice.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          {org ? `• ${org.name}` : ''}
                        </p>
                      </div>
                      <div className='flex items-center gap-4'>
                        <p
                          className={cn(
                            'text-[14px] font-semibold',
                            isConsumption
                              ? 'text-orange-500'
                              : 'text-green-500',
                          )}>
                          {isConsumption ? '-' : '+'}
                          {currency.symbol}
                          {invoice.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </StackItem>
                )
              })}
            </Stack>
          )}
        </div>
      </div>

      {/* Add Balance / Create Billing Account Dialog */}
      {showBalanceDialog &&
        selectedOrgForBalance &&
        (() => {
          const org = orgBilling.find((o) => o.id === selectedOrgForBalance)
          if (!org) return null

          const isCreating = !org.billingAccount
          const amount = isCreating ? initialBalanceAmount : addCreditsAmount
          const setAmount = isCreating
            ? setInitialBalanceAmount
            : setAddCreditsAmount

          return (
            <m.div
              className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowBalanceDialog(false)
                setAddCreditsAmount(0)
                setInitialBalanceAmount(100)
              }}>
              <m.div
                className={cn(
                  'w-full max-w-md rounded-2xl p-6',
                  isDark ? 'bg-[#111112]' : 'bg-white',
                )}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}>
                <h3
                  className={cn(
                    'mb-2 text-[16px] font-semibold',
                    isDark ? 'text-foreground' : 'text-[#1a1a1a]',
                  )}>
                  Add credits to {org.name}
                </h3>
                <p
                  className={cn(
                    'mb-6 text-[14px]',
                    isDark ? 'text-foreground/70' : 'text-[#666666]',
                  )}>
                  {isCreating
                    ? `This will create a separate billing account for ${org.name}`
                    : `Add credits to ${org.name}'s billing account`}
                </p>

                <div className='mb-6'>
                  <label
                    className={cn(
                      'mb-2 block text-[11px] font-semibold uppercase tracking-wider',
                      isDark ? 'text-foreground/60' : 'text-[#666666]',
                    )}>
                    Amount
                  </label>
                  <Input
                    type='number'
                    placeholder='Enter amount'
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    variant='surface'
                    isDark={isDark}
                    iconLeft={<RiMoneyDollarCircleLine className='h-4 w-4' />}
                    autoFocus
                  />
                </div>

                <div className='flex gap-2'>
                  <Button
                    variant='secondary'
                    size='medium'
                    onClick={() => {
                      setShowBalanceDialog(false)
                      setAddCreditsAmount(0)
                      setInitialBalanceAmount(100)
                    }}
                    className='flex-1'>
                    Cancel
                  </Button>
                  <Button
                    variant='active'
                    size='medium'
                    className='flex-1'
                    disabled={!amount || amount <= 0}
                    loading={isProcessing}
                    onClick={async () => {
                      if (isCreating) {
                        await handleCreateBillingAccount(org.id, amount)
                      } else {
                        await handlePurchaseCredits(amount, org.id)
                      }
                      setShowBalanceDialog(false)
                      setAddCreditsAmount(0)
                      setInitialBalanceAmount(100)
                    }}
                    iconRight={<RiAddLine className='h-4 w-4' />}>
                    Add credits
                  </Button>
                </div>
              </m.div>
            </m.div>
          )
        })()}
    </m.div>
  )
}
