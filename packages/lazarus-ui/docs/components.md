# Component Guide

## Organization

Components live in two directories under `components/`:

| Directory              | Purpose                                              | Import alias                     |
| ---------------------- | ---------------------------------------------------- | -------------------------------- |
| `components/ui/`       | Reusable, design-system primitives (shadcn/ui based) | `@/components/ui`                |
| `components/features/` | Domain-specific, composed from ui primitives         | `@/components/features/{domain}` |

---

## UI Components (`components/ui/`)

Built on [shadcn/ui](https://ui.shadcn.com) (New York style, Zinc base color, CSS variables enabled). Radix UI primitives power dialog, dropdown, select, avatar, label, slider, and switch.

### Barrel Export

Most ui components are re-exported from `components/ui/index.ts`:

```tsx
import { Button, Input, Modal, Select, Tag, Toggle } from '@/components/ui'
```

Components not in the barrel can be imported directly:

```tsx
import { Dialog } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
```

### Key Components

| Component         | File(s)                  | Notes                                                                              |
| ----------------- | ------------------------ | ---------------------------------------------------------------------------------- |
| Button            | `button.tsx`, `button/`  | Primary action element                                                             |
| Card              | `card.tsx`               | Content container                                                                  |
| Dialog            | `dialog.tsx`             | Radix-based modal dialog primitive                                                 |
| Modal             | `modal.tsx`              | Higher-level modals: `DefaultModal`, `ConfirmModal`, `CreateModal`                 |
| ConfirmDialog     | `confirm-dialog.tsx`     | Wraps `ConfirmModal` with danger/default variants                                  |
| Avatar            | `avatar.tsx`             | Radix avatar with fallback                                                         |
| AvatarUpload      | `avatar-upload.tsx`      | Avatar with upload capability                                                      |
| Badge             | `badge.tsx`              | Status/label badge                                                                 |
| Tag               | `tag.tsx`                | Dismissible tag                                                                    |
| Input             | `input.tsx`              | Text input variants: `Input`, `SearchInput`, `CapsuleSearchInput`, `PasswordInput` |
| TextArea          | `textarea.tsx`           | Multi-line input                                                                   |
| Select            | `select.tsx`             | Radix select dropdown                                                              |
| DropdownMenu      | `dropdown-menu.tsx`      | Context/action menu                                                                |
| Tabs              | `tabs.tsx`               | Tab navigation (`Tabs`, `TabPanel`)                                                |
| DraggableTabs     | `draggable-tabs.tsx`     | Sortable tabs via dnd-kit                                                          |
| DropOverlay       | `drop-overlay.tsx`       | File drop zone overlay                                                             |
| Tooltip           | `tooltip.tsx`            | Hover tooltip                                                                      |
| Toggle            | `toggle.tsx`             | Boolean toggle switch                                                              |
| Slider            | `slider.tsx`             | Radix slider                                                                       |
| Label             | `label.tsx`              | Form label                                                                         |
| Spinner           | `spinner.tsx`            | Loading spinner                                                                    |
| ProgressBar       | `progress-bar.tsx`       | Progress indicator                                                                 |
| ContributionGraph | `contribution-graph.tsx` | GitHub-style activity heatmap                                                      |
| ActivityTimeline  | `activity-timeline.tsx`  | Chronological event list                                                           |
| Stack             | `stack.tsx`              | Flex layout helper (`Stack`, `StackItem`)                                          |
| ListDetailView    | `list-detail-view/`      | Master-detail split layout                                                         |
| Typography        | `typography.tsx`         | Text styling primitives                                                            |
| Logo              | `logo.tsx`               | Brand logo                                                                         |
| LazarusLoader     | `lazarus-loader.tsx`     | Full-page loading state                                                            |

### Compound / Directory Components

Some ui components are directories with internal structure:

| Directory           | Contents                             |
| ------------------- | ------------------------------------ |
| `button/`           | Button variants and compositions     |
| `chat/`             | Chat bubble, message rendering       |
| `csv/`              | CSV viewer/editor                    |
| `design/`           | Design tokens, color system          |
| `flow/`             | ReactFlow-based node editor          |
| `icons/`            | Icon set                             |
| `item-list/`        | Generic list with selection          |
| `lexical/`          | Lexical rich-text editor integration |
| `list/`             | List primitives                      |
| `list-detail-view/` | Two-panel master-detail layout       |
| `mcp/`              | MCP tool/server UI                   |
| `mermaid/`          | Mermaid diagram renderer             |
| `message-bar/`      | Chat input bar                       |
| `slides/`           | Presentation slide viewer            |
| `spark-text/`       | Animated text effects                |
| `spreadsheet/`      | Spreadsheet viewer (xlsx)            |

---

## Feature Components (`components/features/`)

Domain-specific components organized by feature area:

| Domain        | Path                          | Key Components                                                                                                                                     |
| ------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agents        | `features/agents/`            | `agent-list`, `agent-detail-view`, `create-agent-wizard`, `trigger-list`, `create-trigger-modal`, `email-config`, `whatsapp-config`, `guardrails/` |
| Workspaces    | `features/workspaces/`        | `create-workspace-modal`, `template-gallery-modal`, `workspace-appearance-editor`, `workspace-template-selector`                                   |
| Activity      | `features/activity/`          | `execution-card`, `global-execution-indicator`                                                                                                     |
| Dashboard     | `features/dashboard/`         | `dashboard-page-layout`, `workspace-selector`                                                                                                      |
| Document      | `features/document/`          | `document-editor-with-diff`                                                                                                                        |
| Editors       | `features/editors/`           | `base-editor-layout`, `mindmap-editor`                                                                                                             |
| Sources (MCP) | `features/sources/`           | `add-source-view`, `mcp-source-card`, `mcp-source-detail`, `mcp-preset-card`, `tools-list`, `oauth-authorization`, `env-editor-dialog`             |
| Invitations   | `features/invitations/`       | Team invitation management                                                                                                                         |
| Waitlist      | `features/waitlist/`          | Waitlist signup                                                                                                                                    |
| Error         | `features/error-boundary.tsx` | Global error boundary                                                                                                                              |
| Loading       | `features/loading-screen.tsx` | Full-page loading screen                                                                                                                           |

---

## Styling

### TailwindCSS + CSS Variables

The project uses TailwindCSS 3 with shadcn theme tokens defined as CSS variables in `app/globals.css`. The `tailwind.config.ts` maps these variables to Tailwind classes.

```tsx
// Use Tailwind classes referencing theme variables
<div className="bg-background text-foreground border-border" />
<button className="bg-primary text-primary-foreground hover:bg-primary/90" />
```

### Dark Mode

Dark mode is handled via the `use-theme` hook:

```tsx
import { useTheme } from '@/hooks/ui/use-theme'

const { isDark } = useTheme()
```

Many components accept an `isDark` prop for conditional styling. Prefer using theme CSS variables over manual dark/light branching where possible.

### Utility Function

Use `cn()` from `@/lib/utils` for conditional class merging (clsx + tailwind-merge):

```tsx
import { cn } from '@/lib/utils'

;<div className={cn('base-class', isActive && 'active-class')} />
```

---

## Component Patterns

### Client Components

All interactive components must include the `'use client'` directive:

```tsx
'use client'

import { useState } from 'react'

export function MyComponent() {
  // ...
}
```

### Workspace Context

Always get workspace context from the `useWorkspace` hook. Never pass `workspaceId` through deep prop chains:

```tsx
import { useWorkspace } from '@/hooks/core/use-workspace'

const { selectedWorkspace } = useWorkspace()
const workspaceId = selectedWorkspace?.id
```

### Loading and Error States

Always handle missing data gracefully. Set `loading` to `false` before early returns:

```tsx
useEffect(() => {
  if (!workspaceId || !agentId) {
    setLoading(false)
    return
  }

  setLoading(true)
  api
    .get(`/api/workspaces/${workspaceId}/agents/${agentId}`)
    .then(setData)
    .catch(console.error)
    .finally(() => setLoading(false))
}, [workspaceId, agentId])
```

### API Calls

Use the centralized `api` client from `@/lib/api-client`. It handles JWT token caching, automatic refresh, and auth error redirects. Never use raw `fetch` for backend calls:

```tsx
import api from '@/lib/api-client'

// GET
const agents = await api.get(`/api/workspaces/${workspaceId}/agents`)

// POST
await api.post(`/api/workspaces/${workspaceId}/agents`, { name: 'My Agent' })
```

### Data Hooks

Prefer existing data hooks over direct API calls in components. Hooks live in `hooks/data/` (generic) and `hooks/features/` (domain-specific):

```tsx
// Generic data hooks
import { useApiRequest } from '@/hooks/data/use-api-request'
import { useSupabaseQuery } from '@/hooks/data/use-supabase-query'

// Feature hooks (preferred for domain logic)
// hooks/features/agents/, hooks/features/workspace/, etc.
```
