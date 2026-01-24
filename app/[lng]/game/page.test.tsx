import { cleanup, render, screen } from "@testing-library/react";
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
  GameView: () => <div data-testid="game-view">Game View</div>,
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

// Create mock player
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

// Mock GameContext values
let mockLobby: LobbyState | null = null;
let mockMyPlayerId = "p1";
let mockFeedTheKrakenResult: {
  targetPlayerId: string;
  cultVictory: boolean;
} | null = null;
const mockLeaveLobby = vi.fn();

vi.mock("../../context/GameContext", () => ({
  useGame: () => ({
    lobby: mockLobby,
    myRole: "SAILOR",
    myPlayerId: mockMyPlayerId,
    leaveLobby: mockLeaveLobby,
    error: null,
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
    feedTheKrakenResult: mockFeedTheKrakenResult,
    clearFeedTheKrakenResult: vi.fn(),
    offWithTonguePrompt: null,
    handleOffWithTongueResponse: vi.fn(),
  }),
}));

import GamePage from "./page";

describe("GamePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMyPlayerId = "p1";
    mockLobby = {
      code: "TEST",
      players: [createMockPlayer()],
      status: "PLAYING",
    };
    mockFeedTheKrakenResult = null;
  });

  afterEach(() => {
    cleanup();
  });

  describe("Loading State", () => {
    it("shows loading state when lobby is null", () => {
      mockLobby = null;
      render(<GamePage />);
      expect(screen.getByText("game.loading")).toBeDefined();
    });

    it("shows loading state when lobby status is not PLAYING", () => {
      mockLobby = {
        code: "TEST",
        players: [createMockPlayer()],
        status: "WAITING",
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
      mockLobby = {
        code: "TEST",
        players: [createMockPlayer()],
        status: "PLAYING",
        roleSelectionStatus: {
          state: "SELECTING",
          availableRoles: [],
          selections: {},
        },
      };
      render(<GamePage />);
      expect(screen.getByTestId("role-selection-view")).toBeDefined();
    });

    it("shows CONVERSION view when conversionStatus is ACTIVE", () => {
      mockLobby = {
        code: "TEST",
        players: [createMockPlayer()],
        status: "PLAYING",
        conversionStatus: {
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
        },
      };
      render(<GamePage />);
      expect(screen.getByTestId("conversion-view")).toBeDefined();
    });

    it("shows CULT_CABIN_SEARCH view when cabinSearchStatus is SETUP", () => {
      mockLobby = {
        code: "TEST",
        players: [createMockPlayer()],
        status: "PLAYING",
        cabinSearchStatus: { state: "SETUP", initiatorId: "p1", claims: {} },
      };
      render(<GamePage />);
      expect(screen.getByTestId("cult-cabin-search-view")).toBeDefined();
    });

    it("shows CULT_GUNS_STASH view when gunsStashStatus is WAITING_FOR_PLAYERS", () => {
      mockLobby = {
        code: "TEST",
        players: [createMockPlayer()],
        status: "PLAYING",
        gunsStashStatus: {
          state: "WAITING_FOR_PLAYERS",
          initiatorId: "p1",
          readyPlayers: [],
        },
      };
      render(<GamePage />);
      expect(screen.getByTestId("cult-guns-stash-view")).toBeDefined();
    });
  });

  describe("Eliminated Player Exclusion from Cult Rituals", () => {
    it("shows DASHBOARD for eliminated player even when conversionStatus is ACTIVE", () => {
      mockLobby = {
        code: "TEST",
        players: [createMockPlayer({ isEliminated: true })],
        status: "PLAYING",
        conversionStatus: {
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
        },
      };
      render(<GamePage />);
      // Eliminated player should see DASHBOARD (game-view) not conversion view
      expect(screen.getByTestId("game-view")).toBeDefined();
    });

    it("shows DASHBOARD for eliminated player even when cabinSearchStatus is SETUP", () => {
      mockLobby = {
        code: "TEST",
        players: [createMockPlayer({ isEliminated: true })],
        status: "PLAYING",
        cabinSearchStatus: { state: "SETUP", initiatorId: "p2", claims: {} },
      };
      render(<GamePage />);
      expect(screen.getByTestId("game-view")).toBeDefined();
    });

    it("shows DASHBOARD for eliminated player even when gunsStashStatus is WAITING_FOR_PLAYERS", () => {
      mockLobby = {
        code: "TEST",
        players: [createMockPlayer({ isEliminated: true })],
        status: "PLAYING",
        gunsStashStatus: {
          state: "WAITING_FOR_PLAYERS",
          initiatorId: "p2",
          readyPlayers: [],
        },
      };
      render(<GamePage />);
      expect(screen.getByTestId("game-view")).toBeDefined();
    });

    it("shows DASHBOARD for eliminated player when gunsStashStatus is DISTRIBUTION", () => {
      mockLobby = {
        code: "TEST",
        players: [createMockPlayer({ isEliminated: true })],
        status: "PLAYING",
        gunsStashStatus: {
          state: "DISTRIBUTION",
          initiatorId: "p2",
          readyPlayers: [],
          startTime: Date.now(),
          endTime: Date.now() + 15000,
          playerQuestions: {},
          playerAnswers: {},
        },
      };
      render(<GamePage />);
      expect(screen.getByTestId("game-view")).toBeDefined();
    });

    it("shows DASHBOARD for eliminated player when cabinSearchStatus is ACTIVE", () => {
      mockLobby = {
        code: "TEST",
        players: [createMockPlayer({ isEliminated: true })],
        status: "PLAYING",
        cabinSearchStatus: {
          state: "ACTIVE",
          initiatorId: "p2",
          claims: {},
          startTime: Date.now(),
          endTime: Date.now() + 15000,
          playerQuestions: {},
          playerAnswers: {},
        },
      };
      render(<GamePage />);
      expect(screen.getByTestId("game-view")).toBeDefined();
    });

    it("non-eliminated player still sees CONVERSION view when conversionStatus is ACTIVE", () => {
      mockLobby = {
        code: "TEST",
        players: [createMockPlayer({ isEliminated: false })],
        status: "PLAYING",
        conversionStatus: {
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
        },
      };
      render(<GamePage />);
      expect(screen.getByTestId("conversion-view")).toBeDefined();
    });
  });

  describe("Redirect Behavior", () => {
    it("redirects to /lobby when status is not PLAYING", () => {
      mockLobby = {
        code: "TEST",
        players: [createMockPlayer()],
        status: "WAITING",
      };
      render(<GamePage />);
      expect(mockPush).toHaveBeenCalledWith("/en/lobby", undefined);
    });
  });

  describe("COMPLETED States", () => {
    it("shows CONVERSION view when conversionStatus is COMPLETED and not dismissed", () => {
      mockLobby = {
        code: "TEST",
        players: [createMockPlayer()],
        status: "PLAYING",
        conversionStatus: {
          state: "COMPLETED",
          initiatorId: "p1",
          responses: {},
          round: {
            startTime: Date.now(),
            duration: 15000,
            endTime: Date.now() + 15000,
            playerQuestions: {},
            leaderChoice: "p2",
            playerAnswers: {},
            result: { convertedPlayerId: "p2", correctAnswers: [] },
          },
        },
      };
      render(<GamePage />);
      expect(screen.getByTestId("conversion-view")).toBeDefined();
    });

    it("shows CULT_CABIN_SEARCH view when cabinSearchStatus is COMPLETED and not dismissed", () => {
      mockLobby = {
        code: "TEST",
        players: [createMockPlayer()],
        status: "PLAYING",
        cabinSearchStatus: {
          state: "COMPLETED",
          initiatorId: "p1",
          claims: {},
          result: { correctAnswers: [] },
        },
      };
      render(<GamePage />);
      expect(screen.getByTestId("cult-cabin-search-view")).toBeDefined();
    });

    it("shows CULT_GUNS_STASH view when gunsStashStatus is COMPLETED and not dismissed", () => {
      mockLobby = {
        code: "TEST",
        players: [createMockPlayer()],
        status: "PLAYING",
        gunsStashStatus: {
          state: "COMPLETED",
          initiatorId: "p1",
          readyPlayers: [],
          distribution: { p2: 1 },
        },
      };
      render(<GamePage />);
      expect(screen.getByTestId("cult-guns-stash-view")).toBeDefined();
    });

    it("shows DASHBOARD for eliminated player when conversionStatus is COMPLETED", () => {
      mockLobby = {
        code: "TEST",
        players: [createMockPlayer({ isEliminated: true })],
        status: "PLAYING",
        conversionStatus: {
          state: "COMPLETED",
          initiatorId: "p1",
          responses: {},
          round: {
            startTime: Date.now(),
            duration: 15000,
            endTime: Date.now() + 15000,
            playerQuestions: {},
            leaderChoice: "p2",
            playerAnswers: {},
            result: { convertedPlayerId: "p2", correctAnswers: [] },
          },
        },
      };
      render(<GamePage />);
      expect(screen.getByTestId("game-view")).toBeDefined();
    });

    it("shows DASHBOARD for eliminated player when cabinSearchStatus is COMPLETED", () => {
      mockLobby = {
        code: "TEST",
        players: [createMockPlayer({ isEliminated: true })],
        status: "PLAYING",
        cabinSearchStatus: {
          state: "COMPLETED",
          initiatorId: "p1",
          claims: {},
          result: { correctAnswers: [] },
        },
      };
      render(<GamePage />);
      expect(screen.getByTestId("game-view")).toBeDefined();
    });

    it("shows DASHBOARD for eliminated player when gunsStashStatus is COMPLETED", () => {
      mockLobby = {
        code: "TEST",
        players: [createMockPlayer({ isEliminated: true })],
        status: "PLAYING",
        gunsStashStatus: {
          state: "COMPLETED",
          initiatorId: "p1",
          readyPlayers: [],
          distribution: { p2: 1 },
        },
      };
      render(<GamePage />);
      expect(screen.getByTestId("game-view")).toBeDefined();
    });

    it("shows CULT_CABIN_SEARCH view when cabinSearchStatus is ACTIVE", () => {
      mockLobby = {
        code: "TEST",
        players: [createMockPlayer()],
        status: "PLAYING",
        cabinSearchStatus: {
          state: "ACTIVE",
          initiatorId: "p1",
          claims: {},
          startTime: Date.now(),
          endTime: Date.now() + 15000,
          playerQuestions: {},
          playerAnswers: {},
        },
      };
      render(<GamePage />);
      expect(screen.getByTestId("cult-cabin-search-view")).toBeDefined();
    });

    it("shows CULT_GUNS_STASH view when gunsStashStatus is DISTRIBUTION", () => {
      mockLobby = {
        code: "TEST",
        players: [createMockPlayer()],
        status: "PLAYING",
        gunsStashStatus: {
          state: "DISTRIBUTION",
          initiatorId: "p1",
          readyPlayers: [],
          startTime: Date.now(),
          endTime: Date.now() + 15000,
          playerQuestions: {},
          playerAnswers: {},
        },
      };
      render(<GamePage />);
      expect(screen.getByTestId("cult-guns-stash-view")).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("handles case where player is not found in lobby", () => {
      mockMyPlayerId = "nonexistent";
      mockLobby = {
        code: "TEST",
        players: [createMockPlayer({ id: "other" })],
        status: "PLAYING",
        conversionStatus: {
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
        },
      };
      // Should show the conversion view (since isEliminated is undefined/falsy)
      render(<GamePage />);
      expect(screen.getByTestId("conversion-view")).toBeDefined();
    });

    it("eliminated player can still see role selection", () => {
      mockLobby = {
        code: "TEST",
        players: [createMockPlayer({ isEliminated: true })],
        status: "PLAYING",
        roleSelectionStatus: {
          state: "SELECTING",
          availableRoles: [],
          selections: {},
        },
      };
      render(<GamePage />);
      expect(screen.getByTestId("role-selection-view")).toBeDefined();
    });
  });
  describe("Feed the Kraken Result", () => {
    it("shows result modal with 'not Cult Leader' message when cultVictory is false", () => {
      mockLobby = {
        code: "TEST",
        players: [
          createMockPlayer(),
          createMockPlayer({ id: "p2", name: "Player 2" }),
        ],
        status: "PLAYING",
      };
      mockFeedTheKrakenResult = { targetPlayerId: "p2", cultVictory: false };

      render(<GamePage />);
      expect(screen.getByText("feedTheKraken.notCultLeader")).toBeDefined();
    });

    it("does not show 'not Cult Leader' message when cultVictory is true", () => {
      mockLobby = {
        code: "TEST",
        players: [
          createMockPlayer(),
          createMockPlayer({ id: "p2", name: "Player 2" }),
        ],
        status: "PLAYING",
      };
      mockFeedTheKrakenResult = { targetPlayerId: "p2", cultVictory: true };

      render(<GamePage />);
      expect(screen.queryByText("feedTheKraken.notCultLeader")).toBeNull();
      expect(screen.getByText("feedTheKraken.cultWins")).toBeDefined();
    });
  });
});
