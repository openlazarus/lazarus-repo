'use client'

import {
  RiArrowRightLine,
  RiCheckLine,
  RiCloseLine,
  RiDatabase2Line,
  RiFlashlightLine,
  RiFolderLine,
  RiSearchLine,
  RiStackLine,
  RiUser6Fill,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import React, { useCallback, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { List } from '@/components/ui/list'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'

// Smooth Apple-like easing
const smoothEase = [0.32, 0.72, 0, 1] as const

// Template categories
const TEMPLATE_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'startup', label: 'Startup' },
  { id: 'enterprise', label: 'Enterprise' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'sales', label: 'Sales' },
  { id: 'legal', label: 'Legal' },
  { id: 'research', label: 'Research' },
  { id: 'retail', label: 'Retail' },
  { id: 'creative', label: 'Creative' },
  { id: 'operations', label: 'Operations' },
] as const

type CategoryId = (typeof TEMPLATE_CATEGORIES)[number]['id']

export interface TemplateAgent {
  name: string
  description: string
}

export interface TemplateFolderStructure {
  name: string
  children?: TemplateFolderStructure[]
  /** If true, this is a file (not a folder). Use with 'content' to create a file. */
  isFile?: boolean
  /** File content. Only used when isFile is true. */
  content?: string
}

export interface TemplateDatabaseColumn {
  name: string
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'DATETIME'
  primaryKey?: boolean
  notNull?: boolean
  unique?: boolean
  default?: string | number | null
  references?: {
    table: string
    column: string
  }
}

export interface TemplateDatabaseTable {
  name: string
  columns: TemplateDatabaseColumn[]
  indexes?: {
    name: string
    columns: string[]
    unique?: boolean
  }[]
  seedData?: Record<string, string | number | boolean | null>[]
}

export interface TemplateDatabase {
  name: string
  description: string
  tables: TemplateDatabaseTable[]
}

export interface Template {
  id: string
  name: string
  description: string
  category: CategoryId
  agents: TemplateAgent[]
  folders: TemplateFolderStructure[]
  databases?: TemplateDatabase[]
  featured?: boolean
}

// Re-export for backwards compatibility
type Agent = TemplateAgent
type FolderStructure = TemplateFolderStructure

export const WORKSPACE_TEMPLATES: Template[] = [
  // Full-stack startup templates (updated)
  {
    id: 'startup-plg',
    name: 'PLG Startup',
    description: 'Ship fast, measure everything, talk to users',
    category: 'startup',
    featured: true,
    folders: [
      { name: '00-inbox' },
      {
        name: '01-product',
        children: [
          { name: 'specs' },
          { name: 'launches' },
          { name: 'roadmap' },
        ],
      },
      {
        name: '02-engineering',
        children: [{ name: 'rfcs' }, { name: 'incidents' }, { name: 'docs' }],
      },
      {
        name: '03-metrics',
        children: [{ name: 'dashboards' }, { name: 'experiments' }],
      },
      {
        name: '04-users',
        children: [
          { name: 'calls' },
          { name: 'feedback' },
          { name: 'support' },
        ],
      },
      {
        name: '05-marketing',
        children: [{ name: 'content' }, { name: 'campaigns' }],
      },
      {
        name: '06-ops',
        children: [{ name: 'finance' }, { name: 'legal' }, { name: 'hiring' }],
      },
      {
        name: '07-fundraising',
        children: [{ name: 'deck' }, { name: 'data-room' }],
      },
    ],
    agents: [
      {
        name: 'Shipper',
        description: 'Writes specs, PRDs, tracks launch velocity',
      },
      {
        name: 'Metrics Nerd',
        description: 'Cohort analysis, funnel breakdowns, SQL queries',
      },
      {
        name: 'User Whisperer',
        description: 'Synthesizes interviews, support tickets, NPS analysis',
      },
      {
        name: 'Growth Writer',
        description: 'Blog posts, changelogs, product updates',
      },
      {
        name: 'Ops Bot',
        description: 'Hiring pipelines, vendor management, process docs',
      },
      {
        name: 'Fundraise Copilot',
        description: 'Deck feedback, investor research, memo drafts',
      },
    ],
  },
  {
    id: 'startup-sales-led',
    name: 'B2B Sales Startup',
    description: 'Outbound → Demo → Close → Support → Expand',
    category: 'startup',
    featured: true,
    folders: [
      { name: '00-inbox' },
      {
        name: '01-pipeline',
        children: [
          { name: 'outbound' },
          { name: 'inbound' },
          { name: 'partners' },
        ],
      },
      {
        name: '02-deals',
        children: [
          { name: 'active' },
          { name: 'closed-won' },
          { name: 'lost' },
        ],
      },
      {
        name: '03-customers',
        children: [
          { name: 'onboarding' },
          { name: 'support' },
          { name: 'renewals' },
        ],
      },
      {
        name: '04-product',
        children: [
          { name: 'roadmap' },
          { name: 'feedback' },
          { name: 'specs' },
        ],
      },
      {
        name: '05-engineering',
        children: [{ name: 'projects' }, { name: 'docs' }],
      },
      {
        name: '06-marketing',
        children: [
          { name: 'collateral' },
          { name: 'case-studies' },
          { name: 'events' },
        ],
      },
      {
        name: '07-ops',
        children: [{ name: 'finance' }, { name: 'legal' }, { name: 'hiring' }],
      },
      {
        name: '08-fundraising',
        children: [{ name: 'deck' }, { name: 'data-room' }],
      },
    ],
    agents: [
      {
        name: 'Prospector',
        description: 'ICP research, account mapping, outbound sequences',
      },
      {
        name: 'Deal Desk',
        description: 'Pre-call research, proposal drafts, pricing analysis',
      },
      {
        name: 'CS Lead',
        description: 'Onboarding playbooks, health scores, churn analysis',
      },
      {
        name: 'Product PM',
        description: 'Feature requests triage, roadmap updates, specs',
      },
      {
        name: 'Content Engine',
        description: 'Battle cards, case studies, sales decks',
      },
      {
        name: 'Ops Bot',
        description: 'Contract templates, hiring pipelines, process docs',
      },
    ],
  },
  // New templates
  {
    id: 'solo-founder',
    name: 'Solo Founder',
    description: 'You vs. the world. Do everything, faster.',
    category: 'startup',
    featured: true,
    folders: [
      { name: '00-inbox' },
      { name: '01-building' },
      { name: '02-customers' },
      { name: '03-money' },
    ],
    agents: [
      {
        name: 'Co-founder Brain',
        description: 'Strategy sparring, prioritization, decision frameworks',
      },
      {
        name: 'Customer Dev',
        description: 'Interview scripts, feedback synthesis, persona building',
      },
      {
        name: 'Ops Bot',
        description: 'Automate the boring stuff - emails, scheduling, admin',
      },
      {
        name: 'Pitch Coach',
        description: 'Deck reviews, investor prep, storytelling',
      },
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    description: 'Client work at scale',
    category: 'startup',
    folders: [
      { name: '00-inbox' },
      { name: '01-clients', children: [{ name: 'active' }, { name: 'past' }] },
      { name: '02-projects' },
      { name: '03-templates' },
      { name: '04-biz-dev' },
    ],
    agents: [
      {
        name: 'Project Scoper',
        description: 'SOW drafts, timeline estimates, scope creep alerts',
      },
      {
        name: 'Client Comms',
        description: 'Status updates, meeting summaries, escalation drafts',
      },
      {
        name: 'Proposal Writer',
        description: 'RFP responses, pitch decks, case study drafts',
      },
      {
        name: 'QA Reviewer',
        description:
          'Deliverable checklists, quality standards, feedback loops',
      },
    ],
  },
  // Updated team templates
  {
    id: 'eng-team',
    name: 'Eng Team',
    description: 'Build, ship, iterate - with AI pair programming',
    category: 'engineering',
    folders: [
      { name: '00-inbox' },
      {
        name: '01-projects',
        children: [{ name: 'active' }, { name: 'shipped' }],
      },
      { name: '02-rfcs' },
      {
        name: '03-incidents',
        children: [{ name: 'active' }, { name: 'postmortems' }],
      },
      {
        name: '04-docs',
        children: [{ name: 'runbooks' }, { name: 'architecture' }],
      },
    ],
    agents: [
      {
        name: 'RFC Writer',
        description: 'Structure proposals, gather prior art, outline tradeoffs',
      },
      {
        name: 'Code Reviewer',
        description: 'PR reviews, security checks, perf suggestions',
      },
      {
        name: 'Incident Commander',
        description: 'Timeline creation, RCA drafts, action items',
      },
      {
        name: 'Doc Writer',
        description: 'READMEs, API docs, onboarding guides',
      },
    ],
  },
  {
    id: 'growth-marketing',
    name: 'Growth',
    description: 'Content, distribution, conversion',
    category: 'marketing',
    featured: true,
    folders: [
      { name: '00-inbox' },
      {
        name: '01-content',
        children: [{ name: 'drafts' }, { name: 'published' }],
      },
      {
        name: '02-campaigns',
        children: [{ name: 'active' }, { name: 'archive' }],
      },
      { name: '03-analytics' },
      {
        name: '04-assets',
        children: [{ name: 'brand' }, { name: 'templates' }],
      },
    ],
    agents: [
      {
        name: 'Content Writer',
        description: 'Blog posts, social threads, newsletter drafts',
      },
      {
        name: 'SEO Strategist',
        description: 'Keyword research, content briefs, SERP analysis',
      },
      {
        name: 'Campaign Analyst',
        description: 'Attribution, A/B test analysis, channel performance',
      },
      {
        name: 'Copy Editor',
        description: 'Voice consistency, headline optimization, CTAs',
      },
    ],
  },
  // Original templates (kept)
  {
    id: 'enterprise-divisions',
    name: 'Enterprise',
    description: 'Multi-division structure with governance',
    category: 'enterprise',
    folders: [
      {
        name: 'strategy',
        children: [{ name: 'planning' }, { name: 'reports' }],
      },
      {
        name: 'compliance',
        children: [{ name: 'policies' }, { name: 'audits' }],
      },
      {
        name: 'finance',
        children: [{ name: 'budgets' }, { name: 'forecasts' }],
      },
    ],
    agents: [
      { name: 'Strategy Advisor', description: 'Executive strategic insights' },
      { name: 'Compliance Officer', description: 'Regulatory monitoring' },
      { name: 'Operations Manager', description: 'Process optimization' },
      { name: 'Risk Analyst', description: 'Risk assessment' },
      { name: 'Finance Controller', description: 'Financial planning' },
    ],
  },
  {
    id: 'sales-team',
    name: 'Sales Team',
    description: 'Sales enablement with CRM and prospecting',
    category: 'sales',
    folders: [
      { name: 'pipeline', children: [{ name: 'leads' }, { name: 'deals' }] },
      {
        name: 'playbooks',
        children: [{ name: 'discovery' }, { name: 'demo' }],
      },
      {
        name: 'training',
        children: [{ name: 'onboarding' }, { name: 'scripts' }],
      },
    ],
    agents: [
      { name: 'Sales Rep', description: 'Lead qualification' },
      { name: 'Account Executive', description: 'Deal management' },
      { name: 'Sales Engineer', description: 'Technical demos' },
      { name: 'Revenue Ops', description: 'Pipeline management' },
    ],
  },
  {
    id: 'product-team',
    name: 'Product Team',
    description: 'End-to-end product development',
    category: 'startup',
    folders: [
      { name: 'roadmap', children: [{ name: 'current' }, { name: 'backlog' }] },
      { name: 'research', children: [{ name: 'user' }, { name: 'market' }] },
      { name: 'design', children: [{ name: 'specs' }, { name: 'prototypes' }] },
    ],
    agents: [
      { name: 'Product Manager', description: 'Roadmap and prioritization' },
      { name: 'UX Designer', description: 'User experience design' },
      { name: 'User Researcher', description: 'Usability testing' },
      { name: 'Data Analyst', description: 'Product analytics' },
    ],
  },
  {
    id: 'data-team',
    name: 'Data & Analytics',
    description: 'Data infrastructure with ETL and ML',
    category: 'engineering',
    folders: [
      {
        name: 'pipelines',
        children: [{ name: 'ingestion' }, { name: 'transform' }],
      },
      {
        name: 'models',
        children: [{ name: 'production' }, { name: 'experiments' }],
      },
      {
        name: 'dashboards',
        children: [{ name: 'executive' }, { name: 'operational' }],
      },
    ],
    agents: [
      { name: 'Data Engineer', description: 'Pipeline development' },
      { name: 'Data Scientist', description: 'ML models' },
      { name: 'Analytics Engineer', description: 'Data modeling' },
      { name: 'BI Developer', description: 'Dashboards' },
    ],
  },
  {
    id: 'customer-success',
    name: 'Customer Success',
    description: 'Customer support and retention',
    category: 'sales',
    folders: [
      { name: 'accounts', children: [{ name: 'enterprise' }, { name: 'smb' }] },
      {
        name: 'playbooks',
        children: [{ name: 'onboarding' }, { name: 'renewal' }],
      },
      { name: 'health', children: [{ name: 'scores' }, { name: 'alerts' }] },
    ],
    agents: [
      { name: 'CS Manager', description: 'Account health' },
      { name: 'Onboarding Specialist', description: 'Implementation' },
      { name: 'Support Engineer', description: 'Issue resolution' },
      { name: 'Community Manager', description: 'Customer advocacy' },
    ],
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Merchandising, CRO, and fulfillment',
    category: 'enterprise',
    folders: [
      {
        name: 'catalog',
        children: [{ name: 'products' }, { name: 'categories' }],
      },
      {
        name: 'marketing',
        children: [{ name: 'promotions' }, { name: 'email' }],
      },
      {
        name: 'operations',
        children: [{ name: 'inventory' }, { name: 'shipping' }],
      },
    ],
    agents: [
      { name: 'Merchandiser', description: 'Product catalog' },
      { name: 'CRO Specialist', description: 'Conversion optimization' },
      { name: 'Supply Chain', description: 'Inventory' },
      { name: 'Customer Insights', description: 'Behavior analysis' },
    ],
  },
  // Project Management - Linear-style
  {
    id: 'project-management',
    name: 'Project Management',
    description: 'Issue tracking with cycles, roadmaps, and team coordination',
    category: 'engineering',
    featured: true,
    folders: [
      { name: 'inbox' },
      {
        name: 'guides',
        children: [
          {
            name: 'what-issue-prefixes-mean.md',
            isFile: true,
            content: `# What Issue Prefixes Mean

Issue titles use standardized prefixes to categorize work at a glance.

## Prefixes

| Prefix | Use When | Example |
|--------|----------|---------|
| **Feat:** | Adding new functionality | Feat: Add dark mode toggle |
| **Fix:** | Correcting broken behavior | Fix: Resolve login timeout |
| **Refactor:** | Restructuring without changing behavior | Refactor: Simplify auth middleware |
| **Docs:** | Updating documentation | Docs: Update API reference |
| **Chore:** | Maintenance tasks | Chore: Upgrade dependencies |
| **Test:** | Adding or updating tests | Test: Add payment flow tests |
| **Perf:** | Improving performance | Perf: Optimize image loading |
| **Style:** | Visual/UI changes only | Style: Update button colors |
| **Hotfix:** | Urgent production fixes | Hotfix: Patch security issue |

## Format

\`\`\`
[Prefix]: [Short description]
\`\`\`

Keep titles under 60 characters. Put details in the description field.
`,
          },
          {
            name: 'why-this-folder-structure.md',
            isFile: true,
            content: `# Why This Folder Structure

This workspace organizes project management artifacts by purpose.

## Folder Purposes

### inbox/
Drop zone for unsorted items. Process regularly.

### guides/
Documentation about how to use this workspace. You're reading one now.

### planning/
Forward-looking work: roadmaps, cycle planning, retrospective notes.

### specs/
Technical specifications. Subfolders track lifecycle:
- **drafts/** - Work in progress
- **active/** - Currently being implemented
- **approved/** - Signed off, ready to build

### decisions/
Architectural and process decisions. Record the "why" for future reference.

### reports/
Generated reports: velocity charts, burndown data, metrics exports.

### data/
Database files and data exports. The \`databases/\` subfolder holds SQLite files.

### templates/
Reusable templates for issues and specs.
`,
          },
          {
            name: 'where-to-find-things.md',
            isFile: true,
            content: `# Where to Find Things

Quick reference for locating workspace contents.

## Issues and Work Items
Open the **work-tracker** database in the data/databases folder.
- Current cycle issues: filter by cycle_id
- By project: filter by project_id
- By assignee: filter by assignee_id

## Planning Documents
- Current roadmap: planning/roadmaps/
- Sprint notes: planning/cycle-notes/
- Past retrospectives: planning/retrospectives/

## Technical Specs
- What's being built now: specs/active/
- Approved but not started: specs/approved/
- Work in progress: specs/drafts/

## Decisions
- Architecture decisions: decisions/architecture/
- Process decisions: decisions/process/

## Reports and Metrics
- Velocity data: reports/velocity/
- Burndown charts: reports/burndown/
- Other metrics: reports/metrics/

## Database
The work-tracker database contains:
- issues, projects, cycles, milestones
- members, labels, workflow_states
- comments and activity_log
`,
          },
          {
            name: 'how-to-create-issues.md',
            isFile: true,
            content: `# How to Create Issues

Step-by-step workflow for adding issues to the tracker.

## 1. Choose the Right Prefix

Pick based on the type of work:
- New capability? → **Feat:**
- Something broken? → **Fix:**
- Code cleanup? → **Refactor:**
- Urgent production issue? → **Hotfix:**

See "what-issue-prefixes-mean.md" for the full list.

## 2. Write a Clear Title

Format: \`[Prefix]: [What changes]\`

Good examples:
- Feat: Add export to CSV
- Fix: Prevent duplicate submissions
- Refactor: Extract validation logic

Bad examples:
- Updated stuff (no prefix, vague)
- Feat: Add the new feature for users to export data to CSV format (too long)

## 3. Set Priority

| Level | Meaning |
|-------|---------|
| Urgent (4) | Drop everything |
| High (3) | This cycle |
| Medium (2) | Soon |
| Low (1) | Eventually |
| None (0) | Unprioritized |

## 4. Assign to Cycle (Optional)

Link to a cycle if it should be completed in a specific sprint.

## 5. Add Labels

Tag with relevant areas: frontend, backend, database, security, ux.

## 6. Write Description

Include:
- What the issue solves
- Acceptance criteria
- Technical notes if relevant
`,
          },
        ],
      },
      {
        name: 'planning',
        children: [
          { name: 'roadmaps' },
          { name: 'cycle-notes' },
          { name: 'retrospectives' },
        ],
      },
      {
        name: 'specs',
        children: [
          { name: 'active' },
          { name: 'approved' },
          { name: 'drafts' },
        ],
      },
      {
        name: 'decisions',
        children: [{ name: 'architecture' }, { name: 'process' }],
      },
      {
        name: 'reports',
        children: [
          { name: 'velocity' },
          { name: 'burndown' },
          { name: 'metrics' },
        ],
      },
      {
        name: 'data',
        children: [{ name: 'databases' }, { name: 'exports' }],
      },
      {
        name: 'templates',
        children: [{ name: 'issue-templates' }, { name: 'spec-templates' }],
      },
    ],
    agents: [
      {
        name: 'Issue Triage',
        description:
          'Categorize incoming issues, assign prefixes, set priority and labels',
      },
      {
        name: 'Cycle Planner',
        description: 'Plan sprints, balance workload, track capacity',
      },
      {
        name: 'Metrics Analyst',
        description: 'Cycle time, throughput, velocity trends',
      },
      {
        name: 'Roadmap Coordinator',
        description: 'Dependencies, milestones, cross-team alignment',
      },
    ],
    databases: [
      {
        name: 'work-tracker',
        description:
          'Issue tracking with standardized prefixes, cycles, and workflow states',
        tables: [
          // Issue prefixes lookup table
          {
            name: 'issue_prefixes',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              { name: 'prefix', type: 'TEXT', notNull: true, unique: true },
              { name: 'name', type: 'TEXT', notNull: true },
              { name: 'description', type: 'TEXT' },
              { name: 'color', type: 'TEXT' },
              { name: 'sort_order', type: 'INTEGER', default: 0 },
            ],
            seedData: [
              {
                id: 'prefix-feat',
                prefix: 'Feat',
                name: 'Feature',
                description: 'New features or functionality',
                color: '#22c55e',
                sort_order: 1,
              },
              {
                id: 'prefix-fix',
                prefix: 'Fix',
                name: 'Bug Fix',
                description: 'Bug fixes and corrections',
                color: '#ef4444',
                sort_order: 2,
              },
              {
                id: 'prefix-refactor',
                prefix: 'Refactor',
                name: 'Refactor',
                description: 'Code restructuring without behavior change',
                color: '#a855f7',
                sort_order: 3,
              },
              {
                id: 'prefix-docs',
                prefix: 'Docs',
                name: 'Documentation',
                description: 'Documentation updates',
                color: '#3b82f6',
                sort_order: 4,
              },
              {
                id: 'prefix-chore',
                prefix: 'Chore',
                name: 'Chore',
                description: 'Maintenance and operational tasks',
                color: '#6b7280',
                sort_order: 5,
              },
              {
                id: 'prefix-test',
                prefix: 'Test',
                name: 'Testing',
                description: 'Test creation or updates',
                color: '#f59e0b',
                sort_order: 6,
              },
              {
                id: 'prefix-perf',
                prefix: 'Perf',
                name: 'Performance',
                description: 'Performance improvements',
                color: '#06b6d4',
                sort_order: 7,
              },
              {
                id: 'prefix-style',
                prefix: 'Style',
                name: 'Style',
                description: 'UI/UX changes',
                color: '#ec4899',
                sort_order: 8,
              },
              {
                id: 'prefix-hotfix',
                prefix: 'Hotfix',
                name: 'Hotfix',
                description: 'Urgent production fixes',
                color: '#dc2626',
                sort_order: 9,
              },
            ],
          },
          // Workflow states table
          {
            name: 'workflow_states',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              { name: 'name', type: 'TEXT', notNull: true },
              { name: 'type', type: 'TEXT', notNull: true },
              { name: 'color', type: 'TEXT' },
              { name: 'position', type: 'INTEGER', default: 0 },
            ],
            seedData: [
              {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'backlog',
                color: '#6b7280',
                position: 0,
              },
              {
                id: 'state-todo',
                name: 'To Do',
                type: 'unstarted',
                color: '#3b82f6',
                position: 1,
              },
              {
                id: 'state-progress',
                name: 'In Progress',
                type: 'started',
                color: '#f59e0b',
                position: 2,
              },
              {
                id: 'state-review',
                name: 'In Review',
                type: 'started',
                color: '#a855f7',
                position: 3,
              },
              {
                id: 'state-done',
                name: 'Done',
                type: 'completed',
                color: '#22c55e',
                position: 4,
              },
              {
                id: 'state-canceled',
                name: 'Canceled',
                type: 'canceled',
                color: '#ef4444',
                position: 5,
              },
            ],
          },
          // Priority levels
          {
            name: 'priorities',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              { name: 'level', type: 'INTEGER', notNull: true, unique: true },
              { name: 'name', type: 'TEXT', notNull: true },
              { name: 'color', type: 'TEXT' },
              { name: 'icon', type: 'TEXT' },
            ],
            seedData: [
              {
                id: 'priority-0',
                level: 0,
                name: 'No Priority',
                color: '#6b7280',
                icon: 'minus',
              },
              {
                id: 'priority-1',
                level: 1,
                name: 'Low',
                color: '#22c55e',
                icon: 'arrow-down',
              },
              {
                id: 'priority-2',
                level: 2,
                name: 'Medium',
                color: '#f59e0b',
                icon: 'minus',
              },
              {
                id: 'priority-3',
                level: 3,
                name: 'High',
                color: '#f97316',
                icon: 'arrow-up',
              },
              {
                id: 'priority-4',
                level: 4,
                name: 'Urgent',
                color: '#ef4444',
                icon: 'alert',
              },
            ],
          },
          // Team members table
          {
            name: 'members',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              { name: 'name', type: 'TEXT', notNull: true },
              { name: 'email', type: 'TEXT', unique: true },
              { name: 'role', type: 'TEXT', default: "'member'" },
              { name: 'avatar_url', type: 'TEXT' },
              { name: 'is_active', type: 'INTEGER', default: 1 },
              {
                name: 'created_at',
                type: 'DATETIME',
                default: 'CURRENT_TIMESTAMP',
              },
            ],
            seedData: [
              {
                id: 'member-1',
                name: 'Alex Chen',
                email: 'alex@example.com',
                role: 'lead',
                is_active: 1,
              },
              {
                id: 'member-2',
                name: 'Jordan Kim',
                email: 'jordan@example.com',
                role: 'member',
                is_active: 1,
              },
              {
                id: 'member-3',
                name: 'Sam Rivera',
                email: 'sam@example.com',
                role: 'member',
                is_active: 1,
              },
            ],
          },
          // Projects table
          {
            name: 'projects',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              { name: 'key', type: 'TEXT', notNull: true, unique: true },
              { name: 'name', type: 'TEXT', notNull: true },
              { name: 'description', type: 'TEXT' },
              { name: 'status', type: 'TEXT', default: "'active'" },
              {
                name: 'lead_id',
                type: 'TEXT',
                references: { table: 'members', column: 'id' },
              },
              { name: 'start_date', type: 'DATETIME' },
              { name: 'target_date', type: 'DATETIME' },
              { name: 'color', type: 'TEXT' },
              {
                name: 'created_at',
                type: 'DATETIME',
                default: 'CURRENT_TIMESTAMP',
              },
            ],
            indexes: [{ name: 'idx_projects_status', columns: ['status'] }],
            seedData: [
              {
                id: 'proj-1',
                key: 'CORE',
                name: 'Core Platform',
                description: 'Main product platform development',
                status: 'active',
                lead_id: 'member-1',
                color: '#3b82f6',
              },
              {
                id: 'proj-2',
                key: 'MOBILE',
                name: 'Mobile App',
                description: 'iOS and Android applications',
                status: 'active',
                lead_id: 'member-2',
                color: '#22c55e',
              },
            ],
          },
          // Milestones table
          {
            name: 'milestones',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              {
                name: 'project_id',
                type: 'TEXT',
                notNull: true,
                references: { table: 'projects', column: 'id' },
              },
              { name: 'name', type: 'TEXT', notNull: true },
              { name: 'description', type: 'TEXT' },
              { name: 'target_date', type: 'DATETIME' },
              { name: 'completed_at', type: 'DATETIME' },
              { name: 'sort_order', type: 'INTEGER', default: 0 },
            ],
            indexes: [
              { name: 'idx_milestones_project', columns: ['project_id'] },
            ],
            seedData: [
              {
                id: 'milestone-1',
                project_id: 'proj-1',
                name: 'Beta Launch',
                description: 'Public beta release',
                target_date: '2025-02-01',
                sort_order: 1,
              },
              {
                id: 'milestone-2',
                project_id: 'proj-1',
                name: 'GA Release',
                description: 'General availability',
                target_date: '2025-04-01',
                sort_order: 2,
              },
            ],
          },
          // Cycles (Sprints) table
          {
            name: 'cycles',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              { name: 'name', type: 'TEXT', notNull: true },
              { name: 'number', type: 'INTEGER', notNull: true },
              { name: 'description', type: 'TEXT' },
              { name: 'status', type: 'TEXT', default: "'upcoming'" },
              { name: 'start_date', type: 'DATETIME', notNull: true },
              { name: 'end_date', type: 'DATETIME', notNull: true },
              { name: 'completed_at', type: 'DATETIME' },
            ],
            indexes: [
              { name: 'idx_cycles_status', columns: ['status'] },
              { name: 'idx_cycles_dates', columns: ['start_date', 'end_date'] },
            ],
            seedData: [
              {
                id: 'cycle-1',
                name: 'Cycle 1',
                number: 1,
                description: 'Foundation and core features',
                status: 'completed',
                start_date: '2024-12-02',
                end_date: '2024-12-15',
                completed_at: '2024-12-15',
              },
              {
                id: 'cycle-2',
                name: 'Cycle 2',
                number: 2,
                description: 'User experience improvements',
                status: 'active',
                start_date: '2024-12-16',
                end_date: '2024-12-29',
              },
              {
                id: 'cycle-3',
                name: 'Cycle 3',
                number: 3,
                description: 'Performance and polish',
                status: 'upcoming',
                start_date: '2024-12-30',
                end_date: '2025-01-12',
              },
            ],
          },
          // Labels table
          {
            name: 'labels',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              { name: 'name', type: 'TEXT', notNull: true },
              { name: 'color', type: 'TEXT', notNull: true },
              { name: 'description', type: 'TEXT' },
            ],
            seedData: [
              {
                id: 'label-frontend',
                name: 'frontend',
                color: '#3b82f6',
                description: 'Frontend/UI work',
              },
              {
                id: 'label-backend',
                name: 'backend',
                color: '#22c55e',
                description: 'Backend/API work',
              },
              {
                id: 'label-database',
                name: 'database',
                color: '#f59e0b',
                description: 'Database changes',
              },
              {
                id: 'label-security',
                name: 'security',
                color: '#ef4444',
                description: 'Security related',
              },
              {
                id: 'label-ux',
                name: 'ux',
                color: '#ec4899',
                description: 'User experience',
              },
              {
                id: 'label-blocked',
                name: 'blocked',
                color: '#dc2626',
                description: 'Blocked by dependency',
              },
            ],
          },
          // Issues table (core)
          {
            name: 'issues',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              {
                name: 'project_id',
                type: 'TEXT',
                notNull: true,
                references: { table: 'projects', column: 'id' },
              },
              {
                name: 'prefix_id',
                type: 'TEXT',
                notNull: true,
                references: { table: 'issue_prefixes', column: 'id' },
              },
              {
                name: 'cycle_id',
                type: 'TEXT',
                references: { table: 'cycles', column: 'id' },
              },
              {
                name: 'milestone_id',
                type: 'TEXT',
                references: { table: 'milestones', column: 'id' },
              },
              {
                name: 'parent_id',
                type: 'TEXT',
                references: { table: 'issues', column: 'id' },
              },
              { name: 'identifier', type: 'TEXT', notNull: true, unique: true },
              { name: 'number', type: 'INTEGER', notNull: true },
              { name: 'title', type: 'TEXT', notNull: true },
              { name: 'description', type: 'TEXT' },
              { name: 'priority', type: 'INTEGER', default: 0 },
              {
                name: 'state_id',
                type: 'TEXT',
                notNull: true,
                references: { table: 'workflow_states', column: 'id' },
              },
              {
                name: 'assignee_id',
                type: 'TEXT',
                references: { table: 'members', column: 'id' },
              },
              {
                name: 'creator_id',
                type: 'TEXT',
                references: { table: 'members', column: 'id' },
              },
              { name: 'estimate', type: 'REAL' },
              { name: 'due_date', type: 'DATETIME' },
              { name: 'started_at', type: 'DATETIME' },
              { name: 'completed_at', type: 'DATETIME' },
              { name: 'canceled_at', type: 'DATETIME' },
              { name: 'sort_order', type: 'REAL', default: 0 },
              {
                name: 'created_at',
                type: 'DATETIME',
                default: 'CURRENT_TIMESTAMP',
              },
              {
                name: 'updated_at',
                type: 'DATETIME',
                default: 'CURRENT_TIMESTAMP',
              },
            ],
            indexes: [
              { name: 'idx_issues_project', columns: ['project_id'] },
              { name: 'idx_issues_prefix', columns: ['prefix_id'] },
              { name: 'idx_issues_cycle', columns: ['cycle_id'] },
              { name: 'idx_issues_state', columns: ['state_id'] },
              { name: 'idx_issues_assignee', columns: ['assignee_id'] },
              { name: 'idx_issues_parent', columns: ['parent_id'] },
              { name: 'idx_issues_priority', columns: ['priority'] },
            ],
            seedData: [
              {
                id: 'issue-1',
                project_id: 'proj-1',
                prefix_id: 'prefix-feat',
                cycle_id: 'cycle-2',
                milestone_id: 'milestone-1',
                identifier: 'CORE-1',
                number: 1,
                title: 'Add dark mode toggle',
                description:
                  'Implement system and manual dark mode switching in settings',
                priority: 3,
                state_id: 'state-progress',
                assignee_id: 'member-1',
                creator_id: 'member-1',
                estimate: 3,
              },
              {
                id: 'issue-2',
                project_id: 'proj-1',
                prefix_id: 'prefix-fix',
                cycle_id: 'cycle-2',
                identifier: 'CORE-2',
                number: 2,
                title: 'Resolve login timeout on slow connections',
                description:
                  'Users on 3G connections experience timeout errors during login',
                priority: 4,
                state_id: 'state-todo',
                assignee_id: 'member-2',
                creator_id: 'member-1',
                estimate: 2,
              },
              {
                id: 'issue-3',
                project_id: 'proj-1',
                prefix_id: 'prefix-refactor',
                cycle_id: 'cycle-2',
                identifier: 'CORE-3',
                number: 3,
                title: 'Simplify authentication middleware',
                description:
                  'Current auth middleware has redundant checks and unclear error handling',
                priority: 2,
                state_id: 'state-backlog',
                creator_id: 'member-3',
                estimate: 5,
              },
              {
                id: 'issue-4',
                project_id: 'proj-1',
                prefix_id: 'prefix-docs',
                identifier: 'CORE-4',
                number: 4,
                title: 'Update API endpoint reference',
                description:
                  'Document new v2 endpoints and deprecation notices',
                priority: 1,
                state_id: 'state-backlog',
                creator_id: 'member-1',
                estimate: 2,
              },
              {
                id: 'issue-5',
                project_id: 'proj-1',
                prefix_id: 'prefix-perf',
                cycle_id: 'cycle-3',
                identifier: 'CORE-5',
                number: 5,
                title: 'Optimize image loading pipeline',
                description:
                  'Implement lazy loading and progressive image rendering',
                priority: 2,
                state_id: 'state-backlog',
                creator_id: 'member-2',
                estimate: 4,
              },
              {
                id: 'issue-6',
                project_id: 'proj-1',
                prefix_id: 'prefix-test',
                cycle_id: 'cycle-2',
                identifier: 'CORE-6',
                number: 6,
                title: 'Add unit tests for payment flow',
                description:
                  'Cover edge cases in payment processing and refunds',
                priority: 3,
                state_id: 'state-review',
                assignee_id: 'member-3',
                creator_id: 'member-1',
                estimate: 3,
              },
              {
                id: 'issue-7',
                project_id: 'proj-2',
                prefix_id: 'prefix-feat',
                cycle_id: 'cycle-2',
                identifier: 'MOBILE-1',
                number: 1,
                title: 'Add biometric authentication',
                description: 'Support Face ID and fingerprint login on mobile',
                priority: 3,
                state_id: 'state-progress',
                assignee_id: 'member-2',
                creator_id: 'member-2',
                estimate: 5,
              },
              {
                id: 'issue-8',
                project_id: 'proj-2',
                prefix_id: 'prefix-style',
                identifier: 'MOBILE-2',
                number: 2,
                title: 'Update button hover states',
                description: 'Align button interactions with new design system',
                priority: 1,
                state_id: 'state-done',
                assignee_id: 'member-3',
                creator_id: 'member-2',
                estimate: 1,
                completed_at: '2024-12-10',
              },
            ],
          },
          // Issue labels junction table
          {
            name: 'issue_labels',
            columns: [
              {
                name: 'issue_id',
                type: 'TEXT',
                notNull: true,
                references: { table: 'issues', column: 'id' },
              },
              {
                name: 'label_id',
                type: 'TEXT',
                notNull: true,
                references: { table: 'labels', column: 'id' },
              },
              {
                name: 'created_at',
                type: 'DATETIME',
                default: 'CURRENT_TIMESTAMP',
              },
            ],
            indexes: [
              { name: 'idx_issue_labels_issue', columns: ['issue_id'] },
              { name: 'idx_issue_labels_label', columns: ['label_id'] },
              {
                name: 'idx_issue_labels_pk',
                columns: ['issue_id', 'label_id'],
                unique: true,
              },
            ],
            seedData: [
              { issue_id: 'issue-1', label_id: 'label-frontend' },
              { issue_id: 'issue-1', label_id: 'label-ux' },
              { issue_id: 'issue-2', label_id: 'label-backend' },
              { issue_id: 'issue-3', label_id: 'label-backend' },
              { issue_id: 'issue-5', label_id: 'label-frontend' },
              { issue_id: 'issue-6', label_id: 'label-backend' },
              { issue_id: 'issue-7', label_id: 'label-security' },
            ],
          },
          // Issue relations table
          {
            name: 'issue_relations',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              {
                name: 'issue_id',
                type: 'TEXT',
                notNull: true,
                references: { table: 'issues', column: 'id' },
              },
              {
                name: 'related_issue_id',
                type: 'TEXT',
                notNull: true,
                references: { table: 'issues', column: 'id' },
              },
              { name: 'type', type: 'TEXT', notNull: true },
              {
                name: 'created_at',
                type: 'DATETIME',
                default: 'CURRENT_TIMESTAMP',
              },
            ],
            indexes: [
              { name: 'idx_issue_relations_issue', columns: ['issue_id'] },
              {
                name: 'idx_issue_relations_related',
                columns: ['related_issue_id'],
              },
            ],
            seedData: [
              {
                id: 'rel-1',
                issue_id: 'issue-3',
                related_issue_id: 'issue-2',
                type: 'blocks',
              },
            ],
          },
          // Comments table
          {
            name: 'comments',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              {
                name: 'issue_id',
                type: 'TEXT',
                notNull: true,
                references: { table: 'issues', column: 'id' },
              },
              {
                name: 'author_id',
                type: 'TEXT',
                notNull: true,
                references: { table: 'members', column: 'id' },
              },
              { name: 'body', type: 'TEXT', notNull: true },
              {
                name: 'created_at',
                type: 'DATETIME',
                default: 'CURRENT_TIMESTAMP',
              },
              {
                name: 'updated_at',
                type: 'DATETIME',
                default: 'CURRENT_TIMESTAMP',
              },
            ],
            indexes: [{ name: 'idx_comments_issue', columns: ['issue_id'] }],
            seedData: [
              {
                id: 'comment-1',
                issue_id: 'issue-1',
                author_id: 'member-2',
                body: 'Should we support system preference detection?',
              },
              {
                id: 'comment-2',
                issue_id: 'issue-1',
                author_id: 'member-1',
                body: 'Yes, default to system preference with manual override option.',
              },
              {
                id: 'comment-3',
                issue_id: 'issue-2',
                author_id: 'member-3',
                body: 'Reproduced on staging. Timeout occurs after 8 seconds.',
              },
            ],
          },
          // Activity log table
          {
            name: 'activity_log',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              {
                name: 'issue_id',
                type: 'TEXT',
                notNull: true,
                references: { table: 'issues', column: 'id' },
              },
              {
                name: 'actor_id',
                type: 'TEXT',
                references: { table: 'members', column: 'id' },
              },
              { name: 'action', type: 'TEXT', notNull: true },
              { name: 'field', type: 'TEXT' },
              { name: 'old_value', type: 'TEXT' },
              { name: 'new_value', type: 'TEXT' },
              {
                name: 'created_at',
                type: 'DATETIME',
                default: 'CURRENT_TIMESTAMP',
              },
            ],
            indexes: [
              { name: 'idx_activity_log_issue', columns: ['issue_id'] },
              { name: 'idx_activity_log_created', columns: ['created_at'] },
            ],
            seedData: [
              {
                id: 'activity-1',
                issue_id: 'issue-1',
                actor_id: 'member-1',
                action: 'created',
              },
              {
                id: 'activity-2',
                issue_id: 'issue-1',
                actor_id: 'member-1',
                action: 'updated',
                field: 'state_id',
                old_value: 'state-todo',
                new_value: 'state-progress',
              },
              {
                id: 'activity-3',
                issue_id: 'issue-8',
                actor_id: 'member-3',
                action: 'updated',
                field: 'state_id',
                old_value: 'state-review',
                new_value: 'state-done',
              },
            ],
          },
        ],
      },
    ],
  },
  // Content Generation template
  {
    id: 'content-generation',
    name: 'Content Generation',
    description: 'Create, manage, and distribute content at scale',
    category: 'marketing',
    featured: true,
    folders: [
      { name: 'inbox' },
      {
        name: 'guides',
        children: [
          {
            name: 'content-workflow.md',
            isFile: true,
            content: `# Content Workflow

A streamlined process for creating and publishing content.

## Stages

### 1. Ideation
- Review topics in the ideas database
- Check content calendar for upcoming slots
- Research trending topics and keywords

### 2. Drafting
- Create draft in drafts/ folder
- Follow brand voice guidelines
- Include SEO keywords naturally

### 3. Review
- Move to review/ when ready
- Request feedback from stakeholders
- Incorporate edits

### 4. Publishing
- Move to published/ after approval
- Schedule or publish immediately
- Track performance in analytics database

## Content Types

| Type | Word Count | Review Needed |
|------|-----------|---------------|
| Blog Post | 1500-2500 | Yes |
| Social Post | 50-280 | Optional |
| Newsletter | 500-1000 | Yes |
| Case Study | 2000-3000 | Yes |
| Landing Page | 300-500 | Yes |
`,
          },
          {
            name: 'brand-voice.md',
            isFile: true,
            content: `# Brand Voice Guidelines

Consistent voice builds trust and recognition.

## Tone

**Professional but approachable.** We're experts who explain things clearly.

### Do
- Use active voice
- Be specific and concrete
- Address the reader directly ("you")
- Back claims with data

### Don't
- Use jargon without explanation
- Be condescending
- Make vague promises
- Overuse exclamation marks

## Voice Attributes

1. **Clear** - Simple words, short sentences
2. **Helpful** - Focus on reader benefit
3. **Confident** - State facts, avoid hedging
4. **Human** - Conversational, not robotic

## Examples

❌ "Leverage our solution to optimize your workflow"
✅ "Save 2 hours a day with automated reports"

❌ "We're excited to announce..."
✅ "You can now..."
`,
          },
        ],
      },
      {
        name: 'content',
        children: [
          { name: 'drafts' },
          { name: 'review' },
          { name: 'published' },
        ],
      },
      {
        name: 'assets',
        children: [
          { name: 'images' },
          { name: 'templates' },
          { name: 'brand' },
        ],
      },
      { name: 'calendar' },
      { name: 'analytics' },
    ],
    agents: [
      {
        name: 'Content Writer',
        description: 'Draft blog posts, social content, and marketing copy',
      },
      {
        name: 'SEO Optimizer',
        description:
          'Keyword research, meta descriptions, content optimization',
      },
      {
        name: 'Editor',
        description:
          'Proofread, style guide compliance, readability improvements',
      },
      {
        name: 'Content Planner',
        description:
          'Editorial calendar, topic ideation, content gaps analysis',
      },
    ],
    databases: [
      {
        name: 'content-hub',
        description: 'Content planning, tracking, and analytics',
        tables: [
          {
            name: 'content_types',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              { name: 'name', type: 'TEXT', notNull: true },
              { name: 'description', type: 'TEXT' },
              { name: 'template_path', type: 'TEXT' },
              { name: 'target_word_count', type: 'INTEGER' },
            ],
            seedData: [
              {
                id: 'type-blog',
                name: 'Blog Post',
                description: 'Long-form articles',
                target_word_count: 2000,
              },
              {
                id: 'type-social',
                name: 'Social Post',
                description: 'Social media content',
                target_word_count: 150,
              },
              {
                id: 'type-newsletter',
                name: 'Newsletter',
                description: 'Email newsletter',
                target_word_count: 750,
              },
              {
                id: 'type-case-study',
                name: 'Case Study',
                description: 'Customer success stories',
                target_word_count: 2500,
              },
              {
                id: 'type-landing',
                name: 'Landing Page',
                description: 'Marketing pages',
                target_word_count: 400,
              },
            ],
          },
          {
            name: 'content_status',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              { name: 'name', type: 'TEXT', notNull: true },
              { name: 'color', type: 'TEXT' },
              { name: 'sort_order', type: 'INTEGER' },
            ],
            seedData: [
              {
                id: 'status-idea',
                name: 'Idea',
                color: '#6b7280',
                sort_order: 0,
              },
              {
                id: 'status-draft',
                name: 'Drafting',
                color: '#3b82f6',
                sort_order: 1,
              },
              {
                id: 'status-review',
                name: 'In Review',
                color: '#f59e0b',
                sort_order: 2,
              },
              {
                id: 'status-approved',
                name: 'Approved',
                color: '#a855f7',
                sort_order: 3,
              },
              {
                id: 'status-published',
                name: 'Published',
                color: '#22c55e',
                sort_order: 4,
              },
            ],
          },
          {
            name: 'topics',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              { name: 'name', type: 'TEXT', notNull: true },
              { name: 'description', type: 'TEXT' },
              { name: 'color', type: 'TEXT' },
            ],
            seedData: [
              {
                id: 'topic-product',
                name: 'Product',
                description: 'Product features and updates',
                color: '#3b82f6',
              },
              {
                id: 'topic-industry',
                name: 'Industry',
                description: 'Industry trends and insights',
                color: '#22c55e',
              },
              {
                id: 'topic-how-to',
                name: 'How-To',
                description: 'Tutorials and guides',
                color: '#f59e0b',
              },
              {
                id: 'topic-company',
                name: 'Company',
                description: 'Company news and culture',
                color: '#ec4899',
              },
            ],
          },
          {
            name: 'content_items',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              { name: 'title', type: 'TEXT', notNull: true },
              {
                name: 'type_id',
                type: 'TEXT',
                references: { table: 'content_types', column: 'id' },
              },
              {
                name: 'status_id',
                type: 'TEXT',
                references: { table: 'content_status', column: 'id' },
              },
              {
                name: 'topic_id',
                type: 'TEXT',
                references: { table: 'topics', column: 'id' },
              },
              { name: 'file_path', type: 'TEXT' },
              { name: 'target_publish_date', type: 'DATETIME' },
              { name: 'published_date', type: 'DATETIME' },
              { name: 'author', type: 'TEXT' },
              { name: 'word_count', type: 'INTEGER' },
              { name: 'seo_title', type: 'TEXT' },
              { name: 'seo_description', type: 'TEXT' },
              { name: 'keywords', type: 'TEXT' },
              {
                name: 'created_at',
                type: 'DATETIME',
                default: 'CURRENT_TIMESTAMP',
              },
              {
                name: 'updated_at',
                type: 'DATETIME',
                default: 'CURRENT_TIMESTAMP',
              },
            ],
            indexes: [
              { name: 'idx_content_status', columns: ['status_id'] },
              { name: 'idx_content_type', columns: ['type_id'] },
              { name: 'idx_content_topic', columns: ['topic_id'] },
            ],
            seedData: [
              {
                id: 'content-1',
                title: 'Getting Started Guide',
                type_id: 'type-blog',
                status_id: 'status-published',
                topic_id: 'topic-how-to',
                author: 'Content Team',
                word_count: 1850,
              },
              {
                id: 'content-2',
                title: 'Q4 Product Roadmap',
                type_id: 'type-blog',
                status_id: 'status-draft',
                topic_id: 'topic-product',
                author: 'Product Team',
              },
              {
                id: 'content-3',
                title: 'Customer Success Story: Acme Corp',
                type_id: 'type-case-study',
                status_id: 'status-review',
                topic_id: 'topic-product',
                author: 'Marketing',
              },
            ],
          },
          {
            name: 'content_metrics',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              {
                name: 'content_id',
                type: 'TEXT',
                notNull: true,
                references: { table: 'content_items', column: 'id' },
              },
              { name: 'date', type: 'DATETIME', notNull: true },
              { name: 'views', type: 'INTEGER', default: 0 },
              { name: 'unique_visitors', type: 'INTEGER', default: 0 },
              { name: 'avg_time_on_page', type: 'INTEGER' },
              { name: 'bounce_rate', type: 'REAL' },
              { name: 'shares', type: 'INTEGER', default: 0 },
              { name: 'comments', type: 'INTEGER', default: 0 },
            ],
            indexes: [
              { name: 'idx_metrics_content', columns: ['content_id'] },
              { name: 'idx_metrics_date', columns: ['date'] },
            ],
          },
        ],
      },
    ],
  },
  // Legal template
  {
    id: 'legal-ops',
    name: 'Legal Operations',
    description:
      'Contract management, compliance tracking, and legal workflows',
    category: 'legal',
    featured: true,
    folders: [
      { name: 'inbox' },
      {
        name: 'guides',
        children: [
          {
            name: 'contract-review-process.md',
            isFile: true,
            content: `# Contract Review Process

Standard workflow for reviewing and approving contracts.

## Review Stages

### 1. Initial Intake
- Log contract in contracts database
- Assign contract type and priority
- Set review deadline based on urgency

### 2. Legal Review
- Check for non-standard terms
- Flag high-risk clauses
- Note negotiation points

### 3. Business Review
- Verify commercial terms match deal
- Confirm pricing and payment terms
- Check service levels

### 4. Approval
- Route to appropriate approver
- Document any exceptions
- Execute and file

## Priority Levels

| Priority | SLA | Examples |
|----------|-----|----------|
| Urgent | 24h | Critical deals, legal deadlines |
| High | 3 days | Large contracts, new vendors |
| Normal | 5 days | Standard renewals |
| Low | 10 days | Minor amendments |

## Red Flag Clauses

Watch for these terms that require escalation:
- Unlimited liability
- Auto-renewal > 1 year
- Non-standard indemnification
- Exclusive dealing
- Non-compete restrictions
`,
          },
          {
            name: 'compliance-checklist.md',
            isFile: true,
            content: `# Compliance Checklist

Regular compliance review items organized by frequency.

## Monthly Reviews

- [ ] Review new vendor contracts for data processing terms
- [ ] Check NDA expiration dates
- [ ] Audit access permissions for legal documents
- [ ] Review pending litigation updates

## Quarterly Reviews

- [ ] Policy document review and updates
- [ ] Compliance training completion rates
- [ ] Third-party risk assessment updates
- [ ] Regulatory change impact analysis

## Annual Reviews

- [ ] Full policy audit
- [ ] Insurance coverage review
- [ ] Data retention compliance
- [ ] Annual compliance report

## Key Regulations

| Regulation | Applies To | Review Frequency |
|------------|-----------|-----------------|
| GDPR | EU data | Quarterly |
| SOC 2 | Security | Annual |
| HIPAA | Health data | Monthly |
| CCPA | CA residents | Quarterly |
`,
          },
        ],
      },
      {
        name: 'contracts',
        children: [
          { name: 'active' },
          { name: 'pending-review' },
          { name: 'templates' },
          { name: 'archive' },
        ],
      },
      {
        name: 'compliance',
        children: [
          { name: 'policies' },
          { name: 'audits' },
          { name: 'training' },
        ],
      },
      {
        name: 'matters',
        children: [
          { name: 'litigation' },
          { name: 'ip' },
          { name: 'corporate' },
        ],
      },
      { name: 'vendors' },
    ],
    agents: [
      {
        name: 'Contract Reviewer',
        description: 'Analyze contracts, flag risks, suggest redlines',
      },
      {
        name: 'Compliance Monitor',
        description: 'Track regulatory requirements and policy compliance',
      },
      {
        name: 'Legal Researcher',
        description:
          'Case law research, precedent analysis, regulatory updates',
      },
      {
        name: 'Document Drafter',
        description: 'Generate NDAs, agreements, and policy documents',
      },
    ],
    databases: [
      {
        name: 'legal-tracker',
        description:
          'Contract lifecycle, compliance tracking, and matter management',
        tables: [
          {
            name: 'contract_types',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              { name: 'name', type: 'TEXT', notNull: true },
              { name: 'description', type: 'TEXT' },
              { name: 'default_template', type: 'TEXT' },
              { name: 'review_required', type: 'INTEGER', default: 1 },
            ],
            seedData: [
              {
                id: 'type-nda',
                name: 'NDA',
                description: 'Non-disclosure agreements',
                review_required: 0,
              },
              {
                id: 'type-msa',
                name: 'MSA',
                description: 'Master service agreements',
                review_required: 1,
              },
              {
                id: 'type-sow',
                name: 'SOW',
                description: 'Statement of work',
                review_required: 1,
              },
              {
                id: 'type-vendor',
                name: 'Vendor Agreement',
                description: 'Third-party vendor contracts',
                review_required: 1,
              },
              {
                id: 'type-employment',
                name: 'Employment',
                description: 'Employment agreements',
                review_required: 1,
              },
              {
                id: 'type-dpa',
                name: 'DPA',
                description: 'Data processing agreements',
                review_required: 1,
              },
            ],
          },
          {
            name: 'contract_status',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              { name: 'name', type: 'TEXT', notNull: true },
              { name: 'color', type: 'TEXT' },
              { name: 'sort_order', type: 'INTEGER' },
            ],
            seedData: [
              {
                id: 'status-draft',
                name: 'Draft',
                color: '#6b7280',
                sort_order: 0,
              },
              {
                id: 'status-review',
                name: 'Under Review',
                color: '#3b82f6',
                sort_order: 1,
              },
              {
                id: 'status-negotiation',
                name: 'In Negotiation',
                color: '#f59e0b',
                sort_order: 2,
              },
              {
                id: 'status-pending-sig',
                name: 'Pending Signature',
                color: '#a855f7',
                sort_order: 3,
              },
              {
                id: 'status-active',
                name: 'Active',
                color: '#22c55e',
                sort_order: 4,
              },
              {
                id: 'status-expired',
                name: 'Expired',
                color: '#ef4444',
                sort_order: 5,
              },
              {
                id: 'status-terminated',
                name: 'Terminated',
                color: '#dc2626',
                sort_order: 6,
              },
            ],
          },
          {
            name: 'parties',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              { name: 'name', type: 'TEXT', notNull: true },
              { name: 'type', type: 'TEXT' },
              { name: 'contact_name', type: 'TEXT' },
              { name: 'contact_email', type: 'TEXT' },
              { name: 'address', type: 'TEXT' },
              { name: 'notes', type: 'TEXT' },
              {
                name: 'created_at',
                type: 'DATETIME',
                default: 'CURRENT_TIMESTAMP',
              },
            ],
            seedData: [
              {
                id: 'party-acme',
                name: 'Acme Corporation',
                type: 'Vendor',
                contact_name: 'John Smith',
                contact_email: 'john@acme.com',
              },
              {
                id: 'party-globex',
                name: 'Globex Industries',
                type: 'Customer',
                contact_name: 'Jane Doe',
                contact_email: 'jane@globex.com',
              },
              {
                id: 'party-initech',
                name: 'Initech LLC',
                type: 'Partner',
                contact_name: 'Bob Johnson',
                contact_email: 'bob@initech.com',
              },
            ],
          },
          {
            name: 'contracts',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              { name: 'title', type: 'TEXT', notNull: true },
              {
                name: 'type_id',
                type: 'TEXT',
                references: { table: 'contract_types', column: 'id' },
              },
              {
                name: 'status_id',
                type: 'TEXT',
                references: { table: 'contract_status', column: 'id' },
              },
              {
                name: 'party_id',
                type: 'TEXT',
                references: { table: 'parties', column: 'id' },
              },
              { name: 'file_path', type: 'TEXT' },
              { name: 'value', type: 'REAL' },
              { name: 'currency', type: 'TEXT', default: "'USD'" },
              { name: 'effective_date', type: 'DATETIME' },
              { name: 'expiration_date', type: 'DATETIME' },
              { name: 'auto_renew', type: 'INTEGER', default: 0 },
              { name: 'renewal_notice_days', type: 'INTEGER' },
              { name: 'owner', type: 'TEXT' },
              { name: 'priority', type: 'TEXT', default: "'normal'" },
              { name: 'notes', type: 'TEXT' },
              {
                name: 'created_at',
                type: 'DATETIME',
                default: 'CURRENT_TIMESTAMP',
              },
              {
                name: 'updated_at',
                type: 'DATETIME',
                default: 'CURRENT_TIMESTAMP',
              },
            ],
            indexes: [
              { name: 'idx_contracts_status', columns: ['status_id'] },
              { name: 'idx_contracts_type', columns: ['type_id'] },
              { name: 'idx_contracts_party', columns: ['party_id'] },
              {
                name: 'idx_contracts_expiration',
                columns: ['expiration_date'],
              },
            ],
            seedData: [
              {
                id: 'contract-1',
                title: 'Acme Corp MSA',
                type_id: 'type-msa',
                status_id: 'status-active',
                party_id: 'party-acme',
                value: 50000,
                effective_date: '2024-01-01',
                expiration_date: '2025-12-31',
                auto_renew: 1,
                renewal_notice_days: 60,
                owner: 'Legal Team',
                priority: 'high',
              },
              {
                id: 'contract-2',
                title: 'Globex NDA',
                type_id: 'type-nda',
                status_id: 'status-active',
                party_id: 'party-globex',
                effective_date: '2024-06-01',
                expiration_date: '2026-06-01',
                owner: 'Legal Team',
                priority: 'normal',
              },
              {
                id: 'contract-3',
                title: 'Initech Partnership Agreement',
                type_id: 'type-msa',
                status_id: 'status-negotiation',
                party_id: 'party-initech',
                value: 120000,
                owner: 'Legal Team',
                priority: 'high',
              },
            ],
          },
          {
            name: 'compliance_items',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              { name: 'regulation', type: 'TEXT', notNull: true },
              { name: 'requirement', type: 'TEXT', notNull: true },
              { name: 'description', type: 'TEXT' },
              { name: 'status', type: 'TEXT', default: "'pending'" },
              { name: 'due_date', type: 'DATETIME' },
              { name: 'completed_date', type: 'DATETIME' },
              { name: 'owner', type: 'TEXT' },
              { name: 'evidence_path', type: 'TEXT' },
              { name: 'notes', type: 'TEXT' },
              {
                name: 'created_at',
                type: 'DATETIME',
                default: 'CURRENT_TIMESTAMP',
              },
            ],
            indexes: [
              { name: 'idx_compliance_regulation', columns: ['regulation'] },
              { name: 'idx_compliance_status', columns: ['status'] },
            ],
            seedData: [
              {
                id: 'comp-1',
                regulation: 'GDPR',
                requirement: 'Data Processing Register',
                status: 'compliant',
                owner: 'Privacy Team',
              },
              {
                id: 'comp-2',
                regulation: 'SOC 2',
                requirement: 'Annual Security Audit',
                status: 'in-progress',
                due_date: '2025-03-01',
                owner: 'Security Team',
              },
              {
                id: 'comp-3',
                regulation: 'CCPA',
                requirement: 'Privacy Notice Update',
                status: 'pending',
                due_date: '2025-01-15',
                owner: 'Legal Team',
              },
            ],
          },
          {
            name: 'matters',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
              { name: 'title', type: 'TEXT', notNull: true },
              { name: 'type', type: 'TEXT', notNull: true },
              { name: 'status', type: 'TEXT', default: "'open'" },
              { name: 'description', type: 'TEXT' },
              { name: 'opposing_party', type: 'TEXT' },
              { name: 'outside_counsel', type: 'TEXT' },
              { name: 'budget', type: 'REAL' },
              { name: 'spent', type: 'REAL', default: 0 },
              { name: 'open_date', type: 'DATETIME' },
              { name: 'close_date', type: 'DATETIME' },
              { name: 'owner', type: 'TEXT' },
              { name: 'notes', type: 'TEXT' },
              {
                name: 'created_at',
                type: 'DATETIME',
                default: 'CURRENT_TIMESTAMP',
              },
            ],
            indexes: [
              { name: 'idx_matters_type', columns: ['type'] },
              { name: 'idx_matters_status', columns: ['status'] },
            ],
            seedData: [
              {
                id: 'matter-1',
                title: 'Trademark Registration - Product X',
                type: 'IP',
                status: 'open',
                budget: 5000,
                spent: 2500,
                owner: 'IP Team',
              },
              {
                id: 'matter-2',
                title: 'Annual Corporate Filing',
                type: 'Corporate',
                status: 'open',
                owner: 'Corporate Secretary',
              },
            ],
          },
        ],
      },
    ],
  },
  // Copywriting & Brand
  {
    id: 'copywriting',
    name: 'Copywriting Studio',
    description:
      'Write, test, and refine copy for ads, emails, and landing pages',
    category: 'creative',
    folders: [
      { name: '00-inbox' },
      {
        name: '01-briefs',
        children: [{ name: 'active' }, { name: 'completed' }],
      },
      {
        name: '02-copy',
        children: [
          { name: 'ads' },
          { name: 'emails' },
          { name: 'landing-pages' },
          { name: 'social' },
        ],
      },
      {
        name: '03-brand',
        children: [
          { name: 'voice-guidelines' },
          { name: 'tone-examples' },
          { name: 'competitors' },
        ],
      },
      {
        name: '04-testing',
        children: [{ name: 'ab-tests' }, { name: 'results' }],
      },
      { name: '05-assets', children: [{ name: 'images' }, { name: 'videos' }] },
    ],
    agents: [
      {
        name: 'Copy Chief',
        description: 'Reviews copy for clarity, tone, and brand consistency',
      },
      {
        name: 'Headline Generator',
        description: 'Creates variations of headlines and hooks for testing',
      },
      {
        name: 'Email Writer',
        description: 'Drafts email sequences and newsletters',
      },
      {
        name: 'Ad Copywriter',
        description: 'Writes short-form copy for ads across platforms',
      },
    ],
  },
  // Academic Research
  {
    id: 'academic-research',
    name: 'Research Lab',
    description: 'Organize papers, notes, and experiments for academic work',
    category: 'research',
    folders: [
      { name: '00-inbox' },
      {
        name: '01-literature',
        children: [
          { name: 'papers' },
          { name: 'summaries' },
          { name: 'annotated' },
        ],
      },
      {
        name: '02-projects',
        children: [{ name: 'active' }, { name: 'completed' }],
      },
      {
        name: '03-data',
        children: [{ name: 'raw' }, { name: 'processed' }, { name: 'figures' }],
      },
      {
        name: '04-writing',
        children: [
          { name: 'drafts' },
          { name: 'submissions' },
          { name: 'revisions' },
        ],
      },
      {
        name: '05-presentations',
        children: [{ name: 'talks' }, { name: 'posters' }],
      },
      {
        name: '06-grants',
        children: [{ name: 'proposals' }, { name: 'reports' }],
      },
    ],
    agents: [
      {
        name: 'Literature Scout',
        description: 'Finds and summarizes relevant papers and citations',
      },
      {
        name: 'Research Assistant',
        description:
          'Helps organize notes, extract key findings, and spot gaps',
      },
      {
        name: 'Writing Coach',
        description: 'Reviews drafts for clarity and academic style',
      },
      {
        name: 'Grant Writer',
        description: 'Helps draft proposals and progress reports',
      },
    ],
  },
  // Retail / Mini-market ERP
  {
    id: 'retail-store',
    name: 'Retail Store',
    description: 'Inventory, sales, and supplier management for small retail',
    category: 'retail',
    folders: [
      { name: '00-inbox' },
      {
        name: '01-inventory',
        children: [{ name: 'stock-counts' }, { name: 'reorder-lists' }],
      },
      {
        name: '02-suppliers',
        children: [
          { name: 'contacts' },
          { name: 'orders' },
          { name: 'invoices' },
        ],
      },
      {
        name: '03-sales',
        children: [{ name: 'daily-reports' }, { name: 'receipts' }],
      },
      {
        name: '04-staff',
        children: [{ name: 'schedules' }, { name: 'payroll' }],
      },
      {
        name: '05-expenses',
        children: [{ name: 'receipts' }, { name: 'reports' }],
      },
    ],
    agents: [
      {
        name: 'Inventory Manager',
        description: 'Tracks stock levels and suggests reorders',
      },
      {
        name: 'Sales Analyst',
        description: 'Summarizes daily sales and spots trends',
      },
      {
        name: 'Supplier Coordinator',
        description: 'Manages orders and tracks deliveries',
      },
      {
        name: 'Staff Scheduler',
        description: 'Helps plan shifts and track hours',
      },
    ],
    databases: [
      {
        name: 'store-ops',
        description: 'Products, inventory, sales, and suppliers',
        tables: [
          {
            name: 'products',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true },
              { name: 'name', type: 'TEXT', notNull: true },
              { name: 'sku', type: 'TEXT', unique: true },
              { name: 'category', type: 'TEXT' },
              { name: 'cost_price', type: 'REAL' },
              { name: 'sell_price', type: 'REAL' },
              { name: 'stock_qty', type: 'INTEGER', default: 0 },
              { name: 'reorder_level', type: 'INTEGER', default: 10 },
              { name: 'supplier_id', type: 'TEXT' },
            ],
          },
          {
            name: 'suppliers',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true },
              { name: 'name', type: 'TEXT', notNull: true },
              { name: 'contact', type: 'TEXT' },
              { name: 'phone', type: 'TEXT' },
              { name: 'email', type: 'TEXT' },
              { name: 'payment_terms', type: 'TEXT' },
            ],
          },
          {
            name: 'sales',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true },
              { name: 'date', type: 'DATETIME', default: 'CURRENT_TIMESTAMP' },
              { name: 'total', type: 'REAL' },
              { name: 'payment_method', type: 'TEXT' },
              { name: 'cashier', type: 'TEXT' },
            ],
          },
          {
            name: 'sale_items',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true },
              {
                name: 'sale_id',
                type: 'TEXT',
                references: { table: 'sales', column: 'id' },
              },
              {
                name: 'product_id',
                type: 'TEXT',
                references: { table: 'products', column: 'id' },
              },
              { name: 'qty', type: 'INTEGER' },
              { name: 'unit_price', type: 'REAL' },
            ],
          },
        ],
      },
    ],
  },
  // Recruiting / HR
  {
    id: 'recruiting',
    name: 'Recruiting',
    description: 'Track candidates from sourcing to offer',
    category: 'operations',
    folders: [
      { name: '00-inbox' },
      {
        name: '01-jobs',
        children: [{ name: 'open' }, { name: 'filled' }, { name: 'templates' }],
      },
      {
        name: '02-candidates',
        children: [
          { name: 'pipeline' },
          { name: 'interviews' },
          { name: 'offers' },
        ],
      },
      {
        name: '03-resources',
        children: [
          { name: 'job-descriptions' },
          { name: 'interview-guides' },
          { name: 'scorecards' },
        ],
      },
      {
        name: '04-reports',
        children: [{ name: 'metrics' }, { name: 'diversity' }],
      },
    ],
    agents: [
      {
        name: 'Sourcer',
        description: 'Helps write outreach and find candidates',
      },
      {
        name: 'Screener',
        description: 'Reviews resumes and flags matches',
      },
      {
        name: 'Interview Prep',
        description: 'Creates interview questions and scorecards',
      },
      {
        name: 'Offer Writer',
        description: 'Drafts offer letters and compensation packages',
      },
    ],
    databases: [
      {
        name: 'recruiting',
        description: 'Jobs, candidates, and pipeline tracking',
        tables: [
          {
            name: 'jobs',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true },
              { name: 'title', type: 'TEXT', notNull: true },
              { name: 'department', type: 'TEXT' },
              { name: 'location', type: 'TEXT' },
              { name: 'status', type: 'TEXT', default: "'open'" },
              {
                name: 'created_at',
                type: 'DATETIME',
                default: 'CURRENT_TIMESTAMP',
              },
            ],
          },
          {
            name: 'candidates',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true },
              { name: 'name', type: 'TEXT', notNull: true },
              { name: 'email', type: 'TEXT' },
              { name: 'phone', type: 'TEXT' },
              { name: 'source', type: 'TEXT' },
              {
                name: 'job_id',
                type: 'TEXT',
                references: { table: 'jobs', column: 'id' },
              },
              { name: 'stage', type: 'TEXT', default: "'applied'" },
              { name: 'rating', type: 'INTEGER' },
              { name: 'notes', type: 'TEXT' },
            ],
          },
          {
            name: 'interviews',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true },
              {
                name: 'candidate_id',
                type: 'TEXT',
                references: { table: 'candidates', column: 'id' },
              },
              { name: 'interviewer', type: 'TEXT' },
              { name: 'date', type: 'DATETIME' },
              { name: 'type', type: 'TEXT' },
              { name: 'score', type: 'INTEGER' },
              { name: 'feedback', type: 'TEXT' },
            ],
          },
        ],
      },
    ],
  },
  // Customer Support
  {
    id: 'customer-support',
    name: 'Customer Support',
    description: 'Handle tickets, build knowledge base, track satisfaction',
    category: 'operations',
    folders: [
      { name: '00-inbox' },
      {
        name: '01-tickets',
        children: [{ name: 'open' }, { name: 'pending' }, { name: 'resolved' }],
      },
      {
        name: '02-knowledge-base',
        children: [{ name: 'articles' }, { name: 'faqs' }, { name: 'guides' }],
      },
      {
        name: '03-templates',
        children: [{ name: 'responses' }, { name: 'macros' }],
      },
      { name: '04-reports', children: [{ name: 'csat' }, { name: 'volume' }] },
    ],
    agents: [
      {
        name: 'Support Rep',
        description: 'Drafts responses and suggests solutions',
      },
      {
        name: 'KB Writer',
        description: 'Creates and updates help articles',
      },
      {
        name: 'Escalation Handler',
        description: 'Identifies urgent issues and prepares summaries',
      },
      {
        name: 'CSAT Analyst',
        description: 'Tracks satisfaction trends and suggests improvements',
      },
    ],
    databases: [
      {
        name: 'support',
        description: 'Tickets, customers, and satisfaction tracking',
        tables: [
          {
            name: 'tickets',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true },
              { name: 'subject', type: 'TEXT', notNull: true },
              { name: 'customer_email', type: 'TEXT' },
              { name: 'status', type: 'TEXT', default: "'open'" },
              { name: 'priority', type: 'TEXT', default: "'normal'" },
              { name: 'category', type: 'TEXT' },
              { name: 'assignee', type: 'TEXT' },
              {
                name: 'created_at',
                type: 'DATETIME',
                default: 'CURRENT_TIMESTAMP',
              },
              { name: 'resolved_at', type: 'DATETIME' },
              { name: 'csat_score', type: 'INTEGER' },
            ],
          },
        ],
      },
    ],
  },
  // Real Estate
  {
    id: 'real-estate',
    name: 'Real Estate',
    description: 'Manage listings, clients, and transactions',
    category: 'sales',
    folders: [
      { name: '00-inbox' },
      {
        name: '01-listings',
        children: [{ name: 'active' }, { name: 'pending' }, { name: 'sold' }],
      },
      {
        name: '02-buyers',
        children: [{ name: 'active' }, { name: 'closed' }],
      },
      {
        name: '03-transactions',
        children: [{ name: 'in-progress' }, { name: 'completed' }],
      },
      {
        name: '04-marketing',
        children: [
          { name: 'photos' },
          { name: 'descriptions' },
          { name: 'flyers' },
        ],
      },
      {
        name: '05-contacts',
        children: [{ name: 'vendors' }, { name: 'agents' }],
      },
    ],
    agents: [
      {
        name: 'Listing Writer',
        description: 'Writes compelling property descriptions',
      },
      {
        name: 'Buyer Matcher',
        description: 'Matches buyers with suitable properties',
      },
      {
        name: 'Transaction Tracker',
        description: 'Keeps deals on schedule with checklists',
      },
      {
        name: 'Market Analyst',
        description: 'Provides comps and pricing recommendations',
      },
    ],
  },
  // Consulting / Agency
  {
    id: 'consulting',
    name: 'Consulting',
    description: 'Manage client projects, deliverables, and billing',
    category: 'enterprise',
    folders: [
      { name: '00-inbox' },
      {
        name: '01-clients',
        children: [{ name: 'active' }, { name: 'past' }, { name: 'prospects' }],
      },
      {
        name: '02-projects',
        children: [
          { name: 'discovery' },
          { name: 'in-progress' },
          { name: 'delivered' },
        ],
      },
      {
        name: '03-deliverables',
        children: [
          { name: 'reports' },
          { name: 'presentations' },
          { name: 'templates' },
        ],
      },
      {
        name: '04-billing',
        children: [{ name: 'invoices' }, { name: 'time-logs' }],
      },
      {
        name: '05-knowledge',
        children: [{ name: 'frameworks' }, { name: 'case-studies' }],
      },
    ],
    agents: [
      {
        name: 'Proposal Writer',
        description: 'Drafts proposals and scopes of work',
      },
      {
        name: 'Research Analyst',
        description: 'Gathers data and prepares analysis',
      },
      {
        name: 'Deck Builder',
        description: 'Structures presentations and talking points',
      },
      {
        name: 'Project Tracker',
        description: 'Tracks deliverables and deadlines',
      },
    ],
  },
  // Personal Finance / Budgeting
  {
    id: 'personal-finance',
    name: 'Personal Finance',
    description: 'Track expenses, budget, and financial goals',
    category: 'operations',
    folders: [
      { name: '00-inbox' },
      {
        name: '01-budget',
        children: [{ name: 'monthly' }, { name: 'annual' }],
      },
      {
        name: '02-expenses',
        children: [{ name: 'receipts' }, { name: 'subscriptions' }],
      },
      {
        name: '03-income',
        children: [{ name: 'salary' }, { name: 'side-projects' }],
      },
      {
        name: '04-investments',
        children: [{ name: 'portfolio' }, { name: 'research' }],
      },
      {
        name: '05-taxes',
        children: [{ name: 'documents' }, { name: 'deductions' }],
      },
    ],
    agents: [
      {
        name: 'Budget Tracker',
        description: 'Monitors spending against budget categories',
      },
      {
        name: 'Expense Analyzer',
        description: 'Spots trends and suggests savings',
      },
      {
        name: 'Tax Prep',
        description: 'Organizes documents and estimates deductions',
      },
      {
        name: 'Investment Researcher',
        description: 'Summarizes market news and tracks portfolio',
      },
    ],
    databases: [
      {
        name: 'finances',
        description: 'Transactions, budgets, and accounts',
        tables: [
          {
            name: 'transactions',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true },
              { name: 'date', type: 'DATETIME' },
              { name: 'description', type: 'TEXT' },
              { name: 'amount', type: 'REAL' },
              { name: 'category', type: 'TEXT' },
              { name: 'account', type: 'TEXT' },
              { name: 'type', type: 'TEXT' },
            ],
          },
          {
            name: 'budgets',
            columns: [
              { name: 'id', type: 'TEXT', primaryKey: true },
              { name: 'category', type: 'TEXT' },
              { name: 'month', type: 'TEXT' },
              { name: 'planned', type: 'REAL' },
              { name: 'actual', type: 'REAL', default: 0 },
            ],
          },
        ],
      },
    ],
  },
  // Event Planning
  {
    id: 'event-planning',
    name: 'Event Planning',
    description: 'Plan and execute events from small gatherings to conferences',
    category: 'operations',
    folders: [
      { name: '00-inbox' },
      {
        name: '01-events',
        children: [{ name: 'upcoming' }, { name: 'past' }],
      },
      {
        name: '02-planning',
        children: [
          { name: 'timelines' },
          { name: 'checklists' },
          { name: 'run-of-show' },
        ],
      },
      {
        name: '03-vendors',
        children: [{ name: 'venues' }, { name: 'catering' }, { name: 'av' }],
      },
      {
        name: '04-attendees',
        children: [{ name: 'invites' }, { name: 'rsvps' }, { name: 'seating' }],
      },
      {
        name: '05-budget',
        children: [{ name: 'quotes' }, { name: 'invoices' }],
      },
    ],
    agents: [
      {
        name: 'Event Planner',
        description: 'Creates timelines and coordinates logistics',
      },
      {
        name: 'Vendor Manager',
        description: 'Tracks quotes, contracts, and payments',
      },
      {
        name: 'Guest Manager',
        description: 'Handles invites, RSVPs, and communications',
      },
      {
        name: 'Budget Keeper',
        description: 'Tracks expenses against event budget',
      },
    ],
  },
  // Thesis / Dissertation
  {
    id: 'thesis-writing',
    name: 'Thesis Writing',
    description: 'Organize and write your thesis or dissertation',
    category: 'research',
    folders: [
      { name: '00-inbox' },
      {
        name: '01-research',
        children: [
          { name: 'literature' },
          { name: 'notes' },
          { name: 'sources' },
        ],
      },
      {
        name: '02-chapters',
        children: [
          { name: 'introduction' },
          { name: 'literature-review' },
          { name: 'methodology' },
          { name: 'results' },
          { name: 'discussion' },
          { name: 'conclusion' },
        ],
      },
      {
        name: '03-figures',
        children: [{ name: 'charts' }, { name: 'tables' }, { name: 'images' }],
      },
      {
        name: '04-feedback',
        children: [{ name: 'advisor' }, { name: 'committee' }],
      },
      {
        name: '05-submissions',
        children: [{ name: 'drafts' }, { name: 'final' }],
      },
    ],
    agents: [
      {
        name: 'Writing Coach',
        description: 'Reviews drafts and suggests improvements',
      },
      {
        name: 'Citation Manager',
        description: 'Formats references and checks citations',
      },
      {
        name: 'Structure Advisor',
        description: 'Helps organize arguments and flow',
      },
      {
        name: 'Deadline Tracker',
        description: 'Keeps you on schedule with milestones',
      },
    ],
  },
]

export interface TemplateSelectionData {
  template: Template
  selectedAgentNames: string[]
}

interface TemplateGalleryModalProps {
  isOpen: boolean
  onClose: () => void
  onTemplateSelect: (data: TemplateSelectionData) => void
}

export const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({
  isOpen,
  onClose,
  onTemplateSelect,
}) => {
  const { isDark } = useTheme()
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)

  const filteredTemplates = useMemo(() => {
    return WORKSPACE_TEMPLATES.filter((template) => {
      const matchesCategory =
        selectedCategory === 'all' || template.category === selectedCategory
      const matchesSearch =
        !searchQuery ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [selectedCategory, searchQuery])

  const handleSelectTemplate = useCallback((template: Template) => {
    setSelectedTemplate(template)
    setIsConfirming(true)
  }, [])

  const handleConfirm = useCallback(
    (selectedAgentNames: string[]) => {
      if (selectedTemplate) {
        onTemplateSelect({
          template: selectedTemplate,
          selectedAgentNames,
        })
      }
    },
    [selectedTemplate, onTemplateSelect],
  )

  const handleBack = useCallback(() => {
    setIsConfirming(false)
    setSelectedTemplate(null)
  }, [])

  const handleClose = useCallback(() => {
    setIsConfirming(false)
    setSelectedTemplate(null)
    setSelectedCategory('all')
    setSearchQuery('')
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className='fixed inset-0 z-[9999] flex items-center justify-center p-4'
      onClick={handleClose}>
      {/* Backdrop */}
      <div className='absolute inset-0 bg-black/50' />

      {/* Modal */}
      <m.div
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.3, ease: smoothEase }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative flex h-[80vh] max-h-[680px] w-full max-w-[800px] flex-col overflow-hidden rounded-2xl',
          isDark ? 'bg-[#111112]' : 'bg-white',
        )}>
        {/* Header */}
        <div
          className={cn(
            'flex items-center justify-between border-b px-5 py-4',
            isDark ? 'border-white/[0.06]' : 'border-black/[0.05]',
          )}>
          <div className='flex items-center gap-3'>
            {isConfirming && (
              <button
                onClick={handleBack}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                  isDark
                    ? 'text-white/50 hover:bg-white/[0.06] hover:text-white'
                    : 'text-black/40 hover:bg-black/[0.04] hover:text-black',
                )}>
                <RiArrowRightLine className='h-4 w-4 rotate-180' />
              </button>
            )}
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg',
                isDark ? 'bg-white/[0.04]' : 'bg-black/[0.03]',
              )}>
              <RiStackLine
                className='h-4 w-4'
                style={{ color: 'hsl(var(--lazarus-blue))' }}
              />
            </div>
            <div>
              <h2
                className={cn(
                  'text-[14px] font-semibold',
                  isDark ? 'text-white' : 'text-black',
                )}>
                {isConfirming ? selectedTemplate?.name : 'Choose a template'}
              </h2>
              <p
                className={cn(
                  'text-[12px]',
                  isDark ? 'text-white/40' : 'text-black/40',
                )}>
                {isConfirming
                  ? `${selectedTemplate?.agents.length} agents · ${selectedTemplate?.folders.length} folders${selectedTemplate?.databases?.length ? ` · ${selectedTemplate.databases.length} database${selectedTemplate.databases.length > 1 ? 's' : ''}` : ''}`
                  : 'Pre-built workspace configurations'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
              isDark
                ? 'text-white/40 hover:bg-white/[0.06] hover:text-white'
                : 'text-black/40 hover:bg-black/[0.04] hover:text-black',
            )}>
            <RiCloseLine className='h-4 w-4' />
          </button>
        </div>

        {isConfirming && selectedTemplate ? (
          <AgentConfirmationView
            template={selectedTemplate}
            isDark={isDark}
            onConfirm={handleConfirm}
            onBack={handleBack}
          />
        ) : (
          <>
            {/* Search and filters */}
            <div
              className={cn(
                'flex items-center gap-3 border-b px-5 py-3',
                isDark ? 'border-white/[0.06]' : 'border-black/[0.05]',
              )}>
              {/* Search */}
              <div
                className={cn(
                  'flex h-8 flex-1 items-center gap-2 rounded-lg border px-3',
                  isDark
                    ? 'border-white/[0.08] bg-white/[0.03]'
                    : 'border-black/[0.06] bg-black/[0.02]',
                )}>
                <RiSearchLine
                  className={cn(
                    'h-3.5 w-3.5 flex-shrink-0',
                    isDark ? 'text-white/30' : 'text-black/30',
                  )}
                />
                <input
                  type='text'
                  placeholder='Search templates...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    'h-full flex-1 bg-transparent text-[12px] outline-none',
                    isDark
                      ? 'text-white placeholder-white/30'
                      : 'text-black placeholder-black/30',
                  )}
                />
              </div>

              {/* Category pills */}
              <div className='flex items-center gap-1'>
                {TEMPLATE_CATEGORIES.slice(0, 4).map((category) => {
                  const isActive = selectedCategory === category.id
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors',
                        isActive
                          ? isDark
                            ? 'bg-white/[0.1] text-white'
                            : 'bg-black/[0.08] text-black'
                          : isDark
                            ? 'text-white/40 hover:text-white/70'
                            : 'text-black/40 hover:text-black/70',
                      )}>
                      {category.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Template list */}
            <div className='flex-1 overflow-y-auto'>
              <List
                items={filteredTemplates}
                itemsToShow={filteredTemplates.length}
                loadMore={() => {}}
                hasMore={false}
                renderItem={(template) => (
                  <button
                    onClick={() => handleSelectTemplate(template)}
                    className={cn(
                      'flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors',
                      isDark
                        ? 'hover:bg-white/[0.02]'
                        : 'hover:bg-black/[0.01]',
                    )}>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2'>
                        <h4
                          className={cn(
                            'text-[13px] font-medium',
                            isDark ? 'text-white' : 'text-black',
                          )}>
                          {template.name}
                        </h4>
                        {template.featured && (
                          <span
                            className='rounded px-1.5 py-0.5 text-[9px] font-medium'
                            style={{
                              background: 'hsl(var(--lazarus-blue) / 0.1)',
                              color: 'hsl(var(--lazarus-blue))',
                            }}>
                            Featured
                          </span>
                        )}
                      </div>
                      <p
                        className={cn(
                          'mt-0.5 text-[11px]',
                          isDark ? 'text-white/40' : 'text-black/40',
                        )}>
                        {template.description}
                      </p>
                    </div>
                    <div
                      className={cn(
                        'flex items-center gap-3 text-[11px]',
                        isDark ? 'text-white/30' : 'text-black/30',
                      )}>
                      <span>{template.folders.length} folders</span>
                      <span>·</span>
                      <span>{template.agents.length} agents</span>
                      {template.databases && template.databases.length > 0 && (
                        <>
                          <span>·</span>
                          <span>{template.databases.length} db</span>
                        </>
                      )}
                      <RiArrowRightLine className='ml-1 h-3.5 w-3.5' />
                    </div>
                  </button>
                )}
                emptyStateTitle='No templates found'
                emptyStateDescription='Try adjusting your search or filters'
                containerClassName={cn(
                  'rounded-none border-0',
                  isDark ? 'divide-white/[0.04]' : 'divide-black/[0.03]',
                )}
              />
            </div>
          </>
        )}
      </m.div>
    </m.div>
  )
}

interface AgentConfirmationViewProps {
  template: Template
  isDark: boolean
  onConfirm: (selectedAgentNames: string[]) => void
  onBack: () => void
}

const AgentConfirmationView: React.FC<AgentConfirmationViewProps> = ({
  template,
  isDark,
  onConfirm,
  onBack,
}) => {
  const [selectedAgents, setSelectedAgents] = useState<string[]>(
    template.agents.map((a) => a.name),
  )

  const handleConfirm = useCallback(() => {
    onConfirm(selectedAgents)
  }, [onConfirm, selectedAgents])

  const toggleAgent = (agentName: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentName)
        ? prev.filter((n) => n !== agentName)
        : [...prev, agentName],
    )
  }

  return (
    <div className='flex flex-1 flex-col'>
      {/* Folder structure preview */}
      <div
        className={cn(
          'border-b px-5 py-4',
          isDark ? 'border-white/[0.06]' : 'border-black/[0.05]',
        )}>
        <h3
          className={cn(
            'mb-2 text-[11px] font-medium uppercase tracking-wider',
            isDark ? 'text-white/30' : 'text-black/30',
          )}>
          Folder Structure
        </h3>
        <div className='flex flex-wrap gap-2'>
          {template.folders.map((folder) => (
            <div
              key={folder.name}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5',
                isDark
                  ? 'border-white/[0.06] bg-white/[0.02]'
                  : 'border-black/[0.05] bg-black/[0.01]',
              )}>
              <RiFolderLine
                className={cn(
                  'h-3.5 w-3.5',
                  isDark ? 'text-white/40' : 'text-black/40',
                )}
              />
              <span
                className={cn(
                  'text-[11px] font-medium',
                  isDark ? 'text-white/70' : 'text-black/70',
                )}>
                {folder.name}
              </span>
              {folder.children && (
                <span
                  className={cn(
                    'text-[10px]',
                    isDark ? 'text-white/30' : 'text-black/30',
                  )}>
                  ({folder.children.length})
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Database preview (if template has databases) */}
      {template.databases && template.databases.length > 0 && (
        <div
          className={cn(
            'border-b px-5 py-4',
            isDark ? 'border-white/[0.06]' : 'border-black/[0.05]',
          )}>
          <h3
            className={cn(
              'mb-2 text-[11px] font-medium uppercase tracking-wider',
              isDark ? 'text-white/30' : 'text-black/30',
            )}>
            Databases
          </h3>
          <div className='flex flex-wrap gap-2'>
            {template.databases.map((database) => (
              <div
                key={database.name}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5',
                  isDark
                    ? 'border-[hsl(var(--lazarus-blue))]/20 bg-[hsl(var(--lazarus-blue))]/5'
                    : 'border-[hsl(var(--lazarus-blue))]/15 bg-[hsl(var(--lazarus-blue))]/5',
                )}>
                <RiDatabase2Line
                  className='h-3.5 w-3.5'
                  style={{ color: 'hsl(var(--lazarus-blue))' }}
                />
                <span
                  className={cn(
                    'text-[11px] font-medium',
                    isDark ? 'text-white/70' : 'text-black/70',
                  )}>
                  {database.name}
                </span>
                <span
                  className={cn(
                    'text-[10px]',
                    isDark ? 'text-white/30' : 'text-black/30',
                  )}>
                  ({database.tables.length} tables)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent section header */}
      <div
        className={cn(
          'border-b px-5 py-3',
          isDark ? 'border-white/[0.06]' : 'border-black/[0.05]',
        )}>
        <h3
          className={cn(
            'text-[11px] font-medium uppercase tracking-wider',
            isDark ? 'text-white/30' : 'text-black/30',
          )}>
          Agents
        </h3>
      </div>

      {/* Agent list */}
      <div className='flex-1 overflow-y-auto'>
        {template.agents.map((agent, index) => {
          const isSelected = selectedAgents.includes(agent.name)
          return (
            <m.button
              key={agent.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              onClick={() => toggleAgent(agent.name)}
              className={cn(
                'flex w-full items-center gap-4 border-b px-5 py-3.5 text-left transition-colors',
                isDark
                  ? 'border-white/[0.04] hover:bg-white/[0.02]'
                  : 'border-black/[0.03] hover:bg-black/[0.01]',
                isSelected && (isDark ? 'bg-white/[0.02]' : 'bg-black/[0.01]'),
              )}>
              {/* Checkbox */}
              <div
                className={cn(
                  'h-4.5 w-4.5 flex flex-shrink-0 items-center justify-center rounded-md border-2 transition-all',
                  isSelected
                    ? 'border-[hsl(var(--lazarus-blue))] bg-[hsl(var(--lazarus-blue))]'
                    : isDark
                      ? 'border-white/20'
                      : 'border-black/15',
                )}>
                {isSelected && (
                  <RiCheckLine className='h-2.5 w-2.5 text-white' />
                )}
              </div>

              {/* Agent info */}
              <div className='flex-1'>
                <h4
                  className={cn(
                    'text-[13px] font-medium',
                    isDark ? 'text-white' : 'text-black',
                  )}>
                  {agent.name}
                </h4>
                <p
                  className={cn(
                    'mt-0.5 text-[11px]',
                    isDark ? 'text-white/40' : 'text-black/40',
                  )}>
                  {agent.description}
                </p>
              </div>

              {/* User icon */}
              <RiUser6Fill
                className={cn(
                  'h-4 w-4 flex-shrink-0',
                  isSelected
                    ? 'text-[hsl(var(--lazarus-blue))]'
                    : isDark
                      ? 'text-white/20'
                      : 'text-black/15',
                )}
              />
            </m.button>
          )
        })}
      </div>

      {/* Footer */}
      <div
        className={cn(
          'flex items-center justify-between border-t px-5 py-4',
          isDark ? 'border-white/[0.06]' : 'border-black/[0.05]',
        )}>
        <p
          className={cn(
            'text-[12px]',
            isDark ? 'text-white/40' : 'text-black/40',
          )}>
          {selectedAgents.length} of {template.agents.length} selected
        </p>
        <div className='flex items-center gap-2'>
          <Button variant='secondary' size='small' onClick={onBack}>
            Back
          </Button>
          <Button
            variant='active'
            size='small'
            onClick={handleConfirm}
            disabled={selectedAgents.length === 0}
            iconLeft={<RiFlashlightLine className='h-3.5 w-3.5' />}>
            Create
          </Button>
        </div>
      </div>
    </div>
  )
}

export default TemplateGalleryModal
