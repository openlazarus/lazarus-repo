# Lazarus UI

Frontend for the Lazarus AI agent platform. Built with Next.js 15, React, TailwindCSS, and shadcn/ui.

## Features

- Workspace-centric agent management
- Real-time chat with AI agents (SSE streaming)
- File management with live editing
- MCP source configuration with OAuth
- Team management and invitations
- Billing and credit usage dashboard
- Discord, Slack, and WhatsApp integration settings
- Dark mode support
- Responsive design

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

**Required variables:**

| Variable                        | Description          |
| ------------------------------- | -------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key    |
| `NEXT_PUBLIC_API_URL`           | Backend API URL      |
| `NEXT_PUBLIC_APP_URL`           | Frontend app URL     |

**Optional variables:**

| Variable                             | Description             |
| ------------------------------------ | ----------------------- |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key  |
| `NEXT_PUBLIC_POSTHOG_KEY`            | PostHog analytics key   |
| `NEXT_PUBLIC_DISCORD_CLIENT_ID`      | Discord OAuth client ID |
| `NEXT_PUBLIC_SLACK_CLIENT_ID`        | Slack OAuth client ID   |

See `.env.example` for the full list.

### 3. Start development

```bash
npm run dev
```

The app starts on `http://localhost:3000`.

## Project Structure

```
app/                   # Next.js app router pages
components/
  features/            # Feature-specific components
  ui/                  # Reusable UI components (shadcn/ui)
hooks/                 # Custom React hooks
  core/                # Core hooks (useWorkspace, useAuth)
lib/                   # Utilities, API client
state/                 # Global state management
constants/             # App constants
types/                 # TypeScript types
supabase/              # Supabase migrations and edge functions
```

## Key Patterns

- **`useWorkspace` hook**: Always use `selectedWorkspace` for workspace-scoped data
- **API endpoints**: Always use `workspaceId`, never `userId` for resource access
- **API client**: `api` client handles auth headers automatically

## Scripts

| Script                 | Description              |
| ---------------------- | ------------------------ |
| `npm run dev`          | Start development server |
| `npm run build`        | Build for production     |
| `npm start`            | Start production server  |
| `npm run lint`         | Run ESLint               |
| `npm run lint:fix`     | Fix ESLint issues        |
| `npm run format`       | Format with Prettier     |
| `npm run format:check` | Check formatting         |
| `npm run type-check`   | TypeScript type check    |
| `npm test`             | Run tests                |
| `npm run qa`           | Lint + type-check + test |
| `npm run qa:fix`       | Fix lint + format        |
