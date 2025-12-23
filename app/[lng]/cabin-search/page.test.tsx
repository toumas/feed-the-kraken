import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameContextValue } from "../../context/GameContext";

// Mock useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock useGame
vi.mock("../../context/GameContext", () => ({
  useGame: vi.fn(),
}));

import { useGame } from "../../context/GameContext";
import CabinSearchPage from "./page";

describe("CabinSearchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const createMockGameContext = (
    overrides: Partial<GameContextValue> = {},
  ): GameContextValue => ({
    lobby: {
      code: "TEST",
      players: [
        {
          id: "p1",
          name: "Searcher",
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
        {
          id: "p2",
          name: "Target Player",
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
    },
    myPlayerId: "p1",
    myName: "Searcher",
    myPhoto: null,
    myRole: "SAILOR",
    connectionStatus: "connected",
    handleCabinSearch: vi.fn(),
    isCabinSearchPending: false,
    cabinSearchResult: null,
    clearCabinSearchResult: vi.fn(),
    // Add other required context values as needed
    updateMyProfile: vi.fn(),
    connectToLobby: vi.fn(),
    disconnectFromLobby: vi.fn(),
    createLobby: vi.fn(),
    joinLobby: vi.fn(),
    leaveLobby: vi.fn(),
    startGame: vi.fn(),
    addBotPlayer: vi.fn(),
    handleDenialOfCommand: vi.fn(),
    handleCabinSearchResponse: vi.fn(),
    handleFloggingRequest: vi.fn(),
    handleFloggingConfirmationResponse: vi.fn(),
    floggingConfirmationPrompt: null,
    floggingReveal: null,
    clearFloggingReveal: vi.fn(),
    handleStartConversion: vi.fn(),
    handleRespondConversion: vi.fn(),
    submitConversionAction: vi.fn(),
    isConversionDismissed: false,
    setIsConversionDismissed: vi.fn(),
    isCabinSearchDismissed: false,
    setIsCabinSearchDismissed: vi.fn(),
    handleResetGame: vi.fn(),
    handleBackToLobby: vi.fn(),
    cabinSearchPrompt: null,
    startCabinSearch: vi.fn(),
    claimCabinSearchRole: vi.fn(),
    submitCabinSearchAction: vi.fn(),
    cancelCabinSearch: vi.fn(),
    startGunsStash: vi.fn(),
    confirmGunsStashReady: vi.fn(),
    submitGunsStashDistribution: vi.fn(),
    submitGunsStashAction: vi.fn(),
    cancelGunsStash: vi.fn(),
    isGunsStashDismissed: false,
    setIsGunsStashDismissed: vi.fn(),
    handleFeedTheKrakenRequest: vi.fn(),
    handleFeedTheKrakenResponse: vi.fn(),
    feedTheKrakenPrompt: null,
    feedTheKrakenResult: null,
    isFeedTheKrakenPending: false,
    clearFeedTheKrakenResult: vi.fn(),
    handleOffWithTongueRequest: vi.fn(),
    handleOffWithTongueResponse: vi.fn(),
    offWithTonguePrompt: null,
    isOffWithTonguePending: false,
    setRoleDistributionMode: vi.fn(),
    selectRole: vi.fn(),
    confirmRole: vi.fn(),
    cancelRoleSelection: vi.fn(),
    error: null,
    setError: vi.fn(),
    view: "GAME",
    ...overrides,
  });

  it("shows Sailor role for non-converted player", () => {
    vi.mocked(useGame).mockReturnValue(
      createMockGameContext({
        cabinSearchResult: {
          targetPlayerId: "p2",
          role: "SAILOR",
        },
      }),
    );

    render(<CabinSearchPage />);

    // Should show the role reveal overlay
    expect(screen.getByText("Cabin Searched")).toBeDefined();
    expect(screen.getByText("Loyal Sailor")).toBeDefined();
  });

  it("shows Pirate role for non-converted player", () => {
    vi.mocked(useGame).mockReturnValue(
      createMockGameContext({
        cabinSearchResult: {
          targetPlayerId: "p2",
          role: "PIRATE",
        },
      }),
    );

    render(<CabinSearchPage />);

    expect(screen.getByText("Pirate")).toBeDefined();
  });

  it("shows Cult Leader role", () => {
    vi.mocked(useGame).mockReturnValue(
      createMockGameContext({
        cabinSearchResult: {
          targetPlayerId: "p2",
          role: "CULT_LEADER",
        },
      }),
    );

    render(<CabinSearchPage />);

    expect(screen.getByText("Cult Leader")).toBeDefined();
  });

  it("shows original Sailor role with Converted to Cult badge for converted player", () => {
    vi.mocked(useGame).mockReturnValue(
      createMockGameContext({
        cabinSearchResult: {
          targetPlayerId: "p2",
          role: "CULTIST",
          originalRole: "SAILOR",
        },
      }),
    );

    render(<CabinSearchPage />);

    // Should show the original role
    expect(screen.getByText("Loyal Sailor")).toBeDefined();
    // Should show the converted badge
    expect(screen.getByText("Converted to Cult")).toBeDefined();
  });

  it("shows original Pirate role with Converted to Cult badge for converted player", () => {
    vi.mocked(useGame).mockReturnValue(
      createMockGameContext({
        cabinSearchResult: {
          targetPlayerId: "p2",
          role: "CULTIST",
          originalRole: "PIRATE",
        },
      }),
    );

    render(<CabinSearchPage />);

    // Should show the original role
    expect(screen.getByText("Pirate")).toBeDefined();
    // Should show the converted badge
    expect(screen.getByText("Converted to Cult")).toBeDefined();
  });

  it("shows target player name in result", () => {
    vi.mocked(useGame).mockReturnValue(
      createMockGameContext({
        cabinSearchResult: {
          targetPlayerId: "p2",
          role: "SAILOR",
        },
      }),
    );

    render(<CabinSearchPage />);

    expect(
      screen.getByText("You found Target Player's loyalty card!"),
    ).toBeDefined();
  });

  it("shows pending state when waiting for confirmation", () => {
    vi.mocked(useGame).mockReturnValue(
      createMockGameContext({
        isCabinSearchPending: true,
      }),
    );

    render(<CabinSearchPage />);

    expect(screen.getByText("Waiting for Confirmation")).toBeDefined();
    expect(
      screen.getByText("The crewmate must allow the search..."),
    ).toBeDefined();
  });
});
