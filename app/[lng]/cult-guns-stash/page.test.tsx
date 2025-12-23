import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type GameContextValue, useGame } from "../../context/GameContext";
import CultGunsStashPage from "./page";

// Mock hooks
vi.mock("../../context/GameContext");
vi.mock("next/navigation");

describe("CultGunsStashPage", () => {
  const mockPush = vi.fn();
  const mockConfirmGunsStashReady = vi.fn();
  const mockSubmitGunsStashDistribution = vi.fn();
  const mockSubmitGunsStashAction = vi.fn();
  const mockCancelGunsStash = vi.fn();

  const mockPlayers = [
    {
      id: "p1",
      name: "Host",
      photoUrl: null,
      isHost: true,
      isReady: true,
      isOnline: true,
      isEliminated: false,
      isUnconvertible: false,
      notRole: null,
      joinedAt: Date.now(),
    },
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
    {
      id: "p3",
      name: "Player 3",
      photoUrl: null,
      isHost: false,
      isReady: true,
      isOnline: true,
      isEliminated: false,
      isUnconvertible: false,
      notRole: null,
      joinedAt: Date.now(),
    },
  ];

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as unknown as ReturnType<typeof useRouter>);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("Loading State", () => {
    it("renders null when no lobby", () => {
      vi.mocked(useGame).mockReturnValue({
        lobby: null,
        myPlayerId: "p1",
        myRole: "SAILOR",
        confirmGunsStashReady: mockConfirmGunsStashReady,
        submitGunsStashDistribution: mockSubmitGunsStashDistribution,
        submitGunsStashAction: mockSubmitGunsStashAction,
        cancelGunsStash: mockCancelGunsStash,
        isGunsStashDismissed: false,
      } as unknown as GameContextValue);

      const { container } = render(<CultGunsStashPage />);
      expect(container.innerHTML).toBe("");
    });

    it("redirects to home when no lobby", () => {
      vi.mocked(useGame).mockReturnValue({
        lobby: null,
        myPlayerId: "p1",
        myRole: "SAILOR",
        confirmGunsStashReady: mockConfirmGunsStashReady,
        submitGunsStashDistribution: mockSubmitGunsStashDistribution,
        submitGunsStashAction: mockSubmitGunsStashAction,
        cancelGunsStash: mockCancelGunsStash,
        isGunsStashDismissed: false,
      } as unknown as GameContextValue);

      render(<CultGunsStashPage />);
      expect(mockPush).toHaveBeenCalledWith("/");
    });

    it("renders null when no gunsStashStatus", () => {
      vi.mocked(useGame).mockReturnValue({
        lobby: { players: mockPlayers, gunsStashStatus: undefined },
        myPlayerId: "p1",
        myRole: "SAILOR",
        confirmGunsStashReady: mockConfirmGunsStashReady,
        submitGunsStashDistribution: mockSubmitGunsStashDistribution,
        submitGunsStashAction: mockSubmitGunsStashAction,
        cancelGunsStash: mockCancelGunsStash,
        isGunsStashDismissed: false,
      } as unknown as GameContextValue);

      const { container } = render(<CultGunsStashPage />);
      expect(container.innerHTML).toBe("");
    });
  });

  describe("WAITING_FOR_PLAYERS Phase", () => {
    beforeEach(() => {
      vi.mocked(useGame).mockReturnValue({
        lobby: {
          players: mockPlayers,
          gunsStashStatus: {
            initiatorId: "p1",
            state: "WAITING_FOR_PLAYERS",
            readyPlayers: ["p1"],
          },
        },
        myPlayerId: "p2",
        myRole: "SAILOR",
        confirmGunsStashReady: mockConfirmGunsStashReady,
        submitGunsStashDistribution: mockSubmitGunsStashDistribution,
        submitGunsStashAction: mockSubmitGunsStashAction,
        cancelGunsStash: mockCancelGunsStash,
        isGunsStashDismissed: false,
      } as unknown as GameContextValue);
    });

    it("renders the Waiting For Players view", () => {
      render(<CultGunsStashPage />);
      expect(screen.getByText("Cult's Gun Stash")).toBeDefined();
      expect(screen.getByText("I'm Ready")).toBeDefined();
    });

    it("displays players with ready status", () => {
      render(<CultGunsStashPage />);
      expect(screen.getByText("Host")).toBeDefined();
      expect(screen.getByText("Ready")).toBeDefined();
      expect(screen.getAllByText("Pending...").length).toBeGreaterThan(0);
    });

    it("calls confirmGunsStashReady when I'm Ready is clicked", () => {
      render(<CultGunsStashPage />);
      fireEvent.click(screen.getByText("I'm Ready"));
      expect(mockConfirmGunsStashReady).toHaveBeenCalled();
    });

    it("calls cancelGunsStash when Cancel is clicked", () => {
      render(<CultGunsStashPage />);
      fireEvent.click(screen.getByText("Cancel"));
      expect(mockCancelGunsStash).toHaveBeenCalled();
    });

    it("shows Waiting state when player is already ready", () => {
      vi.mocked(useGame).mockReturnValue({
        lobby: {
          players: mockPlayers,
          gunsStashStatus: {
            initiatorId: "p1",
            state: "WAITING_FOR_PLAYERS",
            readyPlayers: ["p1", "p2"],
          },
        },
        myPlayerId: "p2",
        myRole: "SAILOR",
        confirmGunsStashReady: mockConfirmGunsStashReady,
        submitGunsStashDistribution: mockSubmitGunsStashDistribution,
        submitGunsStashAction: mockSubmitGunsStashAction,
        cancelGunsStash: mockCancelGunsStash,
        isGunsStashDismissed: false,
      } as unknown as GameContextValue);

      render(<CultGunsStashPage />);
      expect(screen.getByText("Waiting...")).toBeDefined();
    });
  });

  describe("DISTRIBUTION Phase - Non-Leader", () => {
    beforeEach(() => {
      vi.mocked(useGame).mockReturnValue({
        lobby: {
          players: mockPlayers,
          gunsStashStatus: {
            initiatorId: "p1",
            state: "DISTRIBUTION",
            readyPlayers: ["p1", "p2", "p3"],
            startTime: Date.now(),
            playerQuestions: { p2: 0, p3: 1 },
            playerAnswers: {},
          },
        },
        myPlayerId: "p2",
        myRole: "SAILOR",
        confirmGunsStashReady: mockConfirmGunsStashReady,
        submitGunsStashDistribution: mockSubmitGunsStashDistribution,
        submitGunsStashAction: mockSubmitGunsStashAction,
        cancelGunsStash: mockCancelGunsStash,
        isGunsStashDismissed: false,
      } as unknown as GameContextValue);
    });

    it("renders the Quiz view for non-leader", () => {
      render(<CultGunsStashPage />);
      expect(screen.getByText("Prove Your Worth")).toBeDefined();
    });

    it("displays timer", () => {
      render(<CultGunsStashPage />);
      // Timer should be visible
      expect(screen.getByText(/\d+:\d{2}/)).toBeDefined();
    });

    it("calls submitGunsStashAction when quiz option is clicked", () => {
      render(<CultGunsStashPage />);
      // Click first answer option
      const optionButtons = screen.getAllByRole("button");
      const answerButton = optionButtons.find((btn) =>
        btn.textContent?.startsWith("A."),
      );
      if (answerButton) {
        fireEvent.click(answerButton);
        expect(mockSubmitGunsStashAction).toHaveBeenCalled();
      }
    });
  });

  describe("DISTRIBUTION Phase - Cult Leader", () => {
    beforeEach(() => {
      vi.mocked(useGame).mockReturnValue({
        lobby: {
          players: mockPlayers,
          gunsStashStatus: {
            initiatorId: "p1",
            state: "DISTRIBUTION",
            readyPlayers: ["p1", "p2", "p3"],
            startTime: Date.now(),
            playerQuestions: { p2: 0, p3: 1 },
            playerAnswers: {},
          },
        },
        myPlayerId: "p1",
        myRole: "CULT_LEADER",
        confirmGunsStashReady: mockConfirmGunsStashReady,
        submitGunsStashDistribution: mockSubmitGunsStashDistribution,
        submitGunsStashAction: mockSubmitGunsStashAction,
        cancelGunsStash: mockCancelGunsStash,
        isGunsStashDismissed: false,
      } as unknown as GameContextValue);
    });

    it("renders the Distribution view for Cult Leader", () => {
      render(<CultGunsStashPage />);
      expect(screen.getByText("Distribute 3 guns total.")).toBeDefined();
    });

    it("displays player list for distribution", () => {
      render(<CultGunsStashPage />);
      expect(screen.getByText("Host")).toBeDefined();
      expect(screen.getByText("Player 2")).toBeDefined();
      expect(screen.getByText("Player 3")).toBeDefined();
    });

    it("displays gun counter", () => {
      render(<CultGunsStashPage />);
      expect(screen.getByText("0 / 3 Used")).toBeDefined();
    });
  });

  describe("COMPLETED Phase", () => {
    it("renders Ritual Complete for player who received guns", () => {
      vi.mocked(useGame).mockReturnValue({
        lobby: {
          players: mockPlayers,
          gunsStashStatus: {
            initiatorId: "p1",
            state: "COMPLETED",
            readyPlayers: ["p1", "p2", "p3"],
            distribution: { p2: 2, p3: 1 },
            results: { correctAnswers: ["p2"] },
          },
        },
        myPlayerId: "p2",
        myRole: "SAILOR",
        confirmGunsStashReady: mockConfirmGunsStashReady,
        submitGunsStashDistribution: mockSubmitGunsStashDistribution,
        submitGunsStashAction: mockSubmitGunsStashAction,
        cancelGunsStash: mockCancelGunsStash,
        isGunsStashDismissed: false,
      } as unknown as GameContextValue);

      render(<CultGunsStashPage />);
      expect(screen.getByText("Ritual Complete")).toBeDefined();
      expect(screen.getByText("You received 2 guns!")).toBeDefined();
    });

    it("renders Empty Hands for player who did not receive guns", () => {
      vi.mocked(useGame).mockReturnValue({
        lobby: {
          players: mockPlayers,
          gunsStashStatus: {
            initiatorId: "p1",
            state: "COMPLETED",
            readyPlayers: ["p1", "p2", "p3"],
            distribution: { p3: 3 },
            results: { correctAnswers: [] },
          },
        },
        myPlayerId: "p2",
        myRole: "SAILOR",
        confirmGunsStashReady: mockConfirmGunsStashReady,
        submitGunsStashDistribution: mockSubmitGunsStashDistribution,
        submitGunsStashAction: mockSubmitGunsStashAction,
        cancelGunsStash: mockCancelGunsStash,
        isGunsStashDismissed: false,
      } as unknown as GameContextValue);

      render(<CultGunsStashPage />);
      expect(screen.getByText("Ritual Complete")).toBeDefined();
      expect(screen.getByText("Empty Hands")).toBeDefined();
    });

    it("shows Correct Answer for non-leader with correct quiz answer", () => {
      vi.mocked(useGame).mockReturnValue({
        lobby: {
          players: mockPlayers,
          gunsStashStatus: {
            initiatorId: "p1",
            state: "COMPLETED",
            readyPlayers: ["p1", "p2", "p3"],
            distribution: { p2: 1, p3: 2 },
            results: { correctAnswers: ["p2"] },
          },
        },
        myPlayerId: "p2",
        myRole: "SAILOR",
        confirmGunsStashReady: mockConfirmGunsStashReady,
        submitGunsStashDistribution: mockSubmitGunsStashDistribution,
        submitGunsStashAction: mockSubmitGunsStashAction,
        cancelGunsStash: mockCancelGunsStash,
        isGunsStashDismissed: false,
      } as unknown as GameContextValue);

      render(<CultGunsStashPage />);
      expect(screen.getByText("Correct Answer!")).toBeDefined();
    });

    it("shows Wrong Answer for non-leader with incorrect quiz answer", () => {
      vi.mocked(useGame).mockReturnValue({
        lobby: {
          players: mockPlayers,
          gunsStashStatus: {
            initiatorId: "p1",
            state: "COMPLETED",
            readyPlayers: ["p1", "p2", "p3"],
            distribution: { p2: 1, p3: 2 },
            results: { correctAnswers: [] },
          },
        },
        myPlayerId: "p2",
        myRole: "SAILOR",
        confirmGunsStashReady: mockConfirmGunsStashReady,
        submitGunsStashDistribution: mockSubmitGunsStashDistribution,
        submitGunsStashAction: mockSubmitGunsStashAction,
        cancelGunsStash: mockCancelGunsStash,
        isGunsStashDismissed: false,
      } as unknown as GameContextValue);

      render(<CultGunsStashPage />);
      expect(screen.getByText("Wrong Answer")).toBeDefined();
    });

    it("renders Return to Ship link", () => {
      vi.mocked(useGame).mockReturnValue({
        lobby: {
          players: mockPlayers,
          gunsStashStatus: {
            initiatorId: "p1",
            state: "COMPLETED",
            readyPlayers: ["p1", "p2", "p3"],
            distribution: { p2: 1, p3: 2 },
            results: { correctAnswers: [] },
          },
        },
        myPlayerId: "p2",
        myRole: "SAILOR",
        confirmGunsStashReady: mockConfirmGunsStashReady,
        submitGunsStashDistribution: mockSubmitGunsStashDistribution,
        submitGunsStashAction: mockSubmitGunsStashAction,
        cancelGunsStash: mockCancelGunsStash,
        isGunsStashDismissed: false,
      } as unknown as GameContextValue);

      render(<CultGunsStashPage />);
      const link = screen.getByText("Return to Ship").closest("a");
      expect(link?.getAttribute("href")).toBe("/game");
    });
  });

  describe("CANCELLED State", () => {
    it("redirects to /game when cancelled", () => {
      vi.mocked(useGame).mockReturnValue({
        lobby: {
          players: mockPlayers,
          gunsStashStatus: {
            initiatorId: "p1",
            state: "CANCELLED",
            readyPlayers: ["p1"],
          },
        },
        myPlayerId: "p2",
        myRole: "SAILOR",
        confirmGunsStashReady: mockConfirmGunsStashReady,
        submitGunsStashDistribution: mockSubmitGunsStashDistribution,
        submitGunsStashAction: mockSubmitGunsStashAction,
        cancelGunsStash: mockCancelGunsStash,
        isGunsStashDismissed: false,
      } as unknown as GameContextValue);

      render(<CultGunsStashPage />);
      expect(mockPush).toHaveBeenCalledWith("/game");
    });
  });
});
