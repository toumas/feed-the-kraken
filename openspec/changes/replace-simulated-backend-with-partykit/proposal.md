## Why
The current application uses local React state to simulate multiplayer functionality, which only works for single-user sessions and doesn't support real-time collaboration. To enable true multiplayer experiences where multiple users can join lobbies, update profiles, and start games together, we need a real-time backend infrastructure.

## What Changes
- **BREAKING**: Replace local state management with PartyKit real-time server
- Add PartyKit server for managing lobby state and player connections
- Integrate PartySocket client for real-time synchronization
- Update lobby creation, joining, and player management to use real-time events
- Add persistent storage for lobby data using PartyKit's durable storage

## Impact
- Affected specs: realtime-multiplayer capability
- Affected code: `app/page.tsx` (main component), new `party/` directory for server code
- New dependencies: `partykit`, `partysocket`
- Requires PartyKit deployment for production