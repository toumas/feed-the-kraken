import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LobbyState, Player } from "../../types";

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: vi.fn(),
  }),
  useParams: () => ({ lng: "en" }),
}));

// Mock i18n
vi.mock("../../i18n/client", () => ({
  useT: () => ({
    t: (key: string) => key,
  }),
}));

// Mock Activity component (React 19 feature)
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    Activity: ({
      mode,
      children,
    }: {
      mode: string;
      children: React.ReactNode;
    }) => (
      <div
        data-testid={`activity-${mode}`}
        style={{ display: mode === "visible" ? "block" : "none" }}
      >
        {children}
      </div>
    ),
  };
});

// Mock child components
vi.mock("../../components/GameView", () => ({
  GameView: ({
    onOpenCabinSearch,
    onOpenFeedTheKraken,
    onOpenFlogging,
    onOpenOffWithTongue,
    onOpenDenial,
  }: {
    onOpenCabinSearch?: () => void;
    onOpenFeedTheKraken?: () => void;
    onOpenFlogging?: () => void;
    onOpenOffWithTongue?: () => void;
    onOpenDenial?: () => void;
  }) => (
    <div data-testid="game-view">
      Game View
      <button
        type="button"
        onClick={onOpenCabinSearch}
        data-testid="open-cabin-search"
      >
        Open Cabin Search
      </button>
      <button
        type="button"
        onClick={onOpenFeedTheKraken}
        data-testid="open-feed-kraken"
      >
        Open Feed Kraken
      </button>
      <button
        type="button"
        onClick={onOpenFlogging}
        data-testid="open-flogging"
      >
        Open Flogging
      </button>
      <button
        type="button"
        onClick={onOpenOffWithTongue}
        data-testid="open-off-with-tongue"
      >
        Open Off With Tongue
      </button>
      <button type="button" onClick={onOpenDenial} data-testid="open-denial">
        Open Denial
      </button>
    </div>
  ),
}));

vi.mock("../../components/views/RoleSelectionView", () => ({
  RoleSelectionView: () => (
    <div data-testid="role-selection-view">Role Selection</div>
  ),
}));

vi.mock("../../components/views/ConversionView", () => ({
  ConversionView: () => (
    <div data-testid="conversion-view">Conversion View</div>
  ),
}));

vi.mock("../../components/views/CultCabinSearchView", () => ({
  CultCabinSearchView: () => (
    <div data-testid="cult-cabin-search-view">Cult Cabin Search</div>
  ),
}));

vi.mock("../../components/views/CultGunsStashView", () => ({
  CultGunsStashView: () => (
    <div data-testid="cult-guns-stash-view">Cult Guns Stash</div>
  ),
}));

vi.mock("../../components/views/CabinSearchView", () => ({
  CabinSearchView: () => (
    <div data-testid="cabin-search-view">Cabin Search</div>
  ),
}));

vi.mock("../../components/views/FeedTheKrakenView", () => ({
  FeedTheKrakenView: () => (
    <div data-testid="feed-kraken-view">Feed Kraken</div>
  ),
}));

vi.mock("../../components/views/FloggingView", () => ({
  FloggingView: () => <div data-testid="flogging-view">Flogging</div>,
}));

vi.mock("../../components/views/OffWithTongueView", () => ({
  OffWithTongueView: () => (
    <div data-testid="off-with-tongue-view">Off With Tongue</div>
  ),
}));

vi.mock("../../components/views/DenialView", () => ({
  DenialView: () => <div data-testid="denial-view">Denial</div>,
}));

vi.mock("../../components/CancellationModal", () => ({
  CancellationModal: {
    Root: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="cancellation-modal">{children}</div>
    ),
    Header: () => null,
    Body: () => null,
    Action: () => null,
  },
}));

vi.mock("../../components/ReadyCheckModal", () => ({
  ReadyCheckModal: {
    Root: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="ready-check-modal">{children}</div>
    ),
    Header: () => null,
    Description: () => null,
    PlayerList: () => null,
    PlayerItem: () => null,
    WaitingText: () => null,
    Actions: () => null,
    ActionButtons: () => null,
    CancelButton: () => null,
    ReadyButton: () => null,
  },
}));

vi.mock("../../components/InlineError", () => ({
  InlineError: ({ message }: { message: string }) => (
    <div data-testid="inline-error">{message}</div>
  ),
}));

vi.mock("../../components/Avatar", () => ({
  Avatar: () => <div data-testid="avatar" />,
}));

// Helpers
const createMockPlayer = (overrides: Partial<Player> = {}): Player => ({
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
  ...overrides,
});

// --- HOISTED MOCK STATE ---
const { mockedGameContext } = vi.hoisted(() => ({
  mockedGameContext: {
    lobby: null as LobbyState | null,
    myRole: "SAILOR",
    myPlayerId: "p1",
    leaveLobby: vi.fn(),
    error: null as string | null,
    setError: vi.fn(),
    cabinSearchPrompt: null,
    handleCabinSearchResponse: vi.fn(),
    floggingConfirmationPrompt: null,
    handleFloggingConfirmationResponse: vi.fn(),
    floggingReveal: null,
    clearFloggingReveal: vi.fn(),
    handleStartConversion: vi.fn(),
    handleRespondConversion: vi.fn(),
    handleResetGame: vi.fn(),
    handleBackToLobby: vi.fn(),
    startCabinSearch: vi.fn(),
    isConversionDismissed: false,
    setIsConversionDismissed: vi.fn(),
    isCabinSearchDismissed: false,
    setIsCabinSearchDismissed: vi.fn(),
    startGunsStash: vi.fn(),
    isGunsStashDismissed: false,
    setIsGunsStashDismissed: vi.fn(),
    handleFeedTheKrakenResponse: vi.fn(),
    feedTheKrakenPrompt: null,
    feedTheKrakenResult: null as {
      targetPlayerId: string;
      cultVictory: boolean;
    } | null,
    clearFeedTheKrakenResult: vi.fn(),
    offWithTonguePrompt: null,
    handleOffWithTongueResponse: vi.fn(),
  },
}));

vi.mock("../../context/GameContext", () => ({
  useGame: () => mockedGameContext,
}));

import GamePage from "./page";

describe("GamePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default valid state
    mockedGameContext.lobby = {
      code: "TEST",
      players: [createMockPlayer()],
      status: "PLAYING",
    };
    mockedGameContext.myPlayerId = "p1";
    mockedGameContext.myRole = "SAILOR";
    mockedGameContext.error = null;
    mockedGameContext.feedTheKrakenResult = null;
    mockedGameContext.cabinSearchPrompt = null;
    mockedGameContext.floggingConfirmationPrompt = null;
    mockedGameContext.floggingReveal = null;
    mockedGameContext.feedTheKrakenPrompt = null;
    mockedGameContext.offWithTonguePrompt = null;
    mockedGameContext.isConversionDismissed = false;
    mockedGameContext.isCabinSearchDismissed = false;
    mockedGameContext.isGunsStashDismissed = false;

    // Reset localStorage for new tests
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  afterEach(() => {
    cleanup();
  });

  describe("Loading State", () => {
    it("shows loading state when lobby is null", () => {
      mockedGameContext.lobby = null;
      render(<GamePage />);
      expect(screen.getByText("game.loading")).toBeDefined();
    });

    it("shows loading state when lobby status is not PLAYING", () => {
      mockedGameContext.lobby = {
        code: "TEST",
        players: [createMockPlayer()],
        status: "WAITING", // Not PLAYING
      };
      render(<GamePage />);
      expect(screen.getByText("game.loading")).toBeDefined();
    });
  });

  describe("Active View Routing", () => {
    it("shows DASHBOARD view by default", () => {
      render(<GamePage />);
      expect(screen.getByTestId("game-view")).toBeDefined();
    });

    it("shows ROLE_SELECTION view when roleSelectionStatus is SELECTING", () => {
      if (mockedGameContext.lobby) {
        mockedGameContext.lobby.roleSelectionStatus = {
          state: "SELECTING",
          availableRoles: [],
          selections: {},
        };
      }
      render(<GamePage />);
      expect(screen.getByTestId("role-selection-view")).toBeDefined();
    });

    it("shows CONVERSION view when conversionStatus is ACTIVE", () => {
      if (mockedGameContext.lobby) {
        mockedGameContext.lobby.conversionStatus = {
          state: "ACTIVE",
          initiatorId: "p1",
          responses: {},
          round: {
            startTime: Date.now(),
            duration: 15000,
            endTime: Date.now() + 15000,
            playerQuestions: {},
            leaderChoice: null,
            playerAnswers: {},
          },
        };
      }
      render(<GamePage />);
      expect(screen.getByTestId("conversion-view")).toBeDefined();
    });

    it("shows CULT_CABIN_SEARCH view when cabinSearchStatus is SETUP", () => {
      if (mockedGameContext.lobby) {
        mockedGameContext.lobby.cabinSearchStatus = {
          state: "SETUP",
          initiatorId: "p1",
          claims: {},
        };
      }
      render(<GamePage />);
      expect(screen.getByTestId("cult-cabin-search-view")).toBeDefined();
    });

    it("shows CULT_GUNS_STASH view when gunsStashStatus is WAITING_FOR_PLAYERS", () => {
      if (mockedGameContext.lobby) {
        mockedGameContext.lobby.gunsStashStatus = {
          state: "WAITING_FOR_PLAYERS",
          initiatorId: "p1",
          readyPlayers: [],
        };
      }
      render(<GamePage />);
      expect(screen.getByTestId("cult-guns-stash-view")).toBeDefined();
    });
  });

  describe("Eliminated Player Exclusion from Cult Rituals", () => {
    it("shows DASHBOARD for eliminated player even when conversionStatus is ACTIVE", () => {
      if (mockedGameContext.lobby) {
        mockedGameContext.lobby.players = [
          createMockPlayer({ isEliminated: true }),
        ];
        mockedGameContext.lobby.conversionStatus = {
          state: "ACTIVE",
          initiatorId: "p2",
          responses: {},
          round: {
            startTime: Date.now(),
            duration: 15000,
            endTime: Date.now() + 15000,
            playerQuestions: {},
            leaderChoice: null,
            playerAnswers: {},
          },
        };
      }
      render(<GamePage />);
      expect(screen.getByTestId("game-view")).toBeDefined();
    });

    it("shows DASHBOARD for eliminated player even when cabinSearchStatus is SETUP", () => {
      if (mockedGameContext.lobby) {
        mockedGameContext.lobby.players = [
          createMockPlayer({ isEliminated: true }),
        ];
        mockedGameContext.lobby.cabinSearchStatus = {
          state: "SETUP",
          initiatorId: "p2",
          claims: {},
        };
      }
      render(<GamePage />);
      expect(screen.getByTestId("game-view")).toBeDefined();
    });

    it("shows DASHBOARD for eliminated player even when gunsStashStatus is WAITING_FOR_PLAYERS", () => {
      if (mockedGameContext.lobby) {
        mockedGameContext.lobby.players = [
          createMockPlayer({ isEliminated: true }),
        ];
        mockedGameContext.lobby.gunsStashStatus = {
          state: "WAITING_FOR_PLAYERS",
          initiatorId: "p2",
          readyPlayers: [],
        };
      }
      render(<GamePage />);
      expect(screen.getByTestId("game-view")).toBeDefined();
    });
  });

  describe("Redirect Behavior", () => {
    it("redirects to /lobby when status is not PLAYING", () => {
      mockedGameContext.lobby = {
        code: "TEST",
        players: [createMockPlayer()],
        status: "WAITING",
      };
      render(<GamePage />);
      expect(mockPush).toHaveBeenCalledWith("/en/lobby", undefined);
    });
  });

  describe("Edge Cases", () => {
    it("handles case where player is not found in lobby", () => {
      mockedGameContext.myPlayerId = "nonexistent";
      if (mockedGameContext.lobby) {
        mockedGameContext.lobby.players = [createMockPlayer({ id: "other" })];
        mockedGameContext.lobby.conversionStatus = {
          state: "ACTIVE",
          initiatorId: "p1",
          responses: {},
          round: {
            startTime: Date.now(),
            duration: 15000,
            endTime: Date.now() + 15000,
            playerQuestions: {},
            leaderChoice: null,
            playerAnswers: {},
          },
        };
      }
      render(<GamePage />);
      // Should default to showing view if not explicitly eliminated
      expect(screen.getByTestId("conversion-view")).toBeDefined();
    });
  });

  describe("Feed the Kraken Result", () => {
    it("shows result modal with 'not Cult Leader' message when cultVictory is false", () => {
      if (mockedGameContext.lobby) {
        mockedGameContext.lobby.players = [
          createMockPlayer(),
          createMockPlayer({ id: "p2", name: "Player 2" }),
        ];
      }
      mockedGameContext.feedTheKrakenResult = {
        targetPlayerId: "p2",
        cultVictory: false,
      };
      render(<GamePage />);
      expect(screen.getByText("feedTheKraken.notCultLeader")).toBeDefined();
    });

    it("does not show 'not Cult Leader' message when cultVictory is true", () => {
      if (mockedGameContext.lobby) {
        mockedGameContext.lobby.players = [
          createMockPlayer(),
          createMockPlayer({ id: "p2", name: "Player 2" }),
        ];
      }
      mockedGameContext.feedTheKrakenResult = {
        targetPlayerId: "p2",
        cultVictory: true,
      };
      render(<GamePage />);
      expect(screen.queryByText("feedTheKraken.notCultLeader")).toBeNull();
      expect(screen.getByText("feedTheKraken.cultWins")).toBeDefined();
    });
  });

  describe("Captain Announcement", () => {
    it("shows captain announcement modal when captain is appointed", () => {
      if (mockedGameContext.lobby) {
        const captain = createMockPlayer({ id: "p2", name: "Captain Jack" });
        mockedGameContext.lobby.players = [createMockPlayer(), captain];
        mockedGameContext.lobby.captainId = "p2";
      }
      render(<GamePage />);
      expect(screen.getByText("captainAnnouncement.title")).toBeDefined();
      expect(screen.getByText("Captain Jack")).toBeDefined();
    });

    it("dismisses captain announcement modal when OK is clicked", () => {
      if (mockedGameContext.lobby) {
        const captain = createMockPlayer({ id: "p2", name: "Captain Jack" });
        mockedGameContext.lobby.players = [createMockPlayer(), captain];
        mockedGameContext.lobby.captainId = "p2";
      }
      render(<GamePage />);
      // Click the OK button
      const okButton = screen.getByText("captainAnnouncement.ok");
      fireEvent.click(okButton);
      // Expect modal to be gone
      expect(screen.queryByText("captainAnnouncement.title")).toBeNull();
      // Verify persistence
      expect(
        localStorage.getItem("kraken_captain_announcement_dismissed"),
      ).toBe("true");
    });

    it("does not show captain announcement modal if already dismissed in localStorage", () => {
      localStorage.setItem("kraken_captain_announcement_dismissed", "true");
      if (mockedGameContext.lobby) {
        const captain = createMockPlayer({ id: "p2", name: "Captain Jack" });
        mockedGameContext.lobby.players = [createMockPlayer(), captain];
        mockedGameContext.lobby.captainId = "p2";
      }
      render(<GamePage />);
      expect(screen.queryByText("captainAnnouncement.title")).toBeNull();
    });
  });

  describe("Error Clearing on View Transitions", () => {
    it("clears error when opening Cabin Search view", () => {
      render(<GamePage />);
      fireEvent.click(screen.getByTestId("open-cabin-search"));
      expect(mockedGameContext.setError).toHaveBeenCalledWith(null);
    });

    it("clears error when opening Feed The Kraken view", () => {
      render(<GamePage />);
      fireEvent.click(screen.getByTestId("open-feed-kraken"));
      expect(mockedGameContext.setError).toHaveBeenCalledWith(null);
    });

    it("clears error when opening Flogging view", () => {
      render(<GamePage />);
      fireEvent.click(screen.getByTestId("open-flogging"));
      expect(mockedGameContext.setError).toHaveBeenCalledWith(null);
    });

    it("clears error when opening Off With Tongue view", () => {
      render(<GamePage />);
      fireEvent.click(screen.getByTestId("open-off-with-tongue"));
      expect(mockedGameContext.setError).toHaveBeenCalledWith(null);
    });

    it("clears error when opening Denial view", () => {
      render(<GamePage />);
      fireEvent.click(screen.getByTestId("open-denial"));
      expect(mockedGameContext.setError).toHaveBeenCalledWith(null);
    });
  });
});
