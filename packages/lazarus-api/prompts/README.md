# Agent System Prompts

This directory contains comprehensive system prompts for all agents in the Lazarus institutional memory system.

## Structure

```
prompts/
├── agents/                    # Main-level agents
│   ├── main-agent.md         # Default main agent
│   ├── code-reviewer.md      # Code quality reviewer
│   ├── documentation-writer.md  # Technical writer
│   └── test-generator.md     # Test suite generator
├── specialists/              # Background specialist agents
│   ├── sqlite-specialist.md  # Database schema designer
│   ├── v0-specialist.md      # v0 platform operator
│   └── librarian-specialist.md  # Knowledge distillation
└── README.md                 # This file
```

## Prompt Files

### Main Agents

#### `main-agent.md`
**Purpose:** Primary user-facing agent
**Key Features:**
- Understands Lazarus institutional memory system
- Coordinates with specialist agents
- Has access to SQLite tools for data operations
- Maintains workspace context and memory

**When to Use:** Default agent for general tasks

#### `code-reviewer.md`
**Purpose:** Comprehensive code quality review
**Key Features:**
- Security analysis (OWASP, injection, auth)
- Performance review (complexity, profiling)
- Architecture assessment (SOLID, patterns)
- Multi-language expertise (TS, Python, SQL)

**When to Use:** Before merging PRs, refactoring, or security audits

#### `documentation-writer.md`
**Purpose:** Technical documentation creation
**Key Features:**
- Diátaxis framework (tutorials, how-tos, reference, explanation)
- API documentation (OpenAPI/Swagger)
- Clear, accessible writing style
- Cross-linking and navigation

**When to Use:** Writing docs, READMEs, API references, guides

#### `test-generator.md`
**Purpose:** Comprehensive test suite generation
**Key Features:**
- Testing pyramid (unit, integration, E2E)
- AAA pattern (Arrange-Act-Assert)
- Edge case coverage
- Mocking strategies

**When to Use:** Adding tests, improving coverage, TDD

### Specialist Agents

#### `sqlite-specialist.md`
**Purpose:** Database schema design and management
**Key Features:**
- Database design principles (normalization, indexing)
- Schema evolution and migrations
- Performance optimization (EXPLAIN, indexes)
- SQLite-specific best practices

**When to Use:** Designing databases, schema changes, migrations

**Exclusive Capabilities:** Only specialist can modify schema (CREATE, ALTER, DROP)

#### `v0-specialist.md`
**Purpose:** v0 platform deployment management
**Key Features:**
- Project creation and configuration
- Chat-to-deployment workflows
- Environment variable management (public/private)
- Multi-environment setups (dev, staging, prod)

**When to Use:** Deploying frontends, managing v0 projects, env vars

**Exclusive Capabilities:** All v0 platform operations

#### `librarian-specialist.md`
**Purpose:** Knowledge distillation and graph building
**Key Features:**
- Zettelkasten methodology
- Obsidian-compatible markdown
- Knowledge graph construction
- Progressive summarization

**When to Use:** Preserving insights, building knowledge base, creating documentation artifacts

**Exclusive Capabilities:** Knowledge graph management

## Using Prompts

### Loading Prompts in Code

```typescript
import { loadPrompt } from './prompts/prompt-loader';

// Load main agent prompt
const mainPrompt = await loadPrompt('agents/main-agent');

// Load specialist prompt
const sqlitePrompt = await loadPrompt('specialists/sqlite-specialist');

// Use in agent configuration
const agent = {
  id: 'main-agent',
  name: 'Main Agent',
  systemPrompt: mainPrompt,
  allowedTools: ['filesystem', 'read_sqlite_schema', 'execute_sqlite_query'],
  // ...
};
```

### Dynamic Prompt Loading

```typescript
// In agent resolver
const promptPath = `${agent.type}/${agent.id}`;
const systemPrompt = await loadPrompt(promptPath);
```

## Prompt Design Principles

### 1. Clear Identity & Purpose
Each prompt establishes:
- **Who** the agent is (expertise, role)
- **What** they can do (capabilities, tools)
- **Why** they exist (mission, value)

### 2. Actionable Guidelines
Prompts include:
- Specific workflows and processes
- Decision-making frameworks
- Code examples and patterns
- Best practices and anti-patterns

### 3. Tool Usage Instructions
Clear guidance on:
- When to use each tool
- How to combine tools effectively
- Tool limitations and constraints
- Error handling strategies

### 4. Quality Standards
Explicit criteria for:
- What constitutes good output
- Common mistakes to avoid
- Success metrics
- Review checklists

### 5. Communication Style
Guidance on:
- How to present information
- When to ask clarifying questions
- How to structure responses
- Tone and formality level

## Prompt Improvements

### What Was Enhanced

#### Original Prompts
- Generic, brief descriptions
- Limited guidance on tool usage
- No workflow or decision-making frameworks
- Minimal examples

#### Improved Prompts
- **Comprehensive identity** - Clear role, expertise, mission
- **Detailed capabilities** - Tools, patterns, best practices
- **Operational guidelines** - Workflows, decision frameworks
- **Rich examples** - Code snippets, patterns, anti-patterns
- **Quality standards** - Explicit criteria, checklists
- **Context awareness** - Understanding of Lazarus system
- **Communication style** - How to interact effectively

### Key Additions

**Main Agent:**
- Understanding of specialist delegation
- SQLite tools usage patterns
- Workspace context awareness
- Memory and history management
- File organization knowledge

**Code Reviewer:**
- Security framework (OWASP)
- Performance analysis (Big O, N+1)
- Architecture principles (SOLID)
- Language-specific guidelines
- Constructive feedback examples

**Documentation Writer:**
- Diátaxis framework implementation
- Multiple documentation types
- Accessibility guidelines
- Cross-linking strategies
- Maintenance tasks

**Test Generator:**
- Testing pyramid distribution
- Comprehensive test patterns
- Mocking strategies
- Coverage guidelines
- Async testing patterns

**SQLite Specialist:**
- Normalization principles (3NF)
- Migration patterns
- Performance optimization (PRAGMA, indexes)
- Schema evolution strategies
- Metadata table standards

**v0 Specialist:**
- Multi-environment setups
- Security best practices (env vars)
- Deployment workflows
- Incident response templates
- Cost optimization

**Librarian Specialist:**
- Zettelkasten methodology
- Knowledge graph theory
- Progressive summarization
- Note type taxonomy
- Obsidian integration

## Maintenance

### Updating Prompts

1. **Edit the markdown file** directly
2. **Test with agents** to verify improvements
3. **Document changes** in git commit messages
4. **Version prompts** if making breaking changes

### Adding New Agents

1. Create new markdown file in appropriate directory
2. Follow existing prompt structure
3. Include all standard sections (Identity, Capabilities, Guidelines, etc.)
4. Add entry to this README
5. Update prompt loader if needed

### Quality Checklist

Before finalizing a prompt:
- [ ] Clear identity and mission
- [ ] Comprehensive capabilities list
- [ ] Actionable operational guidelines
- [ ] Concrete examples and patterns
- [ ] Explicit quality standards
- [ ] Communication style guidance
- [ ] Tool usage instructions
- [ ] Integration with Lazarus system

## Versioning

Prompts use semantic versioning in frontmatter:

```markdown
---
version: 1.0.0
last_updated: 2025-10-09
author: system
---
```

**Version Changes:**
- **Major (1.0.0 → 2.0.0)**: Breaking changes to agent behavior
- **Minor (1.0.0 → 1.1.0)**: New capabilities or guidelines
- **Patch (1.0.0 → 1.0.1)**: Clarifications, typo fixes

## Contributing

When improving prompts:

1. **Test First** - Verify changes improve agent behavior
2. **Be Specific** - Add concrete examples and patterns
3. **Stay Focused** - Keep prompt aligned with agent's role
4. **Document Why** - Explain reasoning for significant changes
5. **Seek Feedback** - Test with real use cases

---

**Last Updated:** 2025-10-09
**Maintainer:** Lazarus System Team
