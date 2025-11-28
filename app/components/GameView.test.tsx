import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LobbyState } from "../types";
import { GameView } from "./GameView";

describe("GameView", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockLobby: LobbyState = {
    code: "TEST",
    players: [
      {
        id: "p1",
        name: "Player 1",
        photoUrl: null,
        isHost: true,
        isReady: true,
        isOnline: true,
        isEliminated: false,
        isUnconvertible: false,
        notRole: null,
        joinedAt: Date.now(),
      },
    ],
    status: "PLAYING",
  };

  const defaultProps = {
    lobby: mockLobby,
    myRole: "SAILOR" as const,
    myPlayerId: "p1",
    onLeave: vi.fn(),
    onCabinSearch: vi.fn(),
    cabinSearchPrompt: null,
    cabinSearchResult: null,
    onCabinSearchResponse: vi.fn(),
    onClearCabinSearchResult: vi.fn(),
    isCabinSearchPending: false,

    floggingConfirmationPrompt: null,
    onFloggingConfirmationResponse: vi.fn(),
    floggingReveal: null,
    onClearFloggingReveal: vi.fn(),
    onStartConversion: vi.fn(),
    conversionStatus: null,
    onRespondConversion: vi.fn(),
    onResetGame: vi.fn(),
  };

  it("renders role information", () => {
    render(<GameView {...defaultProps} />);
    expect(screen.getByText("Loyal Sailor")).toBeDefined();
    expect(
      screen.getByText("Steer the ship safely to port. Trust no one!"),
    ).toBeDefined();
  });

  it("renders Denial of Command link", () => {
    render(<GameView {...defaultProps} />);
    const link = screen.getByText("Denial of Command").closest("a");
    expect(link?.getAttribute("href")).toBe("/denial");
  });

  it("renders eliminated state when player is eliminated", () => {
    const eliminatedLobby: LobbyState = {
      ...mockLobby,
      players: [
        {
          ...mockLobby.players[0],
          isEliminated: true,
        },
      ],
    };

    render(<GameView {...defaultProps} lobby={eliminatedLobby} />);

    expect(screen.getByText("Eliminated")).toBeDefined();
    expect(
      screen.getByText(
        "You have been thrown overboard or fed to the Kraken. Your journey ends here.",
      ),
    ).toBeDefined();
    expect(screen.queryByText("Denial of Command")).toBeNull();
  });

  it("shows disabled-looking but clickable flogging link when used", () => {
    render(
      <GameView
        {...defaultProps}
        lobby={{ ...mockLobby, isFloggingUsed: true }}
      />,
    );
    const link = screen.getByText("Flogging (Used)").closest("a");
    expect(link).toBeDefined();
    expect(link?.getAttribute("href")).toBe("/flogging");
    expect(link?.className).toContain("bg-slate-800/50");
    expect(link?.className).toContain("text-slate-500");
  });

  it("calls onLeave when End Session is confirmed", () => {
    const onLeave = vi.fn();
    // Mock confirm to return true
    // Note: In the new implementation, we use a custom modal instead of window.confirm
    // So we need to click the "End Session" button, then the "Leave" button in the modal.

    render(<GameView {...defaultProps} onLeave={onLeave} />);

    fireEvent.click(screen.getByText("End Session"));

    // Check if modal appears
    expect(
      screen.getByText(
        "Are you sure you want to leave the game? You won't be able to rejoin with the same role.",
      ),
    ).toBeDefined();

    // Click confirm
    fireEvent.click(screen.getByText("Leave"));

    expect(onLeave).toHaveBeenCalled();
  });

  it("does not call onLeave when End Session is cancelled", () => {
    const onLeave = vi.fn();

    render(<GameView {...defaultProps} onLeave={onLeave} />);

    fireEvent.click(screen.getByText("End Session"));

    // Click cancel (Stay)
    fireEvent.click(screen.getByText("Stay"));

    expect(onLeave).not.toHaveBeenCalled();
  });

  // ... (keep pirate tests)

  // ... (keep prompt test)

  it("renders Cabin Search link", () => {
    render(<GameView {...defaultProps} />);
    const link = screen.getByText("Cabin Search").closest("a");
    expect(link?.getAttribute("href")).toBe("/cabin-search");
  });

  it("renders Conversion to Cult button", () => {
    render(
      <GameView
        {...defaultProps}
        lobby={{ ...mockLobby, status: "PLAYING" }}
      />,
    );
    expect(screen.getByText("Conversion to Cult")).toBeDefined();
  });

  it("calls onStartConversion when button is clicked", () => {
    const mockOnStartConversion = vi.fn();
    render(
      <GameView
        {...defaultProps}
        lobby={{ ...mockLobby, status: "PLAYING" }}
        onStartConversion={mockOnStartConversion}
      />,
    );

    fireEvent.click(screen.getByText("Conversion to Cult"));
    expect(mockOnStartConversion).toHaveBeenCalled();
  });

  it("shows conversion modal when status is PENDING", () => {
    const conversionStatus = {
      initiatorId: "p1",
      responses: { p1: true, p2: false },
      state: "PENDING" as const,
    };

    render(
      <GameView
        {...defaultProps}
        lobby={{
          ...mockLobby,
          players: [
            ...mockLobby.players,
            {
              id: "p2",
              name: "Player 2",
              photoUrl: null,
              isHost: false,
              isReady: true,
              isOnline: true,
              isEliminated: false,
              isUnconvertible: false,
              notRole: null,
              joinedAt: Date.now(),
            },
          ],
          status: "PLAYING",
          conversionStatus,
        }}
        conversionStatus={conversionStatus}
      />,
    );

    // Check for modal title
    expect(
      screen.getByRole("heading", { name: "Conversion to Cult" }),
    ).toBeDefined();
    expect(
      screen.getByText(
        "A ritual has begun. All players must accept to proceed.",
      ),
    ).toBeDefined();
    expect(screen.getAllByText("Accepted")).toBeDefined(); // p1 status
    expect(screen.getAllByText(/Pending/i)).toBeDefined(); // p2 status
  });

  it("shows Accept/Decline buttons when player has not responded", () => {
    const conversionStatus = {
      initiatorId: "p2",
      responses: { p2: true }, // p1 (me) hasn't responded
      state: "PENDING" as const,
    };
    const mockOnRespondConversion = vi.fn();

    render(
      <GameView
        {...defaultProps}
        lobby={{
          ...mockLobby,
          status: "PLAYING",
          conversionStatus,
        }}
        conversionStatus={conversionStatus}
        onRespondConversion={mockOnRespondConversion}
      />,
    );

    const acceptButton = screen.getByText("Accept");
    const declineButton = screen.getByText("Decline");

    expect(acceptButton).toBeDefined();
    expect(declineButton).toBeDefined();

    fireEvent.click(acceptButton);
    expect(mockOnRespondConversion).toHaveBeenCalledWith(true);

    fireEvent.click(declineButton);
    expect(mockOnRespondConversion).toHaveBeenCalledWith(false);
  });

  it("shows waiting state and change vote buttons when player has accepted", () => {
    const conversionStatus = {
      initiatorId: "p2",
      responses: { p2: true, p1: true }, // p1 (me) has accepted
      state: "PENDING" as const,
    };
    const mockOnRespondConversion = vi.fn();

    render(
      <GameView
        {...defaultProps}
        lobby={{
          ...mockLobby,
          status: "PLAYING",
          conversionStatus,
        }}
        conversionStatus={conversionStatus}
        onRespondConversion={mockOnRespondConversion}
      />,
    );

    expect(screen.getByText("Waiting for others...")).toBeDefined();

    // Check for "Decline" (was "Change Vote to Decline")
    const declineButton = screen.getByText("Decline");
    expect(declineButton).toBeDefined();

    // Check for disabled "Accepted" button
    // "Accepted" appears in the status list and on the button.
    // We want the button specifically.
    const acceptedButton = screen.getByRole("button", { name: "Accepted" });
    expect(acceptedButton).toBeDefined();
    // Note: checking cursor-not-allowed style is hard in jsdom, but we verified presence

    fireEvent.click(declineButton);
    expect(mockOnRespondConversion).toHaveBeenCalledWith(false);
  });

  it("shows cancellation message when state is CANCELLED", () => {
    const conversionStatus = {
      initiatorId: "p1",
      responses: { p1: true },
      state: "CANCELLED" as const,
    };

    render(
      <GameView
        {...defaultProps}
        lobby={{
          ...mockLobby,
          status: "PLAYING",
          conversionStatus,
        }}
        conversionStatus={conversionStatus}
      />,
    );

    expect(screen.getByText("The ritual was interrupted!")).toBeDefined();
    expect(screen.getByText("Close")).toBeDefined();
  });

  // --- Converted Player Role Display Tests ---

  it("shows converted pirate in Pirate Crew list for other pirates", () => {
    const lobbyWithConvertedPirate: LobbyState = {
      ...mockLobby,
      players: [
        {
          id: "pirate1",
          name: "Pirate 1",
          photoUrl: null,
          isHost: false,
          isReady: true,
          isOnline: true,
          isEliminated: false,
          isUnconvertible: false,
          notRole: null,
          joinedAt: Date.now(),
        },
        {
          id: "pirate2",
          name: "Pirate 2 (Converted)",
          photoUrl: null,
          isHost: false,
          isReady: true,
          isOnline: true,
          isEliminated: false,
          isUnconvertible: false,
          notRole: null,
          joinedAt: Date.now(),
        },
        {
          id: "sailor1",
          name: "Sailor 1",
          photoUrl: null,
          isHost: true,
          isReady: true,
          isOnline: true,
          isEliminated: false,
          isUnconvertible: false,
          notRole: null,
          joinedAt: Date.now(),
        },
      ],
      status: "PLAYING",
      assignments: {
        pirate1: "PIRATE",
        pirate2: "CULTIST", // Converted to Cultist
        sailor1: "SAILOR",
      },
      originalRoles: {
        pirate1: "PIRATE",
        pirate2: "PIRATE", // Was originally a pirate
        sailor1: "SAILOR",
      },
    };

    render(
      <GameView
        {...defaultProps}
        lobby={lobbyWithConvertedPirate}
        myRole="PIRATE"
        myPlayerId="pirate1"
      />,
    );

    // Pirate Crew section should be visible
    expect(screen.getByText("Pirate Crew")).toBeDefined();

    // Converted pirate should still appear in the crew list
    expect(screen.getByText("Pirate 2 (Converted)")).toBeDefined();

    // Sailor should NOT appear in the crew list
    expect(screen.queryByText("Sailor 1")).toBeNull();
  });

  it("shows Cultist role for converted player", () => {
    const lobbyWithConvertedPlayer: LobbyState = {
      ...mockLobby,
      players: [
        {
          id: "converted1",
          name: "Converted Player",
          photoUrl: null,
          isHost: false,
          isReady: true,
          isOnline: true,
          isEliminated: false,
          isUnconvertible: false,
          notRole: null,
          joinedAt: Date.now(),
        },
      ],
      status: "PLAYING",
      assignments: {
        converted1: "CULTIST", // Converted to Cultist
      },
      originalRoles: {
        converted1: "PIRATE", // Was originally a pirate
      },
    };

    render(
      <GameView
        {...defaultProps}
        lobby={lobbyWithConvertedPlayer}
        myRole="CULTIST"
        myPlayerId="converted1"
      />,
    );

    // Verify the role reveal shows "Cultist" role
    // We can check for the role-specific text that appears in the revealed content
    expect(screen.getByText("Role Hidden")).toBeDefined();

    // The revealed content should contain "Cultist" text (though hidden by default)
    // We can verify it exists in the DOM even if not visible
    const roleTexts = screen.getAllByText(/Cultist/i);
    expect(roleTexts.length).toBeGreaterThan(0);
  });

  it("does not show converted sailor in Pirate Crew list", () => {
    const lobbyWithConvertedSailor: LobbyState = {
      ...mockLobby,
      players: [
        {
          id: "pirate1",
          name: "Pirate 1",
          photoUrl: null,
          isHost: false,
          isReady: true,
          isOnline: true,
          isEliminated: false,
          isUnconvertible: false,
          notRole: null,
          joinedAt: Date.now(),
        },
        {
          id: "sailor1",
          name: "Sailor 1 (Converted)",
          photoUrl: null,
          isHost: false,
          isReady: true,
          isOnline: true,
          isEliminated: false,
          isUnconvertible: false,
          notRole: null,
          joinedAt: Date.now(),
        },
      ],
      status: "PLAYING",
      assignments: {
        pirate1: "PIRATE",
        sailor1: "CULTIST", // Converted to Cultist
      },
      originalRoles: {
        pirate1: "PIRATE",
        sailor1: "SAILOR", // Was originally a sailor
      },
    };

    render(
      <GameView
        {...defaultProps}
        lobby={lobbyWithConvertedSailor}
        myRole="PIRATE"
        myPlayerId="pirate1"
      />,
    );

    // Pirate Crew section should be visible
    expect(screen.getByText("Pirate Crew")).toBeDefined();

    // Converted sailor should NOT appear in the crew list
    expect(screen.queryByText("Sailor 1 (Converted)")).toBeNull();

    // Should show "No other pirates" message
    expect(screen.getByText("No other pirates")).toBeDefined();
  });

  it("shows Cult Leader to Cultist player", () => {
    const lobbyWithCultLeader: LobbyState = {
      ...mockLobby,
      players: [
        {
          id: "cultist1",
          name: "Cultist Player",
          photoUrl: null,
          isHost: false,
          isReady: true,
          isOnline: true,
          isEliminated: false,
          isUnconvertible: false,
          notRole: null,
          joinedAt: Date.now(),
        },
        {
          id: "leader1",
          name: "The Leader",
          photoUrl: null,
          isHost: false,
          isReady: true,
          isOnline: true,
          isEliminated: false,
          isUnconvertible: false,
          notRole: null,
          joinedAt: Date.now(),
        },
      ],
      status: "PLAYING",
      assignments: {
        cultist1: "CULTIST",
        leader1: "CULT_LEADER",
      },
      originalRoles: {
        cultist1: "SAILOR",
        leader1: "CULT_LEADER",
      },
    };

    render(
      <GameView
        {...defaultProps}
        lobby={lobbyWithCultLeader}
        myRole="CULTIST"
        myPlayerId="cultist1"
      />,
    );

    // Should show "Your Leader" section
    expect(screen.getByText("Your Leader")).toBeDefined();

    // Should show the leader's name
    expect(screen.getByText("The Leader")).toBeDefined();
  });
});
