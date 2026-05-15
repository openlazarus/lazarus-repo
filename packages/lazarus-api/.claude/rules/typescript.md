# TypeScript Standards

## Core Rules
- Explicit typing on ALL functions (parameters and return types)
- Strict mode enabled
- NEVER use `any` — use `unknown` or proper types

## Types vs Interfaces vs Classes

- **TYPE** for: response objects, union types, props, type aliases
- **INTERFACE** for: service contracts, repository contracts, class implementation contracts
- **CLASS** for: service/repository/controller implementations

## Path Aliases (MANDATORY)

NEVER use relative imports. Use path aliases via `@*` mapping.

```typescript
// Bad
import { AgentService } from '../../../domains/agent/service/agent.service'

// Good
import { AgentService } from '@domains/agent/service/agent.service'
import { createLogger } from '@utils/logger'
import { authMiddleware } from '@middleware/auth'
```

tsconfig.json: `"paths": { "@*": ["./src/*"] }`

## Immutability
- `const` always, `readonly` for class properties
- `.map()`, `.filter()`, `.reduce()` — not `.push()`, `.splice()`
- Return new objects instead of mutating
