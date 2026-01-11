# Research: XState V5 Migration with Server-Owned State

**Feature**: XState v5 Migration  
**Date**: 2026-01-03

## Summary

Migration of the Feed the Kraken companion app from ad-hoc server-side state management to XState v5 with the PartyKit server owning the state machine.

---

## Decision 1: XState v5 Persistence Pattern

**Decision**: Use `actor.getPersistedSnapshot()` for serialization and `createActor(machine, { snapshot })` for rehydration.

**Rationale**:
- XState v5 has built-in "deep persistence" that recursively saves nested/spawned actors
- `getPersistedSnapshot()` returns a plain JSON-serializable object
- Compatible with PartyKit's durable storage (128 KiB limit per value)
- No external libraries needed

**Alternatives Considered**:
- Custom serialization: Rejected - XState v5's built-in approach is simpler and officially supported
- Event sourcing: Rejected - Overkill for this use case, adds complexity for replay

---

## Decision 2: PartyKit Storage Integration

**Decision**: Store XState snapshots in PartyKit's `room.storage` using the existing pattern.

**Rationale**:
- Current codebase already uses `this.room.storage.put("lobby", state)` and `this.room.storage.get<LobbyState>("lobby")`
- PartyKit storage persists across server restarts, hibernation, and runtime errors
- `onStart()` lifecycle hook already loads state on server wake-up
- 128 KiB limit is sufficient for game state (current LobbyState is ~5-10 KB typical)

**Current Implementation** (in `party/index.ts`):
```typescript
async onStart() {
  const stored = await this.room.storage.get<LobbyState>("lobby");
  if (stored) {
    this.lobbyState = stored;
  }
}
```

**New Pattern**:
```typescript
async onStart() {
  const snapshot = await this.room.storage.get<Snapshot>("gameSnapshot");
  if (snapshot) {
    this.gameActor = createActor(gameMachine, { snapshot });
    this.gameActor.start();
  } else {
    this.gameActor = createActor(gameMachine);
    this.gameActor.start();
  }
}
```

---

## Decision 3: State Machine Architecture

**Decision**: Single monolithic state machine with hierarchical (nested) states for complex flows.

**Rationale**:
- Game flow is inherently sequential with clear phases (WAITING → PLAYING → action flows)
- Hierarchical states cleanly model sub-flows (Conversion, CabinSearch, GunsStash, etc.)
- Single machine simplifies persistence and broadcasting
- Guards and actions can be tested in isolation

**Structure**:
```
GameMachine
├── lobby (initial)
│   └── waiting (handle joins, leaves, mode selection)
├── playing
│   ├── idle (waiting for action initiation)
│   ├── conversion
│   │   ├── pending (waiting for responses)
│   │   ├── active (quiz round)
│   │   └── completed
│   ├── cabinSearch
│   │   ├── setup (role claims)
│   │   ├── active (quiz)
│   │   └── completed
│   ├── gunsStash (similar pattern)
│   ├── feedTheKraken (similar pattern)
│   └── offWithTongue (similar pattern)
└── finished
```

---

## Decision 4: Message-to-Event Mapping

**Decision**: Map existing WebSocket message types 1:1 to XState events with minimal changes.

**Rationale**:
- Preserves existing client API contract (no frontend changes needed for message sending)
- Events become type-safe via XState's event type declarations
- Easier migration path - update server internals, keep external interface stable

**Example Mapping**:
| WebSocket Message | XState Event |
|-------------------|--------------|
| `{ type: "CREATE_LOBBY", playerId, playerName, playerPhoto }` | `{ type: "CREATE_LOBBY", playerId, playerName, playerPhoto }` |
| `{ type: "START_CONVERSION", initiatorId }` | `{ type: "START_CONVERSION", initiatorId }` |
| `{ type: "RESPOND_CONVERSION", playerId, accept }` | `{ type: "RESPOND_CONVERSION", playerId, accept }` |

---

## Decision 5: Client State Management Simplification

**Decision**: Reduce `GameContext.tsx` to a thin wrapper that stores server-sent snapshots.

**Rationale**:
- Eliminates duplicated state logic between client and server
- Client becomes a pure "view" of server state
- Reduces client from ~1000 lines to ~200-300 lines
- All game logic validation happens on server (XState guards)

**Current Client Pattern** (problematic):
```typescript
// Client has its own state calculation logic
const myRole = lobby?.assignments?.[myPlayerId] ?? null;
// Multiple handlers duplicating server logic
```

**New Client Pattern**:
```typescript
const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
// On message: setSnapshot(message.snapshot)
// All derived values come from snapshot
```

---

## Decision 6: Testing Strategy

**Decision**: Migrate existing unit tests to test XState machine directly; keep E2E tests unchanged.

**Rationale**:
- XState machines are highly testable via `createActor(machine).send(event)` pattern
- 18 E2E tests validate end-to-end behavior and will catch regressions
- Unit tests in `party/*.test.ts` can be adapted to test machine transitions
- vitest already configured, no new test framework needed

**Existing Test Commands**:
```bash
npm run test:unit    # vitest run --exclude e2e
npm run test:e2e     # playwright test  
npm run test:e2e:ui  # playwright test --ui
```

---

## Unknowns Resolved

| Unknown | Resolution |
|---------|------------|
| XState v5 compatible with Cloudflare Workers? | Yes - XState v5 is runtime-agnostic, no Node-specific APIs |
| State size limits? | PartyKit: 128 KiB per value. Current state ~5-10 KB. Ample headroom. |
| Snapshot format backward compatible? | N/A - new feature, no existing XState state to migrate |
| Timer handling? | XState's `after` delays work in Workers; use `sendTo` for external timers if needed |

---

## Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| xstate | ^5.x (latest) | State machine library |
| @xstate/store | optional | If simplified store pattern needed (likely not) |

**Installation**:
```bash
cd feed-the-kraken-companion-openspec-party
npm install xstate@5
```
