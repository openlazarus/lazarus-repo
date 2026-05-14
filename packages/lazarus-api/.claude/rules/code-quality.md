# Code Quality Standards

## Function Rules (STRICT)

### Maximum 15 Lines Per Function
Every function must be ≤15 lines (excluding blank lines and comments).
Break long functions into atomic helpers that each do ONE thing.

### Function Style
- **Class methods**: regular syntax (`async methodName()`)
- **Standalone/utility functions**: arrow syntax (`const fn = () => {}`)
- **Callbacks**: arrow syntax

## SOLID Principles

- **Single Responsibility**: Each class/function does ONE thing
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Interfaces properly implemented
- **Interface Segregation**: Small, focused interfaces
- **Dependency Inversion**: Depend on abstractions (interfaces), not concretions

## Maps Over Switch Statements

Use handler maps instead of switch for dispatching:

```typescript
// Bad ❌
switch (status) {
  case 'pending': return 'Pending';
  case 'shipped': return 'Shipped';
}

// Good ✅
const STATUS_MESSAGES: Record<string, string> = {
  pending: 'Pending',
  shipped: 'Shipped',
};
const getMessage = (status: string): string => STATUS_MESSAGES[status] ?? 'Unknown';
```

Exception: switch is OK for TypeScript discriminated unions where type narrowing is needed.

## Comments

- **Default to NO comments** — code should be self-documenting
- Comment **WHY**, never **WHAT**
- NEVER add redundant comments like "User Service Interface" or "Creates a new user"
- OK to comment: complex algorithms, business logic context, TODOs with assignee, warnings

## Error Handling

- Custom error classes extending base `HttpException`
- Use `asyncHandler` wrapper for route handlers
- Throw specific errors: `NotFoundException`, `ValidationException`, `ConflictException`
- Global error handler middleware catches all

## Arrow Functions vs Regular Methods

- **Arrow functions for**: standalone functions, callbacks, utility functions, array methods
- **Regular methods for**: class methods, constructors

## Immutability

- Use `const` always, `readonly` for class properties
- Array ops: `.map()`, `.filter()`, `.reduce()` — not `.push()`, `.splice()`
- Return new objects instead of mutating
