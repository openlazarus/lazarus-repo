# Contributing to Lazarus

Thanks for your interest in contributing! This repo follows a fork + pull-request model.

## Workflow

1. **Fork** this repository to your own GitHub account.
2. **Clone** your fork locally and create a feature branch:
   ```bash
   git checkout -b fix/short-description
   ```
3. Make your changes. Keep PRs focused — one topic per PR.
4. Run the checks locally before pushing:
   ```bash
   # Backend
   cd packages/lazarus-api
   npm install
   npm run format:check
   npm run lint
   npm run build

   # Frontend
   cd packages/lazarus-ui
   npm install
   npm run lint
   ```
5. **Push** to your fork and open a Pull Request against `main`.
6. CI runs automatically. A maintainer will review.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `fix:` bug fixes
- `feat:` new features
- `chore:` maintenance / no code change
- `docs:` documentation only
- `refactor:` code change that neither fixes a bug nor adds a feature
- `test:` adding or fixing tests

Example: `fix(workspace): handle null status in selector`

## Code style

- TypeScript: strict, no `any`, explicit types on function signatures.
- Files: kebab-case.
- Functions: ≤15 lines where reasonable; single responsibility.
- Prefer maps over `switch` for dispatch.
- Prefer the `service` / `repository` / `controller` pattern in the API; see `packages/lazarus-api/.claude/rules/` if present.

## Reporting bugs / requesting features

Open an issue using the templates in `.github/ISSUE_TEMPLATE/`.

## Security issues

Please do **not** file public issues for security vulnerabilities. See [SECURITY.md](./SECURITY.md) for the disclosure process.

## License

By contributing, you agree your contributions will be licensed under the [Apache License 2.0](./LICENSE).
