'use client'

import {
  ExecutingTask,
  ExecutionCard,
} from '@/components/features/activity/execution-card'
import { useStopExecution } from '@/hooks/features/agents/use-execution-control'

interface LiveExecutionCardProps {
  task: ExecutingTask
  isDark: boolean
  index: number
}

export function LiveExecutionCard({
  task,
  isDark,
  index,
}: LiveExecutionCardProps) {
  const [stop, { loading: stopping }] = useStopExecution(task.id)

  return (
    <ExecutionCard
      task={task}
      isDark={isDark}
      index={index}
      onStop={() => stop()}
      stopping={stopping}
    />
  )
}
