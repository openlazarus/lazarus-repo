/**
 * Task Result Tool
 *
 * Provides a tool for agents to explicitly declare whether their task
 * succeeded or failed. This is the authoritative source for execution
 * status — the agent has full context to make this determination.
 *
 * The executor reads the declared status after the conversation ends.
 */

/**
 * In-memory store for task results, keyed by executionId.
 * The executor reads and clears entries after each execution.
 */
const taskResults = new Map<string, { status: 'completed' | 'failed'; error?: string }>()

/**
 * Get the declared task result for an execution, then clear it.
 */
export function consumeTaskResult(
  executionId: string,
): { status: 'completed' | 'failed'; error?: string } | undefined {
  const result = taskResults.get(executionId)
  if (result) {
    taskResults.delete(executionId)
  }
  return result
}

// Disabled: the SDK's result message (subtype: success/error) is the authoritative
// completion signal. The task_result tool is no longer needed.
// export const taskResultToolsServer = createSdkMcpServer({
//   name: 'task-result-tools',
//   version: '1.0.0',
//   tools: [
//     tool(
//       'task_result',
//       'REQUIRED: Call this tool at the end of every task to report whether you completed it successfully or failed. ' +
//       'Use status "completed" when the task was accomplished. ' +
//       'Use status "failed" when you could not accomplish the task (e.g. a required tool call failed and you could not recover).',
//       {
//         status: z.enum(['completed', 'failed']).describe('Whether the task was completed successfully or failed'),
//         error: z.string().optional().describe('If failed, a brief description of what went wrong'),
//       },
//       async (args) => {
//         const ctx = getExecutionContext();
//         const executionId = ctx.executionId;
//
//         if (!executionId) {
//           return {
//             content: [{ type: 'text' as const, text: JSON.stringify({ success: true, message: 'Task result recorded (no execution context)' }) }],
//           };
//         }
//
//         taskResults.set(executionId, {
//           status: args.status,
//           error: args.error,
//         });
//
//         console.log(`[TaskResultTool] Execution ${executionId}: status=${args.status}${args.error ? `, error=${args.error}` : ''}`);
//
//         return {
//           content: [{ type: 'text' as const, text: JSON.stringify({ success: true, message: `Task result recorded: ${args.status}` }) }],
//         };
//       }
//     ),
//   ],
// });
