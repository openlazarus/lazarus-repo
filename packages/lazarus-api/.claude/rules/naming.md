# Naming Conventions

## Variables and Functions
- **Functions**: `camelCase` — verb + noun (`createUser`, `findUserById`, `validateEmail`)
- **Variables**: `camelCase` (`userData`, `userId`, `isValid`)
- **Constants**: `UPPER_SNAKE_CASE` (`MAX_RETRY_ATTEMPTS`, `DEFAULT_PAGE_SIZE`)

## Classes and Types
- **Classes**: `PascalCase` (`UserService`, `AgentRepository`)
- **Interfaces**: `I` prefix (`IUserService`, `IAgentRepository`)
- **Types**: `T` prefix (`TUserResponse`, `TAgentConfig`)
- **Enums**: `E` prefix (`EUserRole`, `EOrderStatus`)

## Folders
- **Top-level categories**: plural (`domains/`, `routes/`, `errors/`, `utils/`)
- **Domain folders**: singular (`domains/agent/`, `domains/billing/`)
- **Layer folders inside domains**: singular (`controller/`, `service/`, `repository/`, `types/`)
- **Infrastructure**: singular (`infrastructure/`, `middleware/`, `shared/`)

## Files
All files use **kebab-case**.

- Controllers: `[name].controller.ts`
- Services: `[name].service.ts`
- Repositories: `[name].repository.ts`
- Types: `[name].types.ts`
- Schemas: `[name].schemas.ts`
- Routes: `[name].route.ts`
- Middleware: `[name].middleware.ts`

## Function Naming Patterns

| Pattern | Use |
|---------|-----|
| `create[Entity]` | Create new |
| `get[Entity]ById` | Retrieve single |
| `find[Entity]By[Criteria]` | Query with criteria |
| `update[Entity]` | Update existing |
| `delete[Entity]` | Delete |
| `validate[Thing]` | Validate input |
| `is[Condition]` / `has[Thing]` | Boolean checks |
| `map[From]To[To]` | Transform data |
