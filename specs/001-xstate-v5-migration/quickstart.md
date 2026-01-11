# Quickstart: XState V5 Game Machine

This guide helps developers quickly understand and work with the XState v5 game machine implementation.

## Prerequisites

- Node.js 20+
- Familiarity with TypeScript
- Basic understanding of XState concepts (states, events, context, guards)

## Installation

```bash
# Install XState v5 in the PartyKit server package
cd feed-the-kraken-companion-openspec-party
npm install xstate@5
```

## Key Files

| File | Purpose |
|------|---------|
| `party/machine/gameMachine.ts` | XState machine definition |
| `party/machine/actions.ts` | Action implementations |
| `party/machine/guards.ts` | Guard conditions |
| `party/index.ts` | PartyKit server integration |
| `app/context/GameContext.tsx` | React context (receives snapshots) |
| `specs/001-xstate-v5-migration/contracts/` | Type definitions |

## Understanding the Machine

### State Structure

```
lobby.empty → lobby.waiting → playing.idle → [action flows] → finished
```

### Core Concepts

1. **Single Source of Truth**: The XState actor on the server owns all state
2. **Event-Driven**: Clients send events, receive snapshots
3. **Persistent**: State snapshots saved to PartyKit durable storage

## Common Tasks

### Send an Event to the Machine

```typescript
// In party/index.ts
this.gameActor.send({ type: "JOIN_LOBBY", playerId, playerName, playerPhoto });
```

### Subscribe to State Changes

```typescript
// Server-side subscription
this.gameActor.subscribe((snapshot) => {
  this.broadcastSnapshot(snapshot);
});
```

### Get Current State

```typescript
const snapshot = this.gameActor.getSnapshot();
const currentState = snapshot.value; // e.g., { playing: "idle" }
const context = snapshot.context;
```

### Check if in a Specific State

```typescript
const snapshot = this.gameActor.getSnapshot();
if (snapshot.matches({ playing: "conversion" })) {
  // Handle conversion state specific logic
}
```

### Persist State

```typescript
// Save snapshot to durable storage
const persistedSnapshot = this.gameActor.getPersistedSnapshot();
await this.room.storage.put("gameSnapshot", persistedSnapshot);
```

### Restore State

```typescript
// In onStart()
const snapshot = await this.room.storage.get("gameSnapshot");
if (snapshot) {
  this.gameActor = createActor(gameMachine, { snapshot });
} else {
  this.gameActor = createActor(gameMachine);
}
this.gameActor.start();
```

## Testing the Machine

### Unit Test Example

```typescript
import { createActor } from "xstate";
import { gameMachine } from "./gameMachine";

test("player can join lobby", () => {
  const actor = createActor(gameMachine);
  actor.start();
  
  actor.send({ type: "CREATE_LOBBY", playerId: "p1", playerName: "Alice", playerPhoto: null });
  expect(actor.getSnapshot().matches({ lobby: "waiting" })).toBe(true);
  
  actor.send({ type: "JOIN_LOBBY", playerId: "p2", playerName: "Bob", playerPhoto: null });
  expect(actor.getSnapshot().context.players).toHaveLength(2);
});
```

### Run Tests

```bash
# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e
```

## Debugging

1. **Stately Inspector**: Add `inspect: true` when creating actor for visual debugging
2. **Console Logging**: Add logging in actions to trace transitions
3. **Snapshot Inspection**: Log `actor.getSnapshot()` to see full state

## Resources

- [XState v5 Documentation](https://stately.ai/docs/xstate)
- [XState v5 Persistence Guide](https://stately.ai/docs/persistence)
- [PartyKit Documentation](https://docs.partykit.io/)
