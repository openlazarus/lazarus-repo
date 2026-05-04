import fs from 'node:fs'
import path from 'node:path'
import { MCPServerConfig, MCPAuthType, MCPOAuthConfig } from '@shared/types/index'

// Walks up from this module's location to find the api package root.
// Works whether we're running via tsx (src/...) or node (dist/...),
// so the resolved in-repo MCP server paths always land in dist/mcp/.
const findPackageRoot = (from: string): string => {
  let dir = from
  while (!fs.existsSync(path.join(dir, 'package.json'))) {
    const parent = path.dirname(dir)
    if (parent === dir) {
      throw new Error('Could not locate lazarus-api package root from ' + from)
    }
    dir = parent
  }
  return dir
}

const MCP_SERVERS_DIR = path.join(findPackageRoot(__dirname), 'dist', 'mcp')
const resolveInRepoMcpServer = (filename: string) => path.join(MCP_SERVERS_DIR, filename)

const GIVEBUTTER_MCP_SERVER = resolveInRepoMcpServer('givebutter-mcp-server.js')
const MYSQL_MCP_SERVER = require.resolve('@benborla29/mcp-server-mysql/dist/index.js')

// Path to the analytics-mcp Python binary (installed via pipx). Override with
// ANALYTICS_MCP_BIN if you've installed it somewhere other than the default.
const ANALYTICS_MCP_BIN = process.env.ANALYTICS_MCP_BIN || 'analytics-mcp'

export interface EnvVariable {
  required: boolean
  secure: boolean
  type?: 'text' | 'file'
  placeholder?: string
  validation?: string
  description?: string
  min_length?: number
  max_length?: number
}

export interface MCPPreset {
  id?: string
  name: string
  description: string
  icon: string
  category: string
  command: string
  args: string[]
  transport?: 'stdio' | 'http' | 'sse'
  env_schema: Record<string, EnvVariable>
  // Legacy field for mcp-enhanced.ts compatibility (uses different field naming convention)
  envSchema?: Record<string, any>
  config?: MCPServerConfig
  // OAuth/Authentication configuration
  authType?: MCPAuthType
  oauth?: MCPOAuthConfig
  // Human-readable auth instructions
  authInstructions?: string
  // When true, the preset is rendered as "Coming soon" in the Add Tool picker
  // and cannot be installed by new workspaces. Workspaces that already have
  // this preset installed (entry exists in their .mcp.config.json) keep using
  // it normally — this flag only gates new installs.
  comingSoon?: boolean
}

/**
 * Available MCP categories for organizing presets
 */
export const MCP_CATEGORIES = [
  'analytics',
  'database',
  'developer',
  'ecommerce',
  'communication',
  'storage',
  'search',
  'utility',
  'cloud',
] as const

export type MCPCategory = (typeof MCP_CATEGORIES)[number]

/**
 * MCP Server Presets - Pre-configured popular MCP servers
 * Users only need to provide credentials to use these
 */
export const MCP_PRESETS: Record<string, MCPPreset> = {
  'google-analytics': {
    name: 'Google Analytics',
    icon: 'chart-bar',
    category: 'analytics',
    // analytics-mcp requires Python 3.10+ (install via `pipx install analytics-mcp`).
    // The binary path is resolved from $PATH; override with ANALYTICS_MCP_BIN.
    command: ANALYTICS_MCP_BIN,
    args: [],
    transport: 'stdio',
    description:
      'Connect to Google Analytics to query reports, metrics, and dimensions using the GA4 Admin and Data APIs',
    env_schema: {
      GOOGLE_APPLICATION_CREDENTIALS: {
        required: true,
        secure: true,
        type: 'file',
        description: 'Google Cloud service account JSON file with Analytics API access',
        placeholder: 'Upload your service account credentials',
      },
      GOOGLE_PROJECT_ID: {
        required: true,
        secure: false,
        type: 'text',
        description: 'Your Google Cloud project ID',
        placeholder: 'my-project-123',
        validation: '^[a-z][a-z0-9-]{4,28}[a-z0-9]$',
        min_length: 6,
        max_length: 30,
      },
    },
    // Legacy fields for mcp-enhanced.ts compatibility (uses EnvSchema interface from mcp-enhanced.ts)
    envSchema: {
      GOOGLE_APPLICATION_CREDENTIALS: {
        required: true,
        sensitive: true,
        description: 'Google Cloud service account JSON file with Analytics API access',
        placeholder: 'path/to/credentials.json',
      },
      GOOGLE_PROJECT_ID: {
        required: true,
        description: 'Your Google Cloud project ID',
        placeholder: 'my-project-123',
        validation: '^[a-z][a-z0-9-]{4,28}[a-z0-9]$',
        minLength: 6,
        maxLength: 30,
      },
    },
    config: {
      command: ANALYTICS_MCP_BIN,
      args: [],
      env: {},
    },
  },

  'shopify-dev': {
    name: 'Shopify Dev',
    icon: 'shopping-cart',
    category: 'developer',
    // Shopify Dev MCP - search docs, explore API schemas, build Functions
    // https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/additional-sdks-and-tools/mcp
    command: 'npx',
    args: ['-y', '@shopify/dev-mcp@latest'],
    transport: 'stdio',
    description:
      'Connect to Shopify development resources - search docs, explore API schemas, build Functions, and get guidance on Shopify APIs',
    env_schema: {
      // No required env vars - Shopify Dev MCP works without authentication
      // Optional: OPT_OUT_INSTRUMENTATION to disable telemetry
    },
    envSchema: {},
    config: {
      command: 'npx',
      args: ['-y', '@shopify/dev-mcp@latest'],
      env: {},
    },
  },

  supabase: {
    name: 'Supabase',
    icon: 'database',
    category: 'database',
    // Supabase MCP - connect AI tools to Supabase projects
    // Uses @supabase/mcp-server-supabase package for direct Supabase access
    // Requires Personal Access Token from https://supabase.com/dashboard/account/tokens
    // Docs: https://supabase.com/docs/guides/getting-started/mcp
    command: 'npx',
    // --features excludes `docs` because that feature group calls the Supabase
    // Content API which currently returns a response shape the MCP package
    // can't parse, making `tools/list` fail and dropping ALL supabase tools
    // from the agent. See TODO.md #5.
    args: [
      '-y',
      '@supabase/mcp-server-supabase@latest',
      '--features=account,branching,database,debugging,development,functions,storage',
    ],
    transport: 'stdio',
    description:
      'Connect to Supabase to query databases, manage tables, and interact with your Supabase projects using natural language',
    env_schema: {
      SUPABASE_ACCESS_TOKEN: {
        required: true,
        secure: true,
        type: 'text',
        description:
          'Supabase Personal Access Token. Get it from https://supabase.com/dashboard/account/tokens',
        placeholder: 'sbp_xxxxxxxxxxxx',
      },
      SUPABASE_PROJECT_REF: {
        required: false,
        secure: false,
        type: 'text',
        description: 'Optional: Scope to a specific project. Leave empty to access all projects.',
        placeholder: 'your-project-ref',
      },
    },
    envSchema: {
      SUPABASE_ACCESS_TOKEN: {
        required: true,
        sensitive: true,
        description:
          'Supabase Personal Access Token from https://supabase.com/dashboard/account/tokens',
        placeholder: 'sbp_xxxxxxxxxxxx',
      },
      SUPABASE_PROJECT_REF: {
        required: false,
        description: 'Optional: Scope to a specific project reference',
        placeholder: 'your-project-ref',
      },
    },
    config: {
      command: 'npx',
      // --features excludes `docs` because that feature group calls the Supabase
      // Content API which currently returns a response shape the MCP package
      // can't parse, making `tools/list` fail and dropping ALL supabase tools
      // from the agent. See TODO.md #5.
      args: [
        '-y',
        '@supabase/mcp-server-supabase@latest',
        '--features=account,branching,database,debugging,development,functions,storage',
      ],
      env: {},
    },
  },

  atlassian: {
    name: 'Atlassian (Jira, Confluence, Compass)',
    icon: 'briefcase',
    category: 'developer',
    // Atlassian Rovo MCP Server - connect to Jira, Confluence, and Compass
    // Uses remote MCP via SSE - connects to https://mcp.atlassian.com/v1/sse
    // Authentication happens via browser OAuth 2.1 flow when first connected
    // https://support.atlassian.com/organization-administration/docs/getting-started-with-the-atlassian-rovo-mcp-server/
    command: 'npx',
    args: ['-y', 'mcp-remote@latest', 'https://mcp.atlassian.com/v1/sse'],
    transport: 'stdio',
    description:
      'Connect to Atlassian Cloud to search, create, and update Jira issues, Confluence pages, and Compass components using natural language',
    env_schema: {
      // No required env vars - Atlassian uses browser-based OAuth 2.1 authentication
      // Access is controlled by user permissions in Atlassian Cloud
    },
    envSchema: {},
    config: {
      command: 'npx',
      args: ['-y', 'mcp-remote@latest', 'https://mcp.atlassian.com/v1/sse'],
      env: {},
    },
    // OAuth configuration
    authType: 'oauth',
    oauth: {
      remoteUrl: 'https://mcp.atlassian.com/v1/sse',
    },
    authInstructions:
      'Click the authorization link below to connect your Atlassian account. You will be redirected to Atlassian to grant access.',
  },

  linear: {
    name: 'Linear',
    icon: 'clipboard-list',
    category: 'developer',
    // Linear MCP Server - connect to Linear for issue tracking
    // Uses mcp-server-linear package with Personal API Key authentication
    // Pinned to v1.6.0 for stability
    // IMPORTANT: mcp-server-linear uses LINEAR_ACCESS_TOKEN (not LINEAR_API_KEY)
    // Get API key from: Linear Settings → Security & access → Personal API keys
    // https://github.com/modelcontextprotocol/servers/tree/main/src/linear
    command: 'npx',
    args: ['-y', 'mcp-server-linear@1.6.0'],
    transport: 'stdio',
    description:
      'Connect to Linear to find, create, and update issues, projects, and comments using natural language',
    env_schema: {
      LINEAR_ACCESS_TOKEN: {
        required: true,
        secure: true,
        type: 'text',
        description:
          'Linear Personal API Key. Get it from Linear Settings → Security & access → Personal API keys',
        placeholder: 'lin_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
    },
    envSchema: {
      LINEAR_ACCESS_TOKEN: {
        required: true,
        sensitive: true,
        description:
          'Linear Personal API Key from Settings → Security & access → Personal API keys',
        placeholder: 'lin_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
    },
    config: {
      command: 'npx',
      args: ['-y', 'mcp-server-linear@1.6.0'],
      env: {},
    },
  },

  hubspot: {
    name: 'HubSpot CRM',
    icon: 'users',
    category: 'communication',
    // HubSpot MCP Server - connect to HubSpot CRM data
    // Uses remote MCP via HTTP - connects to https://mcp.hubspot.com/
    // Requires OAuth access token and client ID from a HubSpot app installation
    // https://developers.hubspot.com/docs/guides/apps/build-apps/hubspot-mcp-server
    command: 'npx',
    args: ['-y', 'mcp-remote', 'https://mcp.hubspot.com/'],
    transport: 'stdio',
    description:
      'Connect to HubSpot CRM to query contacts, companies, deals, tickets, and other CRM objects using natural language',
    env_schema: {
      HUBSPOT_ACCESS_TOKEN: {
        required: true,
        secure: true,
        type: 'text',
        description: 'HubSpot OAuth access token from your installed HubSpot app',
        placeholder: 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      },
      HUBSPOT_CLIENT_ID: {
        required: true,
        secure: false,
        type: 'text',
        description: "Your HubSpot app's client ID",
        placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      },
    },
    envSchema: {
      HUBSPOT_ACCESS_TOKEN: {
        required: true,
        sensitive: true,
        description: 'HubSpot OAuth access token from your installed HubSpot app',
        placeholder: 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      },
      HUBSPOT_CLIENT_ID: {
        required: true,
        description: "Your HubSpot app's client ID",
        placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      },
    },
    config: {
      command: 'npx',
      args: ['-y', 'mcp-remote', 'https://mcp.hubspot.com/'],
      env: {},
    },
  },

  notion: {
    name: 'Notion',
    icon: 'file-text',
    category: 'developer',
    // Notion MCP Server - connect to Notion workspaces
    // Uses remote MCP via HTTP - connects to https://mcp.notion.com/mcp
    // Authentication happens via browser OAuth flow when first connected
    // https://developers.notion.com/docs/ai/mcp
    command: 'npx',
    args: ['-y', 'mcp-remote', 'https://mcp.notion.com/mcp'],
    transport: 'stdio',
    description:
      'Connect to Notion to access pages, databases, and comments from your workspace using natural language',
    env_schema: {
      // No required env vars - Notion uses browser-based OAuth authentication
      // Access is controlled by user permissions in Notion workspace
    },
    envSchema: {},
    config: {
      command: 'npx',
      args: ['-y', 'mcp-remote', 'https://mcp.notion.com/mcp'],
      env: {},
    },
    // OAuth configuration
    authType: 'oauth',
    oauth: {
      remoteUrl: 'https://mcp.notion.com/mcp',
    },
    authInstructions:
      'Click the authorization link below to connect your Notion workspace. You will be redirected to Notion to grant access to your pages and databases.',
  },

  github: {
    name: 'GitHub',
    icon: 'github',
    category: 'developer',
    // GitHub MCP Server - repository management, file operations, issues, PRs
    // https://www.npmjs.com/package/@modelcontextprotocol/server-github
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    transport: 'stdio',
    description:
      'Connect to GitHub for repository management, issues, pull requests, and code search',
    env_schema: {
      GITHUB_PERSONAL_ACCESS_TOKEN: {
        required: true,
        secure: true,
        type: 'text',
        description: 'GitHub Personal Access Token with repo access',
        placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
    },
    envSchema: {
      GITHUB_PERSONAL_ACCESS_TOKEN: {
        required: true,
        sensitive: true,
        description: 'GitHub Personal Access Token with repo access',
        placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
    },
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: {},
    },
  },

  slack: {
    name: 'Slack',
    icon: 'message-square',
    category: 'communication',
    // Slack MCP Server - workspace communication
    // https://www.npmjs.com/package/@modelcontextprotocol/server-slack
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    transport: 'stdio',
    description:
      'Connect to Slack workspaces to read channels, messages, and interact with your team',
    env_schema: {
      SLACK_BOT_TOKEN: {
        required: true,
        secure: true,
        type: 'text',
        description: 'Slack Bot Token (xoxb-...)',
        placeholder: 'xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx',
      },
      SLACK_TEAM_ID: {
        required: true,
        secure: false,
        type: 'text',
        description: 'Slack Team/Workspace ID',
        placeholder: 'T01234567',
      },
      SLACK_CHANNEL_IDS: {
        required: false,
        secure: false,
        type: 'text',
        description: 'Optional: Comma-separated channel IDs to limit access',
        placeholder: 'C01234567,C76543210',
      },
    },
    envSchema: {
      SLACK_BOT_TOKEN: {
        required: true,
        sensitive: true,
        description: 'Slack Bot Token (xoxb-...)',
        placeholder: 'xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx',
      },
      SLACK_TEAM_ID: {
        required: true,
        description: 'Slack Team/Workspace ID',
        placeholder: 'T01234567',
      },
      SLACK_CHANNEL_IDS: {
        required: false,
        description: 'Optional: Comma-separated channel IDs to limit access',
        placeholder: 'C01234567,C76543210',
      },
    },
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-slack'],
      env: {},
    },
  },

  stripe: {
    name: 'Stripe',
    icon: 'credit-card',
    category: 'ecommerce',
    // Stripe MCP Server - payments, customers, subscriptions
    // https://docs.stripe.com/mcp
    command: 'npx',
    args: ['-y', '@stripe/mcp', '--tools=all'],
    transport: 'stdio',
    description:
      'Connect to Stripe to manage payments, customers, subscriptions, and search documentation',
    env_schema: {
      STRIPE_SECRET_KEY: {
        required: true,
        secure: true,
        type: 'text',
        description: 'Stripe Secret Key (use restricted keys for production)',
        placeholder: 'sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
    },
    envSchema: {
      STRIPE_SECRET_KEY: {
        required: true,
        sensitive: true,
        description: 'Stripe Secret Key (use restricted keys for production)',
        placeholder: 'sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
    },
    config: {
      command: 'npx',
      args: ['-y', '@stripe/mcp', '--tools=all'],
      env: {},
    },
  },

  postgres: {
    name: 'PostgreSQL',
    icon: 'database',
    category: 'database',
    // PostgreSQL MCP Server - database inspection and read-only queries
    // https://www.npmjs.com/package/@modelcontextprotocol/server-postgres
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    transport: 'stdio',
    description: 'Connect to PostgreSQL databases to inspect schemas and execute read-only queries',
    env_schema: {
      POSTGRES_CONNECTION_STRING: {
        required: true,
        secure: true,
        type: 'text',
        description: 'PostgreSQL connection string (read-only access recommended)',
        placeholder: 'postgresql://user:password@localhost:5432/database',
      },
    },
    envSchema: {
      POSTGRES_CONNECTION_STRING: {
        required: true,
        sensitive: true,
        description: 'PostgreSQL connection string (read-only access recommended)',
        placeholder: 'postgresql://user:password@localhost:5432/database',
      },
    },
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres'],
      env: {},
    },
  },

  'google-drive': {
    name: 'Google Drive',
    icon: 'hard-drive',
    category: 'storage',
    // Google Drive MCP Server - file access and search
    // https://www.npmjs.com/package/@modelcontextprotocol/server-gdrive
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-gdrive'],
    transport: 'stdio',
    description:
      'Connect to Google Drive to list, read, and search files including Docs, Sheets, and Slides',
    env_schema: {
      GDRIVE_CREDENTIALS_PATH: {
        required: false,
        secure: true,
        type: 'file',
        description: 'Google Cloud OAuth credentials JSON file',
        placeholder: 'Upload your OAuth credentials',
      },
    },
    envSchema: {
      GDRIVE_CREDENTIALS_PATH: {
        required: false,
        sensitive: true,
        description: 'Google Cloud OAuth credentials JSON file',
        placeholder: 'path/to/credentials.json',
      },
    },
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-gdrive'],
      env: {},
    },
  },

  asana: {
    name: 'Asana',
    icon: 'check-square',
    category: 'developer',
    // Asana MCP Server - project and task management
    // https://www.npmjs.com/package/@roychri/mcp-server-asana
    command: 'npx',
    args: ['-y', '@roychri/mcp-server-asana'],
    transport: 'stdio',
    description:
      'Connect to Asana for project and task management - create, update, and list tasks and projects',
    env_schema: {
      ASANA_ACCESS_TOKEN: {
        required: true,
        secure: true,
        type: 'text',
        description: 'Asana Personal Access Token',
        placeholder: '1/xxxxxxxxxxxxxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
      ASANA_DEFAULT_WORKSPACE_ID: {
        required: false,
        secure: false,
        type: 'text',
        description: 'Optional: Default workspace ID to avoid specifying for each call',
        placeholder: '1234567890123456',
      },
    },
    envSchema: {
      ASANA_ACCESS_TOKEN: {
        required: true,
        sensitive: true,
        description: 'Asana Personal Access Token',
        placeholder: '1/xxxxxxxxxxxxxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
      ASANA_DEFAULT_WORKSPACE_ID: {
        required: false,
        description: 'Optional: Default workspace ID',
        placeholder: '1234567890123456',
      },
    },
    config: {
      command: 'npx',
      args: ['-y', '@roychri/mcp-server-asana'],
      env: {},
    },
  },

  sentry: {
    name: 'Sentry',
    icon: 'alert-triangle',
    category: 'developer',
    // Sentry MCP Server - error tracking and issue analysis
    // Uses remote MCP via HTTPS - connects to https://mcp.sentry.dev/mcp
    // Authentication happens via browser OAuth flow when first connected
    // https://docs.sentry.io/product/sentry-mcp/
    command: 'npx',
    args: ['-y', 'mcp-remote@latest', 'https://mcp.sentry.dev/mcp'],
    transport: 'stdio',
    description:
      'Connect to Sentry for error tracking, issue analysis, and AI-powered root cause analysis with Seer',
    env_schema: {
      // No required env vars - Sentry uses browser-based OAuth authentication
    },
    envSchema: {},
    config: {
      command: 'npx',
      args: ['-y', 'mcp-remote@latest', 'https://mcp.sentry.dev/mcp'],
      env: {},
    },
    // OAuth configuration
    authType: 'oauth',
    oauth: {
      remoteUrl: 'https://mcp.sentry.dev/mcp',
    },
    authInstructions:
      'Click the authorization link below to connect your Sentry account. You will be redirected to Sentry to grant access to your projects and issues.',
  },

  figma: {
    name: 'Figma',
    icon: 'pen-tool',
    category: 'developer',
    // Figma MCP Server - design-to-code workflows
    // https://www.npmjs.com/package/figma-developer-mcp
    command: 'npx',
    args: ['-y', 'figma-developer-mcp'],
    transport: 'stdio',
    description:
      'Connect to Figma for design-to-code workflows - access files, components, and styles',
    env_schema: {
      FIGMA_API_KEY: {
        required: true,
        secure: true,
        type: 'text',
        description: 'Figma Personal Access Token',
        placeholder: 'figd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
    },
    envSchema: {
      FIGMA_API_KEY: {
        required: true,
        sensitive: true,
        description: 'Figma Personal Access Token',
        placeholder: 'figd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
    },
    config: {
      command: 'npx',
      args: ['-y', 'figma-developer-mcp'],
      env: {},
    },
  },

  airtable: {
    name: 'Airtable',
    icon: 'table',
    category: 'database',
    // Airtable MCP Server - database/spreadsheet hybrid
    // https://www.npmjs.com/package/airtable-mcp-server
    command: 'npx',
    args: ['-y', 'airtable-mcp-server'],
    transport: 'stdio',
    description: 'Connect to Airtable to read and write bases, tables, and records',
    env_schema: {
      AIRTABLE_API_KEY: {
        required: true,
        secure: true,
        type: 'text',
        description: 'Airtable Personal Access Token',
        placeholder: 'pat123.abc123',
      },
    },
    envSchema: {
      AIRTABLE_API_KEY: {
        required: true,
        sensitive: true,
        description: 'Airtable Personal Access Token',
        placeholder: 'pat123.abc123',
      },
    },
    config: {
      command: 'npx',
      args: ['-y', 'airtable-mcp-server'],
      env: {},
    },
  },

  zendesk: {
    name: 'Zendesk',
    icon: 'headphones',
    category: 'communication',
    // Zendesk MCP Server - customer support ticket management
    // https://www.npmjs.com/package/zd-mcp-server
    command: 'npx',
    args: ['-y', 'zd-mcp-server'],
    transport: 'stdio',
    description: 'Connect to Zendesk Support to manage tickets, users, and organizations',
    env_schema: {
      ZENDESK_SUBDOMAIN: {
        required: true,
        secure: false,
        type: 'text',
        description: 'Your Zendesk subdomain (company.zendesk.com)',
        placeholder: 'your-company',
      },
      ZENDESK_EMAIL: {
        required: true,
        secure: false,
        type: 'text',
        description: 'Zendesk admin email',
        placeholder: 'admin@company.com',
      },
      ZENDESK_TOKEN: {
        required: true,
        secure: true,
        type: 'text',
        description: 'Zendesk API token',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
    },
    envSchema: {
      ZENDESK_SUBDOMAIN: {
        required: true,
        description: 'Your Zendesk subdomain (company.zendesk.com)',
        placeholder: 'your-company',
      },
      ZENDESK_EMAIL: {
        required: true,
        description: 'Zendesk admin email',
        placeholder: 'admin@company.com',
      },
      ZENDESK_TOKEN: {
        required: true,
        sensitive: true,
        description: 'Zendesk API token',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
    },
    config: {
      command: 'npx',
      args: ['-y', 'zd-mcp-server'],
      env: {},
    },
  },

  monday: {
    name: 'Monday.com',
    icon: 'calendar',
    category: 'developer',
    // Monday.com MCP Server - project management
    // https://www.npmjs.com/package/@mondaydotcomorg/monday-api-mcp
    command: 'npx',
    args: ['-y', '@mondaydotcomorg/monday-api-mcp@latest'],
    transport: 'stdio',
    description: 'Connect to Monday.com for project management - boards, items, and updates',
    env_schema: {
      MONDAY_API_TOKEN: {
        required: true,
        secure: true,
        type: 'text',
        description: 'Monday.com API token',
        placeholder: 'eyJhbGciOiJIUzI1NiJ9...',
      },
    },
    envSchema: {
      MONDAY_API_TOKEN: {
        required: true,
        sensitive: true,
        description: 'Monday.com API token',
        placeholder: 'eyJhbGciOiJIUzI1NiJ9...',
      },
    },
    config: {
      command: 'npx',
      args: ['-y', '@mondaydotcomorg/monday-api-mcp@latest'],
      env: {},
    },
  },

  datadog: {
    name: 'Datadog',
    icon: 'activity',
    category: 'developer',
    // Datadog MCP Server - monitoring and observability
    // https://www.npmjs.com/package/@winor30/mcp-server-datadog
    command: 'npx',
    args: ['-y', '@winor30/mcp-server-datadog'],
    transport: 'stdio',
    description: 'Connect to Datadog for monitoring - logs, metrics, dashboards, and incidents',
    env_schema: {
      DD_API_KEY: {
        required: true,
        secure: true,
        type: 'text',
        description: 'Datadog API Key',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
      DD_APP_KEY: {
        required: true,
        secure: true,
        type: 'text',
        description: 'Datadog Application Key',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
      DD_SITE: {
        required: false,
        secure: false,
        type: 'text',
        description: 'Datadog site (default: datadoghq.com)',
        placeholder: 'datadoghq.com',
      },
    },
    envSchema: {
      DD_API_KEY: {
        required: true,
        sensitive: true,
        description: 'Datadog API Key',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
      DD_APP_KEY: {
        required: true,
        sensitive: true,
        description: 'Datadog Application Key',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
      DD_SITE: {
        required: false,
        description: 'Datadog site (default: datadoghq.com)',
        placeholder: 'datadoghq.com',
      },
    },
    config: {
      command: 'npx',
      args: ['-y', '@winor30/mcp-server-datadog'],
      env: {},
    },
  },

  twilio: {
    name: 'Twilio',
    icon: 'phone',
    category: 'communication',
    // Twilio MCP Server - SMS messaging
    // https://www.npmjs.com/package/@deshartman/twilio-messaging-mcp-server
    command: 'npx',
    args: ['-y', '@deshartman/twilio-messaging-mcp-server'],
    transport: 'stdio',
    description: 'Send SMS messages via Twilio API',
    env_schema: {
      TWILIO_ACCOUNT_SID: {
        required: true,
        secure: false,
        type: 'text',
        description: 'Twilio Account SID',
        placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
      TWILIO_API_KEY: {
        required: true,
        secure: true,
        type: 'text',
        description: 'Twilio API Key',
        placeholder: 'SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
      TWILIO_API_SECRET: {
        required: true,
        secure: true,
        type: 'text',
        description: 'Twilio API Secret',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
      TWILIO_PHONE_NUMBER: {
        required: true,
        secure: false,
        type: 'text',
        description: 'Twilio phone number to send from',
        placeholder: '+12345678901',
      },
    },
    envSchema: {
      TWILIO_ACCOUNT_SID: {
        required: true,
        description: 'Twilio Account SID',
        placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
      TWILIO_API_KEY: {
        required: true,
        sensitive: true,
        description: 'Twilio API Key',
        placeholder: 'SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
      TWILIO_API_SECRET: {
        required: true,
        sensitive: true,
        description: 'Twilio API Secret',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
      TWILIO_PHONE_NUMBER: {
        required: true,
        description: 'Twilio phone number to send from',
        placeholder: '+12345678901',
      },
    },
    config: {
      command: 'npx',
      args: ['-y', '@deshartman/twilio-messaging-mcp-server'],
      env: {},
    },
  },

  dropbox: {
    name: 'Dropbox',
    icon: 'box',
    category: 'storage',
    // Dropbox MCP Server - cloud file storage
    // https://www.npmjs.com/package/@microagents/mcp-server-dropbox
    command: 'npx',
    args: ['-y', '@microagents/mcp-server-dropbox'],
    transport: 'stdio',
    description: 'Connect to Dropbox for cloud file storage - list, upload, and download files',
    env_schema: {
      DROPBOX_ACCESS_TOKEN: {
        required: true,
        secure: true,
        type: 'text',
        description: 'Dropbox access token',
        placeholder: 'sl.xxxxxxxxxxxxxxxxxxxxx',
      },
    },
    envSchema: {
      DROPBOX_ACCESS_TOKEN: {
        required: true,
        sensitive: true,
        description: 'Dropbox access token',
        placeholder: 'sl.xxxxxxxxxxxxxxxxxxxxx',
      },
    },
    config: {
      command: 'npx',
      args: ['-y', '@microagents/mcp-server-dropbox'],
      env: {},
    },
  },

  mysql: {
    name: 'MySQL',
    icon: 'database',
    category: 'database',
    // MySQL MCP Server - database queries and schema inspection
    // https://www.npmjs.com/package/@benborla29/mcp-server-mysql
    // IMPORTANT: This package uses MYSQL_HOST/MYSQL_USER/MYSQL_PASS/MYSQL_DB/MYSQL_SSL env vars
    // (NOT DB_HOST/DB_USER/DB_PASSWORD etc.) - see dist/src/config/index.js
    // Resolved from the api package's node_modules/ — no global install or npx cold start.
    command: 'node',
    args: [MYSQL_MCP_SERVER],
    transport: 'stdio',
    description: 'Connect to MySQL databases to inspect schemas and execute queries',
    env_schema: {
      MYSQL_HOST: {
        required: true,
        secure: false,
        type: 'text',
        description: 'MySQL server hostname',
        placeholder: 'localhost',
      },
      MYSQL_PORT: {
        required: false,
        secure: false,
        type: 'text',
        description: 'MySQL server port (default: 3306)',
        placeholder: '3306',
      },
      MYSQL_USER: {
        required: true,
        secure: false,
        type: 'text',
        description: 'MySQL username',
        placeholder: 'root',
      },
      MYSQL_PASS: {
        required: true,
        secure: true,
        type: 'text',
        description: 'MySQL password',
        placeholder: 'your-password',
      },
      MYSQL_DB: {
        required: true,
        secure: false,
        type: 'text',
        description: 'MySQL database name',
        placeholder: 'my_database',
      },
      MYSQL_SSL: {
        required: false,
        secure: false,
        type: 'text',
        description: 'Enable SSL connection (true/false)',
        placeholder: 'false',
      },
    },
    envSchema: {
      MYSQL_HOST: {
        required: true,
        description: 'MySQL server hostname',
        placeholder: 'localhost',
      },
      MYSQL_PORT: {
        required: false,
        description: 'MySQL server port (default: 3306)',
        placeholder: '3306',
      },
      MYSQL_USER: {
        required: true,
        description: 'MySQL username',
        placeholder: 'root',
      },
      MYSQL_PASS: {
        required: true,
        sensitive: true,
        description: 'MySQL password',
        placeholder: 'your-password',
      },
      MYSQL_DB: {
        required: true,
        description: 'MySQL database name',
        placeholder: 'my_database',
      },
      MYSQL_SSL: {
        required: false,
        description: 'Enable SSL connection (true/false)',
        placeholder: 'false',
      },
    },
    config: {
      command: 'node',
      args: [MYSQL_MCP_SERVER],
      env: {},
    },
  },

  miro: {
    name: 'Miro',
    icon: 'layout',
    category: 'developer',
    // Miro MCP Server - whiteboard collaboration
    // Community package: @llmindset/mcp-miro (101 stars, actively maintained)
    // https://github.com/evalstate/mcp-miro
    // Features: board manipulation, sticky notes, shapes, bulk operations, frame reading
    command: 'npx',
    args: ['-y', '@llmindset/mcp-miro'],
    transport: 'stdio',
    description:
      'Connect to Miro whiteboards for visual collaboration - create sticky notes, shapes, read boards, and perform bulk operations',
    env_schema: {
      MIRO_OAUTH_TOKEN: {
        required: true,
        secure: true,
        type: 'text',
        description:
          'Miro OAuth token. Get it from Miro Developer Portal → Your apps → OAuth token',
        placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      },
    },
    envSchema: {
      MIRO_OAUTH_TOKEN: {
        required: true,
        sensitive: true,
        description: 'Miro OAuth token from Miro Developer Portal → Your apps → OAuth token',
        placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      },
    },
    config: {
      command: 'npx',
      args: ['-y', '@llmindset/mcp-miro'],
      env: {},
    },
  },

  canva: {
    name: 'Canva',
    icon: 'image',
    category: 'developer',
    // Canva MCP Server - design creation, editing, and brand asset management
    // Uses remote MCP via HTTPS - connects to https://mcp.canva.com/mcp
    //
    // Auth model: mcp.canva.com runs its own OAuth server (issuer
    // https://mcp.canva.com), separate from the Canva Connect API at api.canva.com.
    // Its /authorize endpoint enforces a hard-coded host allowlist on redirect_uri:
    // localhost (any port) and a small set of partner hosts (e.g. claude.ai) are
    // accepted; arbitrary hosts return 400 "Invalid redirect URI. It must be from
    // an allowed host." This allowlist is independent of what's accepted via DCR
    // (registration succeeds but authorization fails) and is not influenced by
    // OAuth integrations created in the Canva Developer Portal — those are for
    // the Canva Connect API, not the MCP server.
    //
    // Practical consequence: hosted server-side OAuth via this preset cannot
    // complete from api.thinklazarus.com today. End users who want Canva should
    // connect it from a local MCP client (Claude Desktop, Cursor, etc.) via
    // mcp-remote on localhost. To enable hosted use, Canva must add our host to
    // the mcp.canva.com allowlist (vendor request).
    // https://www.canva.com/help/mcp-agent-setup/
    command: 'npx',
    args: ['-y', 'mcp-remote@latest', 'https://mcp.canva.com/mcp'],
    transport: 'stdio',
    description:
      'Connect to Canva to create, edit, and manage designs, templates, and brand assets using natural language',
    env_schema: {
      // No required env vars - Canva uses browser-based OAuth authentication (DCR)
      // Each user authenticates individually with Canva
    },
    envSchema: {},
    config: {
      command: 'npx',
      args: ['-y', 'mcp-remote@latest', 'https://mcp.canva.com/mcp'],
      env: {},
    },
    authType: 'oauth',
    oauth: {
      remoteUrl: 'https://mcp.canva.com/mcp',
    },
    authInstructions:
      'Click the authorization link below to connect your Canva account. You will be redirected to Canva to grant access to your designs, templates, and brand assets.',
    // mcp.canva.com/authorize blocks api.thinklazarus.com (host allowlist enforced
    // by Canva). New workspaces can't complete OAuth from the UI today, so the
    // preset is hidden behind "Coming soon" until either Canva allowlists our
    // host or we ship a Canva Connect-based MCP server. Already-connected
    // workspaces (e.g. wellnest, redbarn) keep functioning because their tokens
    // are saved on disk and their .mcp.config.json entry is preserved.
    comingSoon: true,
  },

  givebutter: {
    name: 'Givebutter',
    icon: 'heart',
    category: 'communication',
    // Lazarus-built Givebutter MCP server — wraps the Givebutter REST API.
    // Source: src/mcp/givebutter-mcp-server.ts (built to dist/mcp/givebutter-mcp-server.js)
    // Exposes contacts, campaigns, transactions, payouts, plans, tickets, funds, tags.
    command: 'node',
    args: [GIVEBUTTER_MCP_SERVER],
    transport: 'stdio',
    description:
      'Givebutter fundraising platform — contacts, campaigns, donations, transactions, tickets, funds',
    env_schema: {
      GIVEBUTTER_API_KEY: {
        required: true,
        secure: true,
        type: 'text',
        description: 'Givebutter API key (Account Settings → Integrations → API Keys)',
        placeholder: 'gb_live_...',
      },
    },
    envSchema: {
      GIVEBUTTER_API_KEY: {
        required: true,
        sensitive: true,
        description: 'Givebutter API key from Account Settings → Integrations → API Keys',
        placeholder: 'gb_live_...',
      },
    },
    config: {
      command: 'node',
      args: [GIVEBUTTER_MCP_SERVER],
      env: {},
    },
  },
}

/**
 * Get all preset categories
 */
export function getPresetCategories(): string[] {
  const categories = new Set<string>()
  Object.values(MCP_PRESETS).forEach((preset) => {
    categories.add(preset.category)
  })
  return Array.from(categories).sort()
}

/**
 * Get a preset by ID
 */
export function getPreset(id: string): MCPPreset | undefined {
  return MCP_PRESETS[id]
}

/**
 * Get all presets as array, sorted alphabetically by display name.
 * Centralizing the sort here means any new preset added to MCP_PRESETS
 * lands in the correct position in the UI without touching the source order.
 */
export function getAllPresets(): Array<MCPPreset & { id: string }> {
  return Object.entries(MCP_PRESETS)
    .map(([id, preset]) => ({ ...preset, id }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: string): Array<MCPPreset & { id: string }> {
  return getAllPresets().filter((preset) => preset.category === category)
}
