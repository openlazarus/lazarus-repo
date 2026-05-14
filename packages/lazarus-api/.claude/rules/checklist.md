# Code Review Checklist

Use this checklist before committing code.

## Architecture
- [ ] Domain-first structure followed (domains/{name}/controller, service, repository, types)
- [ ] No circular dependencies
- [ ] Services depend on repository interfaces, not implementations
- [ ] Routes in routes/ wire to domain controllers

## Naming
- [ ] Functions use camelCase with verb-noun pattern
- [ ] Classes use PascalCase
- [ ] Interfaces prefixed with `I`
- [ ] Types prefixed with `T`
- [ ] Constants use UPPER_SNAKE_CASE
- [ ] Files use kebab-case

## TypeScript
- [ ] No `any` types
- [ ] All function parameters and return types explicit
- [ ] Path aliases used (`@domains/...`, `@utils/...` — no `../` imports)
- [ ] Immutability maintained (readonly, const)

## Code Quality
- [ ] All functions ≤15 lines
- [ ] Single Responsibility Principle followed
- [ ] No code duplication
- [ ] No redundant comments
- [ ] Error handling with custom error classes

## Security
- [ ] Input validation performed
- [ ] Authentication/authorization checked
- [ ] Secrets not exposed

## Before Push
```bash
npm run format:check
npm run lint
npm run build
```
