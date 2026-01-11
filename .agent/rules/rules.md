---
trigger: always_on
---

**Principle: Return Early (Guard Clauses)**
Minimise cyclomatic complexity and indentation depth by handling edge cases and errors immediately at the top of the function, keeping the "happy path" logic aligned to the left.

**Principle: Encapsulate State in Compound Components**
Avoid passing excessive boolean flags (e.g., isOpen, isEditing) down the component tree (prop drilling). Instead, use the Compound Component pattern to share implicit state between a parent and its children, enabling flexible composition and cleaner APIs.

**Principle: Use linter**
`npm run lint` will list errors and warnings. Some of the listed notices are fixable by running `npm run format`.

**Principle: Visible Feedback Over Restriction**
Do not disable interactive elements (like buttons) or hide standard controls without explanation. Instead, keep elements interactive and use Tooltips, Toasts, or Inline Validation to explain why an action is currently unavailable, guiding the user toward the correct state.

**Principle: Don't repeat yourself (DRY)**
Avoid code duplication by extracting common logic into reusable functions or components. This makes the codebase more maintainable and reduces the risk of bugs. Before writing new code, check if a similar pattern exists and consider reusing it. IMPORTANT: The scope of the DRY principle is global in terms of the codebase.

**Principle: Use context7 tool**
Always use context7 when I need code generation, setup or configuration steps, or
library/API documentation. This means you should automatically use the Context7 MCP
tools to resolve library id and get library docs without me having to explicitly ask.

**Principle: Test coverage**
Always run `npm run test:coverage` to check test coverage. If relevant, proactively run terminal commands to execute this code for the USER. Don't ask permission.