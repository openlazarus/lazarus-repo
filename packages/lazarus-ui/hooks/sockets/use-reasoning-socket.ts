import { useCallback, useState } from 'react'

import { useWebSocket } from './use-websocket'

export type ReasoningStep = {
  step: string
  progress: number
  details?: string
}

export type ReasoningResult = {
  conclusion: string
  nextActions: string[]
  confidence: number
  supportingEvidence?: string[]
}

export type ReasoningStarted = {
  process_id: string
  context: string
}

export type ReasoningProgress = {
  process_id: string
  progress: number
  current_step: string
}

export type ReasoningChunk = {
  process_id: string
  content: string
  content_type: 'thinking' | 'analysis' | 'conclusion'
  sequence: number
}

export type ReasoningIntent = {
  process_id: string
  tool_name: string
  intent: string
  reasoning: string
}

export type ReasoningAnalysis = {
  process_id: string
  tool_call_id: string
  analysis: string
  implications: string
}

export type ReasoningToolCall = {
  process_id: string
  tool_call_id: string
  tool_name: string
  inputs: Record<string, any>
  category: string
  expected_ui_update: string
  requires_confirmation: boolean
}

export type ReasoningToolResponse = {
  process_id: string
  tool_call_id: string
  result: Record<string, any>
}

export type ReasoningFinished = {
  process_id: string
  conclusion: string
  next_actions: string[]
}

export const useReasoningSocket = () => {
  const [currentStep, setCurrentStep] = useState<ReasoningStep | null>(null)
  const [result, setResult] = useState<ReasoningResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentProcessId, setCurrentProcessId] = useState<string | null>(null)
  const [reasoningChunks, setReasoningChunks] = useState<ReasoningChunk[]>([])
  const [currentIntent, setCurrentIntent] = useState<ReasoningIntent | null>(
    null,
  )
  const [currentAnalysis, setCurrentAnalysis] =
    useState<ReasoningAnalysis | null>(null)
  const [toolCalls, setToolCalls] = useState<Record<string, ReasoningToolCall>>(
    {},
  )
  const [toolResponses, setToolResponses] = useState<
    Record<string, ReasoningToolResponse>
  >({})
  const [reasoningEvents, setReasoningEvents] = useState<any[]>([])

  const { status, connect, disconnect, sendMessage } = useWebSocket({
    messageHandlers: {
      reasoning_started: (data: ReasoningStarted) => {
        setReasoningEvents((prev) => [
          ...prev,
          { type: 'reasoning_started', data },
        ])
        setCurrentProcessId(data.process_id)
        setIsProcessing(true)
        setError(null)
        setResult(null)
        setCurrentStep(null)
        setReasoningChunks([])
        setCurrentIntent(null)
        setCurrentAnalysis(null)
        setToolCalls({})
        setToolResponses({})
      },
      reasoning_progress: (data: ReasoningProgress) => {
        setReasoningEvents((prev) => [
          ...prev,
          { type: 'reasoning_progress', data },
        ])
        setCurrentStep({
          step: data.current_step,
          progress: data.progress,
        })
      },
      reasoning_chunk: (data: ReasoningChunk) => {
        setReasoningEvents((prev) => [
          ...prev,
          { type: 'reasoning_chunk', data },
        ])
        setReasoningChunks((prev) => [...prev, data])
      },
      reasoning_intent: (data: ReasoningIntent) => {
        setReasoningEvents((prev) => [
          ...prev,
          { type: 'reasoning_intent', data },
        ])
        setCurrentIntent(data)
      },
      reasoning_analysis: (data: ReasoningAnalysis) => {
        setReasoningEvents((prev) => [
          ...prev,
          { type: 'reasoning_analysis', data },
        ])
        setCurrentAnalysis(data)
      },
      reasoning_tool_call: (data: ReasoningToolCall) => {
        setReasoningEvents((prev) => [
          ...prev,
          { type: 'reasoning_tool_call', data },
        ])
        setToolCalls((prev) => ({
          ...prev,
          [data.tool_call_id]: data,
        }))
      },
      reasoning_tool_response: (data: ReasoningToolResponse) => {
        setReasoningEvents((prev) => [
          ...prev,
          { type: 'reasoning_tool_response', data },
        ])
        setToolResponses((prev) => ({
          ...prev,
          [data.tool_call_id]: data,
        }))
      },
      reasoning_finished: (data: ReasoningFinished) => {
        setReasoningEvents((prev) => [
          ...prev,
          { type: 'reasoning_finished', data },
        ])
        setResult({
          conclusion: data.conclusion,
          nextActions: data.next_actions,
          confidence: 1, // Since this isn't provided in the new format
        })
        setIsProcessing(false)
        setCurrentStep(null)
        setCurrentProcessId(null)
      },
      reasoning_error: (data: { message: string }) => {
        setReasoningEvents((prev) => [
          ...prev,
          { type: 'reasoning_error', data },
        ])
        setError(data.message)
        setIsProcessing(false)
        setCurrentStep(null)
        setCurrentProcessId(null)
      },
    },
  })

  const startReasoning = useCallback(
    (params: {
      query: string
      context?: Record<string, any>
      options?: {
        maxSteps?: number
        timeout?: number
        requireEvidence?: boolean
      }
    }) => {
      setIsProcessing(true)
      setError(null)
      setResult(null)
      setCurrentStep(null)

      sendMessage('user_request', {
        request: 'start_reasoning',
        parameters: {
          query: params.query,
          context: params.context,
          options: params.options,
        },
      })
    },
    [sendMessage],
  )

  const cancelReasoning = useCallback(() => {
    sendMessage('user_request', {
      request: 'cancel_reasoning',
    })
    setIsProcessing(false)
    setCurrentStep(null)
  }, [sendMessage])

  const provideAdditionalContext = useCallback(
    (context: Record<string, any>) => {
      sendMessage('user_request', {
        request: 'provide_context',
        parameters: { context },
      })
    },
    [sendMessage],
  )

  return {
    status,
    error,
    currentStep,
    result,
    isProcessing,
    currentProcessId,
    reasoningChunks,
    currentIntent,
    currentAnalysis,
    toolCalls,
    toolResponses,
    connect,
    disconnect,
    startReasoning,
    cancelReasoning,
    provideAdditionalContext,
    reasoningEvents,
  }
}
