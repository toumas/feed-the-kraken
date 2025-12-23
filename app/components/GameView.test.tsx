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
        hasTongue: true,
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
    isConversionDismissed: false,
    onDismissConversion: vi.fn(),
    onStartCabinSearch: vi.fn(),
    isCabinSearchDismissed: false,
    onDismissCabinSearch: vi.fn(),
    onStartGunsStash: vi.fn(),
    isGunsStashDismissed: false,
    onDismissGunsStash: vi.fn(),
    feedTheKrakenPrompt: null,
    onFeedTheKrakenResponse: vi.fn(),
    feedTheKrakenResult: null,
    onClearFeedTheKrakenResult: vi.fn(),
    offWithTonguePrompt: null,
    onOffWithTongueResponse: vi.fn(),
    onResetGame: vi.fn(),
    onBackToLobby: vi.fn(),
  };

  it("renders role information", () => {
    render(<GameView {...defaultProps} />);
    expect(screen.getByText("Loyal Sailor")).toBeDefined();
    expect(screen.getByText("Steer the ship to blue area.")).toBeDefined();
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

    fireEvent.click(screen.getByText("End Session?"));

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

    fireEvent.click(screen.getByText("End Session?"));

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
    expect(screen.getByText("Conversion")).toBeDefined();
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

    fireEvent.click(screen.getByText("Conversion"));
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
              hasTongue: true,
            },
          ],
          status: "PLAYING",
          conversionStatus,
        }}
        conversionStatus={conversionStatus}
      />,
    );

    // Check for modal title
    expect(screen.getByRole("heading", { name: "Conversion" })).toBeDefined();
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
    expect(screen.getByText("Done")).toBeDefined();
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
          hasTongue: true,
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
          hasTongue: true,
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
          hasTongue: true,
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
    // Converted pirate should still appear in the crew list
    // Returns multiple elements (Crew Status list and Pirate Crew list)
    expect(screen.getAllByText("Pirate 2 (Converted)").length).toBeGreaterThan(
      0,
    );

    // Sailor should NOT appear in the Pirate Crew list (but appears in global list)
    const pirateCrewSection = screen.getByText("Pirate Crew").parentElement;
    if (pirateCrewSection) {
      expect(pirateCrewSection.textContent).not.toContain("Sailor 1");
    }
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
          hasTongue: true,
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
          hasTongue: true,
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
          hasTongue: true,
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
    // It might appear in Crew Status list, but NOT in Pirate Crew section
    // Let's scope the check to the Pirate Crew section
    const pirateCrewSection = screen.getByText("Pirate Crew").parentElement;
    expect(pirateCrewSection).toBeDefined();
    if (pirateCrewSection) {
      // Use within() to scope the query if using @testing-library/react within helper
      // or just query the section container text content
      // Since we don't have 'within' imported, let's use text content check or refined query
      // Simpler approach: check if the text exists specifically inside this hierarchy
      // But queryByText on full screen finds multiples if it exists elsewhere (e.g. Crew Status)
      // Actually, if it's not in the list, it shouldn't be found in this section.
      // However queryByText("Sailor 1 (Converted)") might find it in the Crew Status section now!
      // So we must be careful.
      // Let's verify "Sailor 1 (Converted)" is NOT in the pirate list container.
      expect(pirateCrewSection.textContent).not.toContain(
        "Sailor 1 (Converted)",
      );
    }

    // Should show "No other pirates" message
    expect(screen.getByText("No other pirates")).toBeDefined();
  });

  it("converted cultist sees Cult Leader", () => {
    const lobbyWithCultLeader: LobbyState = {
      ...mockLobby,
      players: [
        {
          id: "cultist1",
          name: "Converted Sailor",
          photoUrl: null,
          isHost: false,
          isReady: true,
          isOnline: true,
          isEliminated: false,
          isUnconvertible: false,
          notRole: null,
          joinedAt: Date.now(),
          hasTongue: true,
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
          hasTongue: true,
        },
      ],
      status: "PLAYING",
      assignments: {
        cultist1: "CULTIST",
        leader1: "CULT_LEADER",
      },
      originalRoles: {
        cultist1: "SAILOR", // Was originally a sailor, then converted
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
    const leaderNameElements = screen.getAllByText("The Leader");
    expect(leaderNameElements.length).toBeGreaterThan(0);
  });

  it("original cultist does NOT see Cult Leader", () => {
    const lobbyWithOriginalCultist: LobbyState = {
      ...mockLobby,
      players: [
        {
          id: "cultist1",
          name: "Original Cultist",
          photoUrl: null,
          isHost: false,
          isReady: true,
          isOnline: true,
          isEliminated: false,
          isUnconvertible: false,
          notRole: null,
          joinedAt: Date.now(),
          hasTongue: true,
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
          hasTongue: true,
        },
      ],
      status: "PLAYING",
      assignments: {
        cultist1: "CULTIST",
        leader1: "CULT_LEADER",
      },
      originalRoles: {
        cultist1: "CULTIST", // Was originally dealt CULTIST role (11-player game)
        leader1: "CULT_LEADER",
      },
    };

    render(
      <GameView
        {...defaultProps}
        lobby={lobbyWithOriginalCultist}
        myRole="CULTIST"
        myPlayerId="cultist1"
      />,
    );

    // Should NOT show "Your Leader" section
    expect(screen.queryByText("Your Leader")).toBeNull();
  });

  it("converted cultist sees Cult Leader but not other cult members", () => {
    const lobbyWithMultipleCultists: LobbyState = {
      ...mockLobby,
      players: [
        {
          id: "converted1",
          name: "Converted Sailor",
          photoUrl: null,
          isHost: false,
          isReady: true,
          isOnline: true,
          isEliminated: false,
          isUnconvertible: false,
          notRole: null,
          joinedAt: Date.now(),
          hasTongue: true,
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
          hasTongue: true,
        },
        {
          id: "originalCultist",
          name: "Original Cultist",
          photoUrl: null,
          isHost: false,
          isReady: true,
          isOnline: true,
          isEliminated: false,
          isUnconvertible: false,
          notRole: null,
          joinedAt: Date.now(),
          hasTongue: true,
        },
      ],
      status: "PLAYING",
      assignments: {
        converted1: "CULTIST",
        leader1: "CULT_LEADER",
        originalCultist: "CULTIST",
      },
      originalRoles: {
        converted1: "SAILOR", // Was converted
        leader1: "CULT_LEADER",
        originalCultist: "CULTIST", // Was originally dealt CULTIST
      },
    };

    render(
      <GameView
        {...defaultProps}
        lobby={lobbyWithMultipleCultists}
        myRole="CULTIST"
        myPlayerId="converted1"
      />,
    );

    // Should show "Your Leader" section with the leader
    expect(screen.getByText("Your Leader")).toBeDefined();
    expect(screen.getAllByText("The Leader").length).toBeGreaterThan(0);

    // Should NOT show other cultists in the "Your Leader" section
    const yourLeaderSection = screen.getByText("Your Leader").parentElement;
    expect(yourLeaderSection?.textContent).not.toContain("Original Cultist");
  });

  it("renders multiple statuses simultaneously in Crew Status", () => {
    const lobbyWithMultipleStatuses: LobbyState = {
      ...mockLobby,
      players: [
        {
          ...mockLobby.players[0],
          id: "p1",
          name: "Player 1",
          isEliminated: false,
        },
        {
          ...mockLobby.players[0],
          id: "p2",
          name: "Multitasker",
          isEliminated: true,
          isUnconvertible: true,
          hasTongue: false,
          isOnline: false,
        },
      ],
      status: "PLAYING",
    };

    render(<GameView {...defaultProps} lobby={lobbyWithMultipleStatuses} />);

    // Check that all labels are present
    expect(screen.getByText("Eliminated")).toBeDefined();
    expect(screen.getByText("Unconvertible")).toBeDefined();
    expect(screen.getByText("Silenced")).toBeDefined();
    expect(screen.getByText("Offline")).toBeDefined();
    expect(screen.getByText("Multitasker")).toBeDefined();
  });
});
