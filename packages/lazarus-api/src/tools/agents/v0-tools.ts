import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { v0 } from 'v0-sdk'
import { workspaceApiKeyService } from '@domains/workspace/service/workspace-api-keys.service'
import { v0AppsService } from '@domains/v0/service/v0-apps.service'
import { getExecutionContext } from '@domains/execution/service/execution-context'
import { createLogger } from '@utils/logger'

const log = createLogger('v0-tools')

/**
 * v0 Specialist Custom Tools
 *
 * Provides UI/UX design and v0 platform integration through Claude Agent SDK custom tools.
 * Uses the v0 SDK directly for all operations.
 *
 * IMPORTANT: These tools read agent context (workspaceId, userId) from environment
 * variables set by WorkspaceAgentExecutor. When creating a project, Lazarus API
 * credentials are automatically created and injected.
 */

/**
 * Get agent context from environment variables
 */
function getAgentContext(): { workspaceId: string; userId: string } {
  const { workspaceId, userId } = getExecutionContext()

  if (!workspaceId || !userId) {
    throw new Error(
      'Agent context not available. Missing environment variables: ' +
        `WORKSPACE_ID=${workspaceId}, USER_ID=${userId}`,
    )
  }

  return { workspaceId, userId }
}

/**
 * v0 custom tools MCP server
 *
 * Tools are accessed as:
 * - mcp__v0-tools__create_chat
 * - mcp__v0-tools__create_project
 * - mcp__v0-tools__assign_chat
 * - mcp__v0-tools__deploy
 */
export const v0Tools = [
  // Create chat tool - Create a new v0 design chat
  tool(
    'create_chat',
    'Create a new v0 chat for UI/UX design requests',
    {
      message: z
        .string()
        .describe('The design request message describing what UI/UX you want to create'),
      attachments: z
        .array(
          z.object({
            url: z.string().describe('URL to attachment (image, reference, etc.)'),
          }),
        )
        .optional()
        .describe('Optional attachments like images or references'),
    },
    async (args) => {
      try {
        const response = await v0.chats.create({
          message: args.message,
          attachments: args.attachments,
        })

        const chat = response as any

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  chat: {
                    id: chat.id,
                    name: chat.name,
                    createdAt: chat.createdAt,
                    webUrl: chat.webUrl,
                    latestVersion: chat.latestVersion
                      ? {
                          id: chat.latestVersion.id,
                          status: chat.latestVersion.status,
                          demoUrl: chat.latestVersion.demoUrl,
                          filesCount: chat.latestVersion.files?.length || 0,
                        }
                      : undefined,
                  },
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : 'Failed to create v0 chat',
                },
                null,
                2,
              ),
            },
          ],
        }
      }
    },
  ),

  // Create project tool - Create a new v0 project with auto-injected Lazarus credentials
  tool(
    'create_project',
    'Create a new v0 project for organizing and deploying designs. Lazarus API credentials are automatically configured for database access.',
    {
      name: z.string().describe('Project name'),
      description: z.string().optional().describe('Project description'),
      additionalEnvVars: z
        .array(
          z.object({
            key: z.string().describe('Environment variable name'),
            value: z.string().describe('Environment variable value'),
          }),
        )
        .optional()
        .describe(
          'Additional environment variables for the project (Lazarus credentials are auto-injected)',
        ),
      privacy: z
        .enum(['private', 'team'])
        .optional()
        .describe('Project privacy setting (private or team)'),
    },
    async (args) => {
      try {
        const { workspaceId, userId } = getAgentContext()

        // Create a Lazarus API key for this project
        const apiKey = await workspaceApiKeyService.createApiKey(workspaceId, userId, {
          name: `V0 App: ${args.name}`,
          databases: ['*'],
          operations: ['read', 'write', 'delete'],
        })

        log.info({ apiKeyId: apiKey.id, projectName: args.name }, 'Created API key for v0 project')

        // Build environment variables with Lazarus credentials
        // We set both server-side and NEXT_PUBLIC_ versions for client-side access
        // The API key is scoped to this workspace with specific permissions
        const apiUrl =
          process.env.PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:8000'
        const lazarusEnvVars = [
          // Server-side env vars (for API routes)
          { key: 'LAZARUS_API_KEY', value: apiKey.key },
          { key: 'LAZARUS_WORKSPACE_ID', value: workspaceId },
          { key: 'LAZARUS_API_URL', value: apiUrl },
          // Client-side env vars (NEXT_PUBLIC_ prefix for browser access)
          { key: 'NEXT_PUBLIC_LAZARUS_API_KEY', value: apiKey.key },
          { key: 'NEXT_PUBLIC_LAZARUS_WORKSPACE_ID', value: workspaceId },
          { key: 'NEXT_PUBLIC_LAZARUS_API_URL', value: apiUrl },
        ]

        // Merge with any additional env vars provided
        const allEnvVars = [...lazarusEnvVars, ...(args.additionalEnvVars || [])]

        // Create the v0 project with credentials
        const project = await v0.projects.create({
          name: args.name,
          description: args.description,
          environmentVariables: allEnvVars,
          privacy: args.privacy,
        })

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  project: {
                    id: project.id,
                    name: project.name,
                    description: project.description,
                    createdAt: project.createdAt,
                    webUrl: project.webUrl,
                  },
                  lazarusIntegration: {
                    apiKeyId: apiKey.id,
                    apiKeyPrefix: apiKey.keyPrefix,
                    workspaceId: workspaceId,
                    apiUrl:
                      process.env.PUBLIC_API_URL ||
                      process.env.API_BASE_URL ||
                      'http://localhost:8000',
                    note: 'Lazarus API credentials have been automatically configured. The deployed app can access workspace databases via the Lazarus REST API.',
                  },
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error) {
        log.error({ err: error }, 'Error creating v0 project')
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : 'Failed to create v0 project',
                },
                null,
                2,
              ),
            },
          ],
        }
      }
    },
  ),

  // Assign chat tool - Assign a chat to a project
  tool(
    'assign_chat',
    'Assign a v0 chat to a project for organization and deployment',
    {
      projectId: z.string().describe('The project ID to assign the chat to'),
      chatId: z.string().describe('The chat ID to assign to the project'),
    },
    async (args) => {
      try {
        const result = await v0.projects.assign({
          projectId: args.projectId,
          chatId: args.chatId,
        })

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  assigned: (result as any).assigned,
                  projectId: (result as any).id,
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error:
                    error instanceof Error ? error.message : 'Failed to assign chat to project',
                },
                null,
                2,
              ),
            },
          ],
        }
      }
    },
  ),

  // Deploy tool - Deploy a v0 project
  tool(
    'deploy',
    'Deploy a v0 project to production. The deployed app will have Lazarus API credentials configured and a .app descriptor file will be created in the workspace.',
    {
      projectId: z.string().describe('The project ID to deploy'),
      chatId: z.string().describe('The chat ID containing the design to deploy'),
      versionId: z.string().describe('The version ID to deploy'),
      appName: z
        .string()
        .optional()
        .describe('Optional app name for the .app descriptor (defaults to project name)'),
      appDescription: z.string().optional().describe('Optional app description'),
      features: z.array(z.string()).optional().describe('Optional list of app features'),
      technicalStack: z.array(z.string()).optional().describe('Optional list of technologies used'),
    },
    async (args) => {
      try {
        const { workspaceId, userId } = getAgentContext()

        // Get project details to get the name if not provided
        const project = await v0.projects.getById({ projectId: args.projectId })

        const deployment = await v0.deployments.create({
          projectId: args.projectId,
          chatId: args.chatId,
          versionId: args.versionId,
        })

        const deploymentUrl = (deployment as any).url || (deployment as any).webUrl
        const appName = args.appName || project.name || 'v0-app'

        // Create .app descriptor file in workspace
        let appDescriptor = null
        try {
          appDescriptor = await v0AppsService.createApp(userId, workspaceId, {
            name: appName,
            description: args.appDescription || project.description,
            chatId: args.chatId,
            projectId: args.projectId,
            webUrl: project.webUrl,
            features: args.features,
            technicalStack: args.technicalStack || [
              'React',
              'Next.js',
              'TypeScript',
              'Tailwind CSS',
            ],
          })

          // Update with deployment info
          await v0AppsService.updateApp(userId, workspaceId, appDescriptor.id, {
            deploymentUrl,
            deploymentStatus: 'deployed',
            deploymentPlatform: 'vercel',
            status: 'deployed',
          })

          log.info({ appDescriptorId: appDescriptor.id }, 'Created .app descriptor for deployment')
        } catch (appError) {
          log.error({ err: appError }, 'Failed to create .app descriptor')
          // Continue even if .app creation fails - deployment succeeded
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  deployment: {
                    id: deployment.id,
                    projectId: deployment.projectId,
                    url: deploymentUrl,
                    createdAt: (deployment as any).createdAt || new Date().toISOString(),
                  },
                  appDescriptor: appDescriptor
                    ? {
                        id: appDescriptor.id,
                        name: appDescriptor.name,
                        status: 'deployed',
                      }
                    : null,
                  note: 'The deployed app has Lazarus API credentials configured. It can access workspace databases via LAZARUS_API_KEY, LAZARUS_WORKSPACE_ID, and LAZARUS_API_URL environment variables.',
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : 'Failed to deploy project',
                },
                null,
                2,
              ),
            },
          ],
        }
      }
    },
  ),
]

export const v0ToolsServer = createSdkMcpServer({
  name: 'v0-tools',
  version: '1.0.0',
  tools: v0Tools,
})

export function createV0ToolsServer() {
  return createSdkMcpServer({ name: 'v0-tools', version: '1.0.0', tools: v0Tools })
}
