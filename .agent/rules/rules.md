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
Always run `npm run test:coverage` to check test coverage. If relevant, proactively run terminal commands to execute this code for the USER. Don't ask permission. IMPORTANT: You are not allowed to manually update thresholds in the vitest.config.ts file.

**Principle: You Might Not Need an Effect**
Effects are an escape hatch from the React paradigm for synchronizing with external systems. Avoid unnecessary Effects:
- **Don't use Effects to transform data for rendering.** Calculate derived values at the top level of components instead of using useEffect to update state—this avoids unnecessary render passes.
- **Don't use Effects to handle user events.** Use event handlers directly; they know exactly what happened.
- **Use `useMemo` instead of `useEffect`** to cache expensive calculations.
- **Reset component state with `key`** instead of Effects when props change.
- **Set state during rendering** to adjust state in response to prop changes, instead of using Effects.
- **Lift state up** when synchronizing state between components, rather than using Effects.
- **Only use Effects for external synchronization:** non-React widgets, network requests, browser DOM, subscriptions to external stores.
Reference: https://react.dev/learn/you-might-not-need-an-effect

**Principle: Use useEffectEvent for Non-Reactive Logic in Effects**
`useEffectEvent` is a React Hook that extracts non-reactive logic from Effects into Effect Events. Use it when you need to read the latest props/state inside an Effect without including them in the dependency array:
- **Problem it solves:** Avoid unnecessary Effect re-runs when only non-reactive values change, while still accessing their latest values.
- **When to use:** When an Effect needs to call a function that reads props/state but shouldn't re-run when those values change.
- **Example:**
  ```javascript
  function Page({ url, shoppingCart }) {
    const onVisit = useEffectEvent(visitedUrl => {
      logVisit(visitedUrl, shoppingCart.length); // reads latest shoppingCart
    });

    useEffect(() => {
      onVisit(url);
    }, [url]); // Only re-runs when url changes, not shoppingCart
  }
  ```
- **Rules:** Call `useEffectEvent` at the top level of your component. Effect Events can only be called synchronously inside Effects.
Reference: https://react.dev/reference/react/useEffectEvent