# Feed The Kraken Companion Constitution

## Core Principles

### I. Return Early (Guard Clauses)
Minimise cyclomatic complexity and indentation depth by handling edge cases and errors immediately at the top of functions. Keep the "happy path" logic aligned to the left for better readability.

### II. Encapsulate State in Compound Components
Avoid prop drilling with excessive boolean flags (e.g., isOpen, isEditing). Use the Compound Component pattern to share implicit state between parent and children, enabling flexible composition and cleaner APIs.

### III. Don't Repeat Yourself (DRY)
Extract common logic into reusable functions or components. Before writing new code, check if a similar pattern exists in the codebase. The scope of DRY is global across the entire project.

### IV. Visible Feedback Over Restriction
Never disable interactive elements without explanation. Keep elements interactive and use Tooltips, Toasts, or Inline Validation to communicate why an action is unavailable, guiding users toward the correct state.

### V. Linting & Formatting
Run `npm run lint` to check for errors and warnings. Use `npm run format` to auto-fix formatting issues. The project uses Biome for linting with Next.js and React recommended rules.

## Technology Stack

- **Frontend**: Next.js 16 + React 19 (App Router, Server Components)
- **Backend**: PartyKit 0.0.115 (WebSocket server, durable storage)
- **State Management**: XState v5 (server-owned state, actor model)
- **Language**: TypeScript 5.x
- **Styling**: TailwindCSS 4
- **Linting**: Biome 2.2
- **Testing**: Vitest (unit), Playwright (E2E)
- **i18n**: i18next with English and Finnish locales

## Testing Standards

- **Unit Tests**: Located in `party/` alongside source files (`*.test.ts`)
- **E2E Tests**: Located in `e2e/` directory using Playwright
- **Visual Tests**: Regression snapshots in `e2e/__snapshots__/`
- **Run Tests**: `npm run test:unit` for unit, `npm run test:e2e` for E2E
- **Test-First**: Write tests before implementation when adding new features

## Governance

- This constitution supersedes all other development practices
- Amendments require documentation and team approval
- All code reviews must verify compliance with these principles
- Use `.agent/rules/rules.md` for runtime AI development guidance

**Version**: 1.0.0 | **Ratified**: 2026-01-03 | **Last Amended**: 2026-01-03
