# Frontend Contributing Guide

## Development Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd packages/lazarus-ui
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in required values (Supabase URL, anon key, API URL at minimum)

# 3. Start dev server
npm run dev
```

The dev server starts Next.js and prints a QR code for mobile testing. Use `npm run dev:no-network` for a plain `next dev` without the QR helper.

---

## Project Structure

```
packages/lazarus-ui/
  app/              # Next.js App Router pages and layouts
  components/
    ui/             # Reusable design-system primitives (shadcn-based)
    features/       # Domain-specific components (agents, workspaces, etc.)
  hooks/
    core/           # App-wide hooks (useWorkspace, useChat, useConversation, etc.)
    data/           # Generic data-fetching hooks (useApiRequest, useSupabaseQuery, etc.)
    features/       # Domain-specific hooks (agents, mcp, workspace, labels, etc.)
    ui/             # UI behavior hooks (useTheme, useDropZone, useResizableColumn, etc.)
    workspace/      # Workspace file/config hooks
  lib/              # Utilities (api-client, supabase client, helpers)
  services/         # Service-layer modules
  store/            # Zustand stores
  state/            # App state management
  model/            # TypeScript types and interfaces
  styles/           # Global CSS / Sass
  utils/            # Pure utility functions
  emails/           # Email templates
  tests/            # Test files
```

See `docs/architecture.md` for detailed architecture documentation.

---

## Code Standards

### Components

- Always add `'use client'` directive to client components.
- Create atomic, single-purpose components. One component, one concern.
- Max ~15 lines per function. Extract helpers when a function grows.
- Use PascalCase for component names and files (`MyComponent.tsx` or `my-component.tsx`).

### Hooks

- Always extract reusable logic into custom hooks.
- Prefix hook names with `use-` (file) and `use` (function): `use-workspace.ts` exports `useWorkspace`.
- Reuse existing data hooks -- never make direct API calls from components.
- Use `useWorkspace().selectedWorkspace` for workspace context, never `useAuth` for resource endpoints.

### API Calls

- All data access must go through hooks (e.g. `useAuthGet`, `useAuthSupabaseQuery`). Do not import `apiClient` directly in components or services.
- Never use raw `fetch` or standalone `axios` for backend calls.
- Endpoint pattern: `/api/workspaces/${workspaceId}/{resource}`. Always scope by workspace, never by user.
- Some older code still imports `apiClient` directly -- these will be migrated to hooks. See [hooks.md](hooks.md) for the full pattern.

### TypeScript

- Use explicit types. Avoid `any`.
- Use prefix conventions: `T` for type aliases, `I` for interfaces, `E` for enums.
- Interfaces should define methods only, not data properties.
- Use handler maps instead of `switch`/`case` for dispatching logic.
- Use static imports only. Never use `await import()`.

### Styling

- TailwindCSS for all styling. Use `cn()` from `@/lib/utils` for conditional classes.
- Use shadcn CSS variables for theme colors (`bg-background`, `text-foreground`, etc.).
- Dark mode via `useTheme` hook from `@/hooks/ui/use-theme`.

---

## NPM Scripts

| Script           | Command                                                         | Description                              |
| ---------------- | --------------------------------------------------------------- | ---------------------------------------- |
| `dev`            | `node dev-with-qr.mjs`                                          | Start dev server with QR code for mobile |
| `dev:no-network` | `next dev`                                                      | Start dev server without QR              |
| `build`          | `next build`                                                    | Production build                         |
| `start`          | `next start`                                                    | Start production server                  |
| `start:prod`     | `next start -p ${PORT:-3000}`                                   | Start production on configurable port    |
| `lint`           | `eslint .`                                                      | Run ESLint                               |
| `lint:fix`       | `eslint . --fix`                                                | Run ESLint with auto-fix                 |
| `format`         | `prettier --write "**/*.{js,jsx,ts,tsx,css,scss,md,json,html}"` | Format all files                         |
| `format:check`   | `prettier --check ...`                                          | Check formatting without writing         |
| `type-check`     | `tsc --noEmit`                                                  | TypeScript type checking                 |
| `test`           | `jest`                                                          | Run tests                                |
| `test:watch`     | `jest --watch`                                                  | Run tests in watch mode                  |
| `test:coverage`  | `jest --coverage`                                               | Run tests with coverage report           |
| `qa`             | `lint + type-check + test`                                      | Full quality check                       |
| `qa:fix`         | `lint:fix + format`                                             | Auto-fix lint and formatting             |
| `qa:full`        | `qa:fix + test`                                                 | Fix then test                            |
| `clean`          | `rm -rf .next node_modules coverage`                            | Remove build artifacts                   |
| `clean:cache`    | `rm -rf .next node_modules/.cache`                              | Clear caches only                        |
| `reset`          | `clean + reinstall`                                             | Full reset                               |
| `deps:check`     | `npx npm-check-updates`                                         | Check for outdated deps                  |
| `deps:update`    | `npx npm-check-updates -u && npm install`                       | Update all deps                          |

---

## Pre-Commit Hooks

[Lefthook](https://github.com/evilmartians/lefthook) runs `lint-staged` on every commit via the `pre-commit` hook defined in `lefthook.yml`.

**What runs:**

| File pattern                | Commands                                |
| --------------------------- | --------------------------------------- |
| `*.{js,jsx,ts,tsx}`         | `eslint --fix`, then `prettier --write` |
| `*.{css,scss,md,json,html}` | `prettier --write`                      |

Configuration files:

- `lefthook.yml` -- hook definition
- `.lintstagedrc.js` -- lint-staged rules
- `.prettierrc` -- Prettier config
- `eslint.config.mjs` -- ESLint flat config

### ESLint Rules (Summary)

- `no-console`: warn (only `console.warn` and `console.error` allowed)
- `no-unused-vars` / `@typescript-eslint/no-unused-vars`: warn (underscore-prefixed ignored)
- `@typescript-eslint/no-explicit-any`: off
- `no-empty`, `no-useless-catch`, `no-useless-escape`, `no-redeclare`: warn

### Prettier Config

| Option            | Value                                                             |
| ----------------- | ----------------------------------------------------------------- |
| Semi              | `false`                                                           |
| Single quote      | `true`                                                            |
| JSX single quote  | `true`                                                            |
| Print width       | `80`                                                              |
| Trailing comma    | `all`                                                             |
| Tab width         | `2`                                                               |
| Use tabs          | `false`                                                           |
| Arrow parens      | `always`                                                          |
| Bracket spacing   | `true`                                                            |
| Bracket same line | `true`                                                            |
| Plugins           | `prettier-plugin-organize-imports`, `prettier-plugin-tailwindcss` |

---

## Commit Messages

Use conventional commits, title only, no scope, no description body:

```
feat: add agent trigger scheduling
fix: correct workspace selector loading state
refactor: extract file upload into hook
chore: update dependencies
docs: add component guide
```

---

## Pre-Push Checklist

Before pushing a branch or opening a PR:

- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` completes successfully
- [ ] `npm run test` passes
- [ ] No `console.log` statements (use `console.warn` or `console.error` if needed)
- [ ] New components follow workspace-centric patterns (see `docs/components.md`)
- [ ] Reusable logic extracted into hooks
- [ ] Loading and error states handled explicitly
- [ ] No direct `fetch` calls -- use `api` client
- [ ] Commit messages follow conventional commit format
