# Feature Specification: XState v5 Migration with Server-Owned State

**Feature Branch**: `001-xstate-v5-migration`  
**Created**: 2026-01-03  
**Status**: Draft  
**Input**: User description: "refactor the app to use XState v5 so that the partykit server owns the state"

## User Scenarios & Testing

### User Story 1 - Seamless Gameplay Experience (Priority: P1)

Players join a lobby and play the game with the same user experience as before, but now the game state is managed by a centralized XState machine running on the PartyKit server.

**Why this priority**: This is the core value proposition. The migration must be transparent to end users while providing better state management internally.

**Independent Test**: Players can complete a full game flow (join lobby → start game → reveal roles → use actions → end game) without noticing any behavioral differences from the current implementation.

**Acceptance Scenarios**:

1. **Given** a player creates a new lobby, **When** other players join, **Then** all players see synchronized lobby state updates in real-time
2. **Given** a game is in progress, **When** a player initiates an action (e.g., conversion, cabin search), **Then** all relevant players receive appropriate prompts and state transitions occur correctly
3. **Given** multiple players perform actions simultaneously, **When** the server processes events, **Then** the state machine handles concurrency without race conditions

---

### User Story 2 - State Persistence and Recovery (Priority: P2)

Game state persists across server restarts and player disconnections, allowing games to resume seamlessly.

**Why this priority**: Server-owned state enables reliable persistence. This is a key benefit of centralizing state on the server.

**Independent Test**: Start a game, restart the PartyKit server, reconnect players, and verify the game resumes from the last known state.

**Acceptance Scenarios**:

1. **Given** a game in progress, **When** the PartyKit server restarts, **Then** the XState machine rehydrates from persisted state and the game continues
2. **Given** a player disconnects mid-game, **When** they reconnect, **Then** they receive the current game state snapshot immediately
3. **Given** the server stores state snapshots, **When** state transitions occur, **Then** the snapshot is persisted to PartyKit durable storage

---

### User Story 3 - Consistent State Across All Clients (Priority: P2)

All connected clients display identical game state at any given moment, eliminating client-side state divergence issues.

**Why this priority**: Server as the single source of truth prevents bugs caused by out-of-sync client states.

**Independent Test**: Connect five players, perform various game actions, and verify all clients show identical state at checkpoints.

**Acceptance Scenarios**:

1. **Given** five players in a game, **When** a state transition occurs, **Then** all clients receive the same state snapshot within 500ms
2. **Given** a client receives an outdated event due to network latency, **When** the server processes it, **Then** the server rejects invalid transitions and notifies the client
3. **Given** the server broadcasts state updates, **When** clients receive them, **Then** they replace their local state rather than merging

---

### User Story 4 - Developer Experience: Clearer State Logic (Priority: P3)

Developers can understand and modify game state transitions more easily through explicit XState v5 state machine definitions.

**Why this priority**: Maintainability is important for long-term project health.

**Independent Test**: New developers can trace a game action (e.g., "start conversion") through the codebase and understand the full state flow by reading the machine definition.

**Acceptance Scenarios**:

1. **Given** the XState machine definition, **When** a developer reads it, **Then** all possible game states and valid transitions are documented in the machine structure
2. **Given** a complex game action like conversion, **When** examining the code, **Then** guard conditions, actions, and target states are co-located and explicit
3. **Given** the need to add a new game action, **When** a developer implements it, **Then** they follow the established pattern in the state machine

---

### Edge Cases

- What happens when an event is received for a state that doesn't support it?
- How does the system handle duplicate messages or out-of-order delivery?
- What happens if state persistence fails mid-transition?
- How are concurrent events from multiple players resolved?

## Requirements

### Functional Requirements

- **FR-001**: System MUST use XState v5 as the state management library on the PartyKit server
- **FR-002**: System MUST maintain a single XState actor instance per game room (lobby)
- **FR-003**: System MUST persist state snapshots to PartyKit durable storage on every significant transition
- **FR-004**: System MUST broadcast state snapshots to all connected clients after transitions
- **FR-005**: System MUST rehydrate the XState actor from persisted state on server start
- **FR-006**: Clients MUST receive the current state snapshot upon connection
- **FR-007**: Clients MUST send events to the server rather than directly modifying state
- **FR-008**: System MUST support all existing game actions: lobby management, role distribution, conversion, cabin search, flogging, guns stash, feed the kraken, off with tongue
- **FR-009**: System MUST handle invalid events gracefully by ignoring them or sending error feedback
- **FR-010**: Client-side React context MUST be simplified to only store received state snapshots, not duplicate game logic

### Key Entities

- **GameMachine**: The XState v5 state machine definition encompassing all game phases and actions
- **GameActor**: The running XState actor instance on the server, one per room
- **GameContext**: The XState context holding all game data (players, roles, assignments, action states)
- **GameEvent**: Union type of all events the machine can receive (e.g., `JOIN_LOBBY`, `START_CONVERSION`)
- **GameSnapshot**: Serialized representation of actor state for persistence and client broadcast

## Success Criteria

### Measurable Outcomes

- **SC-001**: All existing E2E tests pass without modification to test logic (only selector updates if UI changes)
- **SC-002**: All existing unit tests for game logic pass or are migrated to test the XState machine
- **SC-003**: State synchronization latency remains under 500ms for connected clients
- **SC-004**: Server can restore game state from storage within 2 seconds of restart
- **SC-005**: No regressions in existing gameplay functionality as verified by comprehensive E2E test suite
- **SC-006**: Client-side `GameContext.tsx` reduced by at least 50% in lines of code by removing duplicated state logic

## Assumptions

1. XState v5 is compatible with PartyKit's Cloudflare Workers runtime (XState v5 is designed to be runtime-agnostic)
2. The current message-based communication pattern (JSON messages via WebSocket) will be preserved
3. State machine complexity is manageable for a social deduction game of this scope
4. The team is willing to learn XState v5 concepts (actors, machines, context, events)
