/**
 * Workspace Template Tools for Claude Code Agents
 *
 * These tools allow the Workspace Designer agent to show template cards
 * and apply templates during onboarding.
 */

import { tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { createLogger } from '@utils/logger'

const log = createLogger('workspace-template-tools')

/**
 * Template data structure matching the frontend TemplateCardData interface
 */
interface TemplateCardData {
  id: string
  name: string
  description: string
  category: string
  folderCount: number
  agentCount: number
  databaseCount: number
  agents: { name: string; description: string }[]
  folders: string[]
  featured?: boolean
}

/**
 * All available workspace templates
 * This mirrors the WORKSPACE_TEMPLATES from the frontend template-gallery-modal.tsx
 */
const TEMPLATES: Record<string, TemplateCardData> = {
  // ============================================
  // STARTUP TEMPLATES
  // ============================================
  'startup-plg': {
    id: 'startup-plg',
    name: 'PLG Startup',
    description:
      'Ship fast, measure everything, talk to users. Product-led growth with metrics obsession.',
    category: 'startup',
    folderCount: 8,
    agentCount: 6,
    databaseCount: 1,
    featured: true,
    folders: [
      '00-inbox',
      '01-product',
      '02-engineering',
      '03-metrics',
      '04-users',
      '05-marketing',
      '06-ops',
      '07-fundraising',
    ],
    agents: [
      {
        name: 'Shipper',
        description: 'Writes specs, PRDs, tracks launch velocity, manages roadmap',
      },
      {
        name: 'Metrics Nerd',
        description: 'Cohort analysis, funnel breakdowns, SQL queries, A/B test analysis',
      },
      {
        name: 'User Whisperer',
        description: 'Synthesizes interviews, support tickets, NPS analysis, persona building',
      },
      {
        name: 'Growth Writer',
        description: 'Blog posts, changelogs, product updates, landing page copy',
      },
      {
        name: 'Ops Bot',
        description: 'Hiring pipelines, vendor management, process docs, admin automation',
      },
      {
        name: 'Fundraise Copilot',
        description: 'Deck feedback, investor research, memo drafts, data room prep',
      },
    ],
  },
  'startup-sales-led': {
    id: 'startup-sales-led',
    name: 'B2B Sales Startup',
    description: 'Outbound → Demo → Close → Support → Expand. Full CRM and sales pipeline.',
    category: 'startup',
    folderCount: 9,
    agentCount: 6,
    databaseCount: 1,
    featured: true,
    folders: [
      '00-inbox',
      '01-pipeline',
      '02-deals',
      '03-customers',
      '04-product',
      '05-engineering',
      '06-marketing',
      '07-ops',
      '08-fundraising',
    ],
    agents: [
      {
        name: 'Prospector',
        description: 'ICP research, account mapping, outbound sequences, lead scoring',
      },
      {
        name: 'Deal Desk',
        description: 'Pre-call research, proposal drafts, pricing analysis, contract prep',
      },
      {
        name: 'CS Lead',
        description: 'Onboarding playbooks, health scores, churn analysis, expansion opps',
      },
      {
        name: 'Product PM',
        description: 'Feature requests triage, roadmap updates, specs, customer feedback',
      },
      {
        name: 'Content Engine',
        description: 'Battle cards, case studies, sales decks, competitive intel',
      },
      {
        name: 'Ops Bot',
        description: 'Contract templates, hiring pipelines, process docs, CRM maintenance',
      },
    ],
  },
  'solo-founder': {
    id: 'solo-founder',
    name: 'Solo Founder',
    description: 'You vs. the world. Do everything, faster. Minimal setup, maximum impact.',
    category: 'startup',
    folderCount: 4,
    agentCount: 4,
    databaseCount: 0,
    featured: true,
    folders: ['00-inbox', '01-building', '02-customers', '03-money'],
    agents: [
      {
        name: 'Co-founder Brain',
        description: 'Strategy sparring, prioritization, decision frameworks, rubber ducking',
      },
      {
        name: 'Customer Dev',
        description: 'Interview scripts, feedback synthesis, persona building, user research',
      },
      {
        name: 'Ops Bot',
        description: 'Automate the boring stuff - emails, scheduling, admin, bookkeeping',
      },
      {
        name: 'Pitch Coach',
        description: 'Deck reviews, investor prep, storytelling, pitch practice',
      },
    ],
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    description: 'Client work at scale. Projects, proposals, and client management.',
    category: 'startup',
    folderCount: 5,
    agentCount: 4,
    databaseCount: 1,
    folders: ['00-inbox', '01-clients', '02-projects', '03-templates', '04-biz-dev'],
    agents: [
      {
        name: 'Project Scoper',
        description: 'SOW drafts, timeline estimates, scope creep alerts, resource planning',
      },
      {
        name: 'Client Comms',
        description: 'Status updates, meeting summaries, escalation drafts, relationship mgmt',
      },
      {
        name: 'Proposal Writer',
        description: 'RFP responses, pitch decks, case study drafts, pricing proposals',
      },
      {
        name: 'QA Reviewer',
        description: 'Deliverable checklists, quality standards, feedback loops, final review',
      },
    ],
  },

  // ============================================
  // ENGINEERING TEMPLATES
  // ============================================
  'eng-team': {
    id: 'eng-team',
    name: 'Eng Team',
    description: 'Build, ship, iterate - with AI pair programming. RFCs, incidents, and docs.',
    category: 'engineering',
    folderCount: 5,
    agentCount: 4,
    databaseCount: 0,
    folders: ['00-inbox', '01-projects', '02-rfcs', '03-incidents', '04-docs'],
    agents: [
      {
        name: 'RFC Writer',
        description: 'Structure proposals, gather prior art, outline tradeoffs, design docs',
      },
      {
        name: 'Code Reviewer',
        description: 'PR reviews, security checks, perf suggestions, best practices',
      },
      {
        name: 'Incident Commander',
        description: 'Timeline creation, RCA drafts, action items, postmortem writing',
      },
      {
        name: 'Doc Writer',
        description: 'READMEs, API docs, onboarding guides, architecture diagrams',
      },
    ],
  },
  'project-management': {
    id: 'project-management',
    name: 'Project Management',
    description: 'Linear-style issue tracking with cycles, roadmaps, and team coordination.',
    category: 'engineering',
    folderCount: 8,
    agentCount: 4,
    databaseCount: 1,
    featured: true,
    folders: ['inbox', 'guides', 'planning', 'specs', 'decisions', 'reports', 'data', 'templates'],
    agents: [
      {
        name: 'Issue Triage',
        description: 'Categorize incoming issues, assign prefixes, set priority and labels',
      },
      {
        name: 'Cycle Planner',
        description: 'Plan sprints, balance workload, track capacity, manage scope',
      },
      {
        name: 'Metrics Analyst',
        description: 'Cycle time, throughput, velocity trends, burndown charts',
      },
      {
        name: 'Roadmap Coordinator',
        description: 'Dependencies, milestones, cross-team alignment, release planning',
      },
    ],
  },
  'data-team': {
    id: 'data-team',
    name: 'Data & Analytics',
    description: 'Data infrastructure with ETL, ML models, and dashboards.',
    category: 'engineering',
    folderCount: 3,
    agentCount: 4,
    databaseCount: 0,
    folders: ['pipelines', 'models', 'dashboards'],
    agents: [
      {
        name: 'Data Engineer',
        description: 'Pipeline development, data quality, ETL optimization',
      },
      {
        name: 'Data Scientist',
        description: 'ML models, experiments, statistical analysis, feature engineering',
      },
      {
        name: 'Analytics Engineer',
        description: 'Data modeling, dbt, metrics definitions, data contracts',
      },
      {
        name: 'BI Developer',
        description: 'Dashboards, reports, data visualization, stakeholder reporting',
      },
    ],
  },

  // ============================================
  // MARKETING TEMPLATES
  // ============================================
  'growth-marketing': {
    id: 'growth-marketing',
    name: 'Growth',
    description: 'Content, distribution, conversion. SEO, campaigns, and analytics.',
    category: 'marketing',
    folderCount: 5,
    agentCount: 4,
    databaseCount: 0,
    featured: true,
    folders: ['00-inbox', '01-content', '02-campaigns', '03-analytics', '04-assets'],
    agents: [
      {
        name: 'Content Writer',
        description: 'Blog posts, social threads, newsletter drafts, landing pages',
      },
      {
        name: 'SEO Strategist',
        description: 'Keyword research, content briefs, SERP analysis, technical SEO',
      },
      {
        name: 'Campaign Analyst',
        description: 'Attribution, A/B test analysis, channel performance, ROAS',
      },
      {
        name: 'Copy Editor',
        description: 'Voice consistency, headline optimization, CTAs, brand guidelines',
      },
    ],
  },

  // ============================================
  // SALES TEMPLATES
  // ============================================
  'sales-team': {
    id: 'sales-team',
    name: 'Sales Team',
    description: 'Salesforce-style CRM with pipeline, playbooks, and training.',
    category: 'sales',
    folderCount: 3,
    agentCount: 4,
    databaseCount: 1,
    folders: ['pipeline', 'playbooks', 'training'],
    agents: [
      {
        name: 'Sales Rep',
        description: 'Lead qualification, discovery calls, demo prep, follow-ups',
      },
      {
        name: 'Account Executive',
        description: 'Deal management, negotiations, contract prep, closing',
      },
      {
        name: 'Sales Engineer',
        description: 'Technical demos, POC support, integration scoping, solutions',
      },
      {
        name: 'Revenue Ops',
        description: 'Pipeline management, forecasting, territory planning, CRM hygiene',
      },
    ],
  },
  'customer-success': {
    id: 'customer-success',
    name: 'Customer Success',
    description: 'Customer support and retention. Health scores, playbooks, and renewals.',
    category: 'sales',
    folderCount: 3,
    agentCount: 4,
    databaseCount: 0,
    folders: ['accounts', 'playbooks', 'health'],
    agents: [
      {
        name: 'CS Manager',
        description: 'Account health monitoring, QBR prep, relationship management',
      },
      {
        name: 'Onboarding Specialist',
        description: 'Implementation plans, training, time-to-value tracking',
      },
      {
        name: 'Support Engineer',
        description: 'Issue resolution, escalation handling, knowledge base',
      },
      {
        name: 'Community Manager',
        description: 'Customer advocacy, NPS programs, user groups, testimonials',
      },
    ],
  },

  // ============================================
  // ENTERPRISE TEMPLATES
  // ============================================
  'enterprise-divisions': {
    id: 'enterprise-divisions',
    name: 'Enterprise',
    description: 'Multi-division structure with governance, compliance, and finance.',
    category: 'enterprise',
    folderCount: 3,
    agentCount: 5,
    databaseCount: 0,
    folders: ['strategy', 'compliance', 'finance'],
    agents: [
      {
        name: 'Strategy Advisor',
        description: 'Executive strategic insights, market analysis, M&A support',
      },
      {
        name: 'Compliance Officer',
        description: 'Regulatory monitoring, policy drafting, audit preparation',
      },
      { name: 'Operations Manager', description: 'Process optimization, vendor management, SLAs' },
      {
        name: 'Risk Analyst',
        description: 'Risk assessment, mitigation planning, security reviews',
      },
      {
        name: 'Finance Controller',
        description: 'Financial planning, budgeting, forecasting, reporting',
      },
    ],
  },
  ecommerce: {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Merchandising, CRO, and fulfillment. Product catalog and inventory.',
    category: 'enterprise',
    folderCount: 3,
    agentCount: 4,
    databaseCount: 1,
    folders: ['catalog', 'marketing', 'operations'],
    agents: [
      { name: 'Merchandiser', description: 'Product catalog, pricing strategy, seasonal planning' },
      {
        name: 'CRO Specialist',
        description: 'Conversion optimization, funnel analysis, checkout UX',
      },
      { name: 'Supply Chain', description: 'Inventory management, fulfillment, vendor relations' },
      {
        name: 'Customer Insights',
        description: 'Behavior analysis, segmentation, personalization',
      },
    ],
  },

  // ============================================
  // PRODUCT TEMPLATES
  // ============================================
  'product-team': {
    id: 'product-team',
    name: 'Product Team',
    description: 'End-to-end product development. Roadmap, research, and design.',
    category: 'startup',
    folderCount: 3,
    agentCount: 4,
    databaseCount: 0,
    folders: ['roadmap', 'research', 'design'],
    agents: [
      {
        name: 'Product Manager',
        description: 'Roadmap management, prioritization, stakeholder alignment',
      },
      {
        name: 'UX Designer',
        description: 'User experience design, wireframes, prototypes, design systems',
      },
      {
        name: 'User Researcher',
        description: 'Usability testing, interviews, surveys, insights synthesis',
      },
      {
        name: 'Data Analyst',
        description: 'Product analytics, feature adoption, user behavior analysis',
      },
    ],
  },
}

/**
 * Tool: Show Template Cards
 * Returns template data formatted for the frontend TemplateCardMessage component
 */
export const showTemplateCards = tool(
  'show_template_cards',
  "Display workspace template preview cards to the user. The frontend will render these as rich interactive cards. Use this to recommend templates based on the user's needs.",
  {
    templateIds: z
      .array(z.string())
      .describe(
        'Array of template IDs to show. Available: startup-plg, startup-sales-led, solo-founder, agency, eng-team, project-management, data-team, growth-marketing, sales-team, customer-success, enterprise-divisions, ecommerce, product-team',
      ),
  },
  async (args, _extra) => {
    log.info({ tool: 'show_template_cards', args }, 'tool called')

    const templates: TemplateCardData[] = []

    for (const templateId of args.templateIds) {
      const template = TEMPLATES[templateId]
      if (template) {
        templates.push(template)
      } else {
        log.warn({ templateId }, 'unknown template ID')
      }
    }

    if (templates.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: false,
                error: 'No valid template IDs provided',
                availableTemplates: Object.keys(TEMPLATES),
              },
              null,
              2,
            ),
          },
        ],
      }
    }

    // Return as a special format that the frontend will interpret as template cards
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              success: true,
              type: 'template_cards',
              templates,
            },
            null,
            2,
          ),
        },
      ],
    }
  },
)

/**
 * Tool: Apply Workspace Template
 * Applies a template to the current workspace (creates folders, agents, databases)
 * Note: The actual application is handled by the frontend's useApplyTemplate hook
 * This tool just confirms the selection and signals the frontend to proceed
 */
export const applyWorkspaceTemplate = tool(
  'apply_workspace_template',
  'Apply a workspace template, creating folders, agents, and databases. Call this when the user confirms they want to use a specific template.',
  {
    templateId: z
      .string()
      .describe(
        'The ID of the template to apply. Available: startup-plg, startup-sales-led, solo-founder, agency, eng-team, project-management, data-team, growth-marketing, sales-team, customer-success, enterprise-divisions, ecommerce, product-team',
      ),
    selectedAgents: z
      .array(z.string())
      .optional()
      .describe(
        'Optional: Specific agent names to include. If not provided, all template agents are created.',
      ),
  },
  async (args, _extra) => {
    log.info({ tool: 'apply_workspace_template', args }, 'tool called')

    const template = TEMPLATES[args.templateId]

    if (!template) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: false,
                error: `Unknown template ID: ${args.templateId}`,
                availableTemplates: Object.keys(TEMPLATES),
              },
              null,
              2,
            ),
          },
        ],
      }
    }

    // Determine which agents to create
    const agentsToCreate = args.selectedAgents
      ? template.agents.filter((a) => args.selectedAgents!.includes(a.name))
      : template.agents

    // Return a success response with template details
    // The frontend will use this to trigger the actual template application
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              success: true,
              type: 'template_applied',
              templateId: args.templateId,
              templateName: template.name,
              foldersToCreate: template.folders.length,
              agentsToCreate: agentsToCreate.length,
              databasesCount: template.databaseCount,
              message: `Template "${template.name}" will be applied. Creating ${template.folders.length} folders and ${agentsToCreate.length} agents${template.databaseCount > 0 ? ` and ${template.databaseCount} database${template.databaseCount > 1 ? 's' : ''}` : ''}.`,
            },
            null,
            2,
          ),
        },
      ],
    }
  },
)

/**
 * Export individual tools for direct use in agents
 */
export const workspaceTemplateTools = {
  showTemplateCards,
  applyWorkspaceTemplate,
}

/**
 * Export template data for other modules to use
 */
export const AVAILABLE_TEMPLATES = TEMPLATES

log.info(
  { tools: ['show_template_cards', 'apply_workspace_template'] },
  'workspace template tools initialized',
)
log.info({ templateIds: Object.keys(TEMPLATES) }, 'available workspace templates')
