## Context
The current application simulates multiplayer by managing all state locally in React components. This works for single-user testing but prevents real multiplayer experiences. We need to introduce a real-time backend that can synchronize state across multiple clients.

## Goals / Non-Goals
- Goals: Enable real-time multiplayer lobbies, persistent game sessions, cross-device synchronization
- Non-Goals: Implement complex game logic server-side, add authentication, support thousands of concurrent users

## Decisions
- Use PartyKit for real-time infrastructure due to its simplicity and Cloudflare integration
- Maintain room-based architecture where each lobby is a PartyKit "room"
- Store lobby state in PartyKit's durable storage for persistence
- Use PartySocket on client for WebSocket connections
- Keep game logic client-side for simplicity

## Risks / Trade-offs
- PartyKit dependency adds complexity vs keeping local state
- Real-time sync may introduce latency vs instant local updates
- Durable storage costs vs ephemeral local state

## Migration Plan
1. Add PartyKit alongside existing local state
2. Gradually migrate features to use PartyKit
3. Remove local state simulation once PartyKit is stable
4. Test thoroughly with multiple clients

## Open Questions
- How to handle reconnections and state recovery? **Full State Broadcast on Reconnect**: When a client reconnects, the PartyKit server immediately broadcasts the complete current lobby state (players, status) to all connected clients, ensuring everyone has the latest data without complex diffing.
- What happens when PartyKit server hibernates? **Graceful Degradation with Notifications**: During hibernation, show "Server Pausing" indicators to clients; upon wake, broadcast a "Resumed" event with full state sync to maintain user experience.
- How to test multiplayer scenarios locally? **Multiple Browser Tabs**: Open several tabs/windows in the same browser, each joining as a different "player" (use incognito mode for isolated sessions), simulating concurrent users during `npx partykit dev`.