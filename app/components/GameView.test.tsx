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
    onStartConversion: vi.fn(),
    onStartCabinSearch: vi.fn(),
    onStartGunsStash: vi.fn(),
    onOpenCabinSearch: vi.fn(),
    onOpenFeedTheKraken: vi.fn(),
    onOpenFlogging: vi.fn(),
    onOpenOffWithTongue: vi.fn(),
    onOpenDenial: vi.fn(),
    onOpenResetGame: vi.fn(),
    onOpenBackToLobby: vi.fn(),
  };

  // Helper to simulate 5 taps to reveal role
  const revealRole = () => {
    const revealButton = screen.getByText("Tap 5 times to reveal your role.");
    for (let i = 0; i < 5; i++) {
      fireEvent.click(revealButton);
    }
  };

  it("renders role information after reveal", () => {
    render(<GameView {...defaultProps} />);
    revealRole();
    expect(screen.getByText("Sailor")).toBeDefined();
    expect(screen.getByText("Steer the ship to blue area.")).toBeDefined();
  });

  it("renders Denial of Command button and calls callback when clicked", () => {
    const onOpenDenial = vi.fn();
    render(<GameView {...defaultProps} onOpenDenial={onOpenDenial} />);
    const button = screen.getByText("Denial of Command");
    fireEvent.click(button);
    expect(onOpenDenial).toHaveBeenCalled();
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

  it("shows disabled-looking flogging button and shows alert when used", () => {
    const onOpenFlogging = vi.fn();
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(
      <GameView
        {...defaultProps}
        lobby={{ ...mockLobby, isFloggingUsed: true }}
        onOpenFlogging={onOpenFlogging}
      />,
    );
    const button = screen.getByText("Flogging (Used)");
    expect(button).toBeDefined();
    expect(button.className).toContain("bg-slate-800/50");
    expect(button.className).toContain("text-slate-500");
    fireEvent.click(button);
    // Should show alert instead of calling onOpenFlogging
    expect(alertMock).toHaveBeenCalledWith(
      "Flogging has already been used this game.",
    );
    expect(onOpenFlogging).not.toHaveBeenCalled();
    alertMock.mockRestore();
  });

  it("renders End Session button", () => {
    render(<GameView {...defaultProps} />);
    revealRole();
    const endSessionButton = screen.getByRole("button", {
      name: /End Session/i,
    });
    expect(endSessionButton).toBeDefined();
  });

  it("shows End Session modal for eliminated player", () => {
    const onLeave = vi.fn();
    const eliminatedLobby: LobbyState = {
      ...mockLobby,
      players: [
        {
          ...mockLobby.players[0],
          isEliminated: true,
        },
      ],
    };

    render(
      <GameView {...defaultProps} lobby={eliminatedLobby} onLeave={onLeave} />,
    );

    // Click Return to Shore to show the End Session modal
    fireEvent.click(screen.getByText("Return to Shore"));

    // Modal should appear
    const leaveButton = screen.getByRole("button", { name: /Leave/i });
    expect(leaveButton).toBeDefined();

    // Click Leave
    fireEvent.click(leaveButton);
    expect(onLeave).toHaveBeenCalled();
  });

  it("renders Cabin Search button and calls callback when clicked", () => {
    const onOpenCabinSearch = vi.fn();
    render(
      <GameView {...defaultProps} onOpenCabinSearch={onOpenCabinSearch} />,
    );
    revealRole();
    const button = screen.getByRole("button", { name: "Cabin Search" });
    fireEvent.click(button);
    expect(onOpenCabinSearch).toHaveBeenCalled();
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

    revealRole();

    // Pirate Crew section should be visible
    expect(screen.getByText("Pirate Crew")).toBeDefined();

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

    revealRole();

    // Verify the role reveal shows "Cultist" role
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

    revealRole();

    // Pirate Crew section should be visible
    expect(screen.getByText("Pirate Crew")).toBeDefined();

    // Converted sailor should NOT appear in the crew list
    const pirateCrewSection = screen.getByText("Pirate Crew").parentElement;
    expect(pirateCrewSection).toBeDefined();
    if (pirateCrewSection) {
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

    revealRole();

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

    revealRole();

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

  it("does not render sailor count text", () => {
    render(<GameView {...defaultProps} />);
    expect(screen.queryByText(/Sailors/i)).toBeNull();
    expect(screen.queryByText(/Merenkulkijaa/i)).toBeNull();
    expect(screen.queryByText("game.sailors")).toBeNull();
  });

  // --- Action Limitation Tests ---

  it("shows alert when clicking Cabin Search at limit", () => {
    const onOpenCabinSearch = vi.fn();
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(
      <GameView
        {...defaultProps}
        lobby={{ ...mockLobby, cabinSearchCount: 2 }}
        onOpenCabinSearch={onOpenCabinSearch}
      />,
    );
    revealRole();
    const button = screen.getByText("Cabin Search (Used)");
    fireEvent.click(button);
    expect(alertMock).toHaveBeenCalledWith(
      "Cabin Search can only be used 2 times per game.",
    );
    expect(onOpenCabinSearch).not.toHaveBeenCalled();
    alertMock.mockRestore();
  });

  it("shows alert when clicking Feed the Kraken at limit", () => {
    const onOpenFeedTheKraken = vi.fn();
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(
      <GameView
        {...defaultProps}
        lobby={{ ...mockLobby, feedTheKrakenCount: 2 }}
        onOpenFeedTheKraken={onOpenFeedTheKraken}
      />,
    );
    revealRole();
    const button = screen.getByText("Feed the Kraken (Used)");
    fireEvent.click(button);
    expect(alertMock).toHaveBeenCalledWith(
      "The Kraken can only be fed 2 times per game.",
    );
    expect(onOpenFeedTheKraken).not.toHaveBeenCalled();
    alertMock.mockRestore();
  });

  it("shows alert when clicking Conversion at limit", () => {
    const onStartConversion = vi.fn();
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(
      <GameView
        {...defaultProps}
        lobby={{ ...mockLobby, conversionCount: 3 }}
        onStartConversion={onStartConversion}
      />,
    );
    const button = screen.getByText("Conversion to Cult (Used)");
    fireEvent.click(button);
    expect(alertMock).toHaveBeenCalledWith(
      "The conversion ritual can only be performed 3 times per game.",
    );
    expect(onStartConversion).not.toHaveBeenCalled();
    alertMock.mockRestore();
  });

  it("shows alert when clicking Off with Tongue when used", () => {
    const onOpenOffWithTongue = vi.fn();
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(
      <GameView
        {...defaultProps}
        lobby={{ ...mockLobby, isOffWithTongueUsed: true }}
        onOpenOffWithTongue={onOpenOffWithTongue}
      />,
    );
    revealRole();
    const button = screen.getByText("Off with the Tongue (Used)");
    fireEvent.click(button);
    expect(alertMock).toHaveBeenCalledWith(
      "Off with the Tongue has already been used this game.",
    );
    expect(onOpenOffWithTongue).not.toHaveBeenCalled();
    alertMock.mockRestore();
  });
});
