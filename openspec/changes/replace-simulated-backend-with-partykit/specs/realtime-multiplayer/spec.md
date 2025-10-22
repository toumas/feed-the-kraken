## MODIFIED Requirements
### Requirement: Real-Time Lobby Management
The system SHALL manage lobbies using a real-time server instead of local state, enabling multiple users to join and interact simultaneously.

#### Scenario: Create lobby with real-time sync
- **WHEN** a user creates a new lobby
- **THEN** the lobby is created on the PartyKit server
- **AND** the lobby code is shared via real-time connections

#### Scenario: Join lobby across devices
- **WHEN** a user enters a lobby code on a different device
- **THEN** they connect to the existing PartyKit room
- **AND** receive current lobby state and player list

#### Scenario: Real-time player updates
- **WHEN** a player updates their profile or joins/leaves
- **THEN** all connected clients receive the update immediately
- **AND** the UI updates without manual refresh

## ADDED Requirements
### Requirement: Persistent Lobby Storage
The system SHALL store lobby state in durable storage to survive server hibernation and reconnections.

#### Scenario: Lobby survives disconnection
- **WHEN** the PartyKit server hibernates
- **THEN** lobby data is restored from storage on wake
- **AND** connected players maintain their session

### Requirement: Connection Status Indicators
The system SHALL show connection status to help users understand real-time state.

#### Scenario: Connection lost indicator
- **WHEN** WebSocket connection is lost
- **THEN** UI shows "Reconnecting..." status
- **AND** disables interactive features until reconnected