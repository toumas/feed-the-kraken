# Implementation Plan: XState V5 Migration

**Branch**: `001-xstate-v5-migration` | **Date**: 2026-01-03 | **Spec**: [spec.md](file:///Users/tuomas.ukkola/projects/feed-the-kraken-companion-openspec/specs/001-xstate-v5-migration/spec.md)  
**Input**: Feature specification from `/specs/001-xstate-v5-migration/spec.md`

## Summary

Migrate the Feed the Kraken companion app from ad-hoc server-side state management to XState v5, with the PartyKit server owning a single XState actor per game room. This provides:
- Type-safe, explicit state transitions
- Built-in persistence via XState snapshots + PartyKit durable storage
- Simplified client code (50%+ reduction in GameContext.tsx)
- Better testability of game logic

## User Review Required

> [!IMPORTANT]
> **Breaking Change (Server-to-Client)**: The server will no longer broadcast `LOBBY_UPDATE`. It will now broadcast `STATE_UPDATE` containing a full XState `GameSnapshot`. Clients must be updated to listen for this new message type.

> [!NOTE]
> **Message Patterns (Client-to-Server)**: The `sendMessage` utility and the pattern of sending JSON events (e.g., `{ type: 'START_CONVERSION', ... }`) remain unchanged, though the event `type` keys will now strictly map to the XState `GameEvent` union.

---

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: XState 5.x (new), PartyKit 0.0.115, Next.js 16, React 19  
**Storage**: PartyKit Durable Objects (`room.storage`)  
**Testing**: Vitest (unit), Playwright (E2E)  
**Target Platform**: Cloudflare Workers (PartyKit), Browser (Next.js)  
**Project Type**: Web application (Next.js frontend + PartyKit backend)  
**Performance Goals**: <500ms state sync latency (FR from spec)  
**Constraints**: 128 KiB per storage value (ample for game state)  
**Scale/Scope**: 5-11 players per game, ~25 event types

---

## Constitution Check

| Principle | Alignment |
|-----------|-----------|
| **I. Return Early** | **COMPLIANT**: XState guards in `guards.ts` will use return early patterns for validation logic. |
| **II. Compound Components** | **COMPLIANT**: Client-side state derivation will use hooks/components that encapsulate snapshot logic, avoiding prop drilling of raw state. |
| **III. DRY** | **COMPLIANT**: Migration removes duplicated game logic from `GameContext.tsx` (SC-006) and centralizes it in the state machine. |
| **IV. Visible Feedback** | **COMPLIANT**: FR-009 requires graceful handling of invalid events; we will prioritize error feedback (toasts) over silent failure or disabling buttons without context. |
| **V. Linting & Formatting** | **COMPLIANT**: All new machine code will follow Biome linting standards. |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-xstate-v5-migration/
├── plan.md              ← This file
├── research.md          ← Phase 0 output ✓
├── data-model.md        ← Phase 1 output ✓  
├── quickstart.md        ← Phase 1 output ✓
├── contracts/           ← Phase 1 output ✓
│   └── game-machine.types.ts
└── tasks.md             ← Phase 2 output (next command)
```

### Source Code (repository root)

```text
party/
├── index.ts                  # MODIFY - integrate XState actor
├── machine/                  # NEW - XState machine definition
│   ├── gameMachine.ts        # State machine setup
│   ├── states/               # State node definitions
│   │   ├── lobby.ts
│   │   ├── playing.ts
│   │   └── actions/          # Per-action state nodes
│   ├── actions.ts            # XState action implementations
│   └── guards.ts             # Guard condition implementations
└── *.test.ts                 # MODIFY - update tests for machine

app/
├── context/
│   └── GameContext.tsx       # MODIFY - simplify to snapshot receiver
├── types.ts                  # MODIFY - import from contracts or update
└── [other files unchanged]

e2e/
└── *.spec.ts                 # VERIFY - existing tests should pass
```

**Structure Decision**: Keep existing directory structure but add `party/machine/` for XState-specific code. This isolates the machine definition from server integration code.

---

## Proposed Changes

### Component: PartyKit Server - XState Machine

Core implementation of the XState v5 game machine.

#### [NEW] [gameMachine.ts](file:///Users/tuomas.ukkola/projects/feed-the-kraken-companion-openspec/party/machine/gameMachine.ts)
- Define root `gameMachine` using `setup()` and `createMachine()`
- Configure all states: `lobby.empty`, `lobby.waiting`, `playing.*`, `finished`
- Declare all event types from contracts

#### [NEW] [actions.ts](file:///Users/tuomas.ukkola/projects/feed-the-kraken-companion-openspec/party/machine/actions.ts)  
- Extract action logic from current `party/index.ts` handlers
- Implement as XState `assign()` actions
- Actions: `addPlayer`, `removePlayer`, `assignRoles`, `startConversion`, etc.

#### [NEW] [guards.ts](file:///Users/tuomas.ukkola/projects/feed-the-kraken-companion-openspec/party/machine/guards.ts)
- Extract validation logic as XState guards
- Guards: `isHost`, `hasMinPlayers`, `canStartConversion`, `isValidRole`, etc.

---

### Component: PartyKit Server - Integration

Connect XState actor to PartyKit server lifecycle.

#### [MODIFY] [index.ts](file:///Users/tuomas.ukkola/projects/feed-the-kraken-companion-openspec/party/index.ts)
- Replace `lobbyState: LobbyState | null` with `gameActor: Actor<typeof gameMachine>`
- Update `onStart()` to rehydrate actor from storage
- Update `onMessage()` to forward events to actor: `this.gameActor.send(data)`
- Subscribe to actor and broadcast snapshots on state changes
- Update `onConnect()` to send current snapshot
- Persist snapshot on significant transitions

**Lines reduced**: ~1500 lines of handler logic → ~200 lines of integration code

---

### Component: Client - GameContext

Simplify to receive and store server snapshots.

#### [MODIFY] [GameContext.tsx](file:///Users/tuomas.ukkola/projects/feed-the-kraken-companion-openspec/app/context/GameContext.tsx)
- Remove duplicated state derivation logic
- Store `snapshot: GameSnapshot | null` from server
- Derive all values from snapshot (myRole, canStartGame, etc.)
- Keep action methods (sendMessage patterns unchanged)

**Lines reduced**: ~1052 lines → ~400 lines (target 50%+ reduction per SC-006)

---

### Component: Shared Types

Consolidate type definitions.

#### [MODIFY] [types.ts](file:///Users/tuomas.ukkola/projects/feed-the-kraken-companion-openspec/app/types.ts)
- Import shared types from contracts or consolidate definitions
- Ensure `GameSnapshot`, `GameEvent`, `GameContext` are available to both server and client

---

### Component: Tests

Update unit tests to test the XState machine directly.

#### [MODIFY] Various test files in [party/](file:///Users/tuomas.ukkola/projects/feed-the-kraken-companion-openspec/party/)
- Update test patterns to use `createActor(gameMachine)` and `actor.send(event)`
- Test state transitions and context mutations directly
- Existing tests: `conversion.test.ts`, `cult_cabin_search.test.ts`, `cult_guns_stash.test.ts`, etc.

---

## Verification Plan

### Automated Tests

#### Unit Tests (XState Machine)

```bash
npm run test:unit
```

- **What it tests**: State transitions, guard conditions, action implementations
- **Success criteria**: All tests pass
- **Existing tests to update**: `party/*.test.ts` (7 test files)

#### E2E Tests (Full Flow)

```bash
npm run test:e2e
```

- **What it tests**: Complete user flows from lobby creation through game actions
- **Success criteria**: All 18 E2E tests pass without modification (SC-001)
- **Key tests**: `game.spec.ts`, `conversion.spec.ts`, `cult_cabin_search.spec.ts`, `flogging.spec.ts`

#### Specific E2E Debug (if failures)

```bash
npm run test:e2e:debug
```

### Manual Verification

#### 1. State Persistence Test
1. Start PartyKit dev server: `npm run partykit:dev`
2. Start Next.js dev server: `npm run dev`
3. Create a lobby with 2 players
4. Stop the PartyKit dev server (Ctrl+C)
5. Restart PartyKit dev server
6. **Expected**: Players can reconnect and see lobby state preserved

#### 2. State Sync Latency Test
1. Connect 5 browser windows to the same game
2. Initiate a conversion action
3. **Expected**: All clients see the conversion prompt within 500ms (SC-003)

#### 3. Client Code Reduction Verification
1. After implementation, count lines in `GameContext.tsx`
2. **Expected**: <500 lines (down from 1052, satisfying SC-006's 50% reduction)

---

## Complexity Tracking

No constitution violations to justify.

---

## Generated Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](file:///Users/tuomas.ukkola/projects/feed-the-kraken-companion-openspec/specs/001-xstate-v5-migration/research.md) | ✓ Complete |
| Data Model | [data-model.md](file:///Users/tuomas.ukkola/projects/feed-the-kraken-companion-openspec/specs/001-xstate-v5-migration/data-model.md) | ✓ Complete |
| Contracts | [contracts/](file:///Users/tuomas.ukkola/projects/feed-the-kraken-companion-openspec/specs/001-xstate-v5-migration/contracts/) | ✓ Complete |
| Quickstart | [quickstart.md](file:///Users/tuomas.ukkola/projects/feed-the-kraken-companion-openspec/specs/001-xstate-v5-migration/quickstart.md) | ✓ Complete |
