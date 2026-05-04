import { WorkspaceSandbox } from './sandbox'

const FILE_PATH_TOOLS: Record<string, string> = {
  Read: 'file_path',
  Write: 'file_path',
  Edit: 'file_path',
  MultiEdit: 'file_path',
  NotebookEdit: 'notebook_path',
  Delete: 'path',
  LS: 'path',
  Glob: 'path',
  Grep: 'path',
}

/**
 * Extract file paths referenced in a Bash command (both absolute and relative).
 * Catches:
 *   Absolute: cat /etc/passwd, ls /opt/foo, python3 -c "open('/etc/...')"
 *   Relative: cat ../other-workspace/.env, ls ../../etc/passwd
 */
function extractPathsFromCommand(command: string): string[] {
  if (!command) return []
  const paths: string[] = []

  // Match absolute paths: /word-chars after whitespace, quotes, parens, equals, or start
  const absRegex = /(?:^|[\s"'(,=])(\/([\w.\-/]+))/g
  let match: RegExpExecArray | null
  while ((match = absRegex.exec(command)) !== null) {
    const p = match[1]
    if (p && p.length > 1 && !p.startsWith('/dev/')) {
      paths.push(p)
    }
  }

  // Match relative paths containing ../ (path traversal attempts)
  const relRegex = /(?:^|[\s"'(,=])(\.\.[\w.\-/]*)/g
  while ((match = relRegex.exec(command)) !== null) {
    const p = match[1]
    if (p && p.length > 2) {
      paths.push(p)
    }
  }

  return paths
}

export function createSandboxHook(sandbox: WorkspaceSandbox) {
  return async (input: any) => {
    const toolName = input.tool_name

    // Check file-path tools (Read, Write, Edit, Glob, Grep, etc.)
    const pathKey = FILE_PATH_TOOLS[toolName]
    const targetPath = pathKey && input.tool_input?.[pathKey]

    if (targetPath && !sandbox.isPathAllowed(targetPath)) {
      return {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: `Sandbox: "${targetPath}" is outside the workspace`,
        },
      }
    }

    // Check Bash commands for paths outside workspace (absolute and relative)
    if (toolName === 'Bash') {
      const command = input.tool_input?.command as string
      if (command) {
        const paths = extractPathsFromCommand(command)
        for (const p of paths) {
          if (!sandbox.isPathAllowed(p)) {
            return {
              hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: `Sandbox: Bash command references "${p}" which is outside the workspace`,
              },
            }
          }
        }
      }
    }

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    }
  }
}
