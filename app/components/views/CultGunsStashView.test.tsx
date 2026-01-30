"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CultGunsStashView } from "./CultGunsStashView";

// Default mock values
let mockLobby: any = null;
let mockMyRole = "SAILOR";
let mockMyPlayerId = "player1";
const mockConfirmGunsStashReady = vi.fn();
const mockSubmitGunsStashDistribution = vi.fn();
const mockSubmitGunsStashAction = vi.fn();
const mockCancelGunsStash = vi.fn();

// Mock the useGame hook
vi.mock("../../context/GameContext", () => ({
  useGame: () => ({
    lobby: mockLobby,
    myRole: mockMyRole,
    myPlayerId: mockMyPlayerId,
    confirmGunsStashReady: mockConfirmGunsStashReady,
    submitGunsStashDistribution: mockSubmitGunsStashDistribution,
    submitGunsStashAction: mockSubmitGunsStashAction,
    cancelGunsStash: mockCancelGunsStash,
  }),
}));

// Mock the translation hook
vi.mock("../../i18n/client", () => ({
  useT: () => ({
    t: (key: string, params?: any) => {
      if (params?.count !== undefined) return `${key}:${params.count}`;
      return key;
    },
  }),
}));

describe("CultGunsStashView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLobby = null;
    mockMyRole = "SAILOR";
    mockMyPlayerId = "player1";
  });

  it("renders null when gunsStashStatus is missing", () => {
    mockLobby = { players: [] };
    const { container } = render(<CultGunsStashView onDismiss={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  describe("COMPLETED phase", () => {
    const players = [
      {
        id: "player1",
        name: "Alice",
        photoUrl: null,
        isEliminated: false,
        isOnline: true,
      },
      {
        id: "player2",
        name: "Bob",
        photoUrl: null,
        isEliminated: false,
        isOnline: true,
      },
    ];

    it("renders public distribution summary with recipients", () => {
      mockLobby = {
        players,
        gunsStashStatus: {
          state: "COMPLETED",
          distribution: { player2: 2 },
          results: { correctAnswers: ["player1"] },
        },
      };

      render(<CultGunsStashView onDismiss={() => {}} />);

      expect(screen.getByText("conversion.ritualComplete")).toBeInTheDocument();
      expect(
        screen.getByText("cultGunsStash.gunsDistribution"),
      ).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(
        screen.getByText("cultGunsStash.playerReceivedGuns:2"),
      ).toBeInTheDocument();
    });

    it("renders empty state message when no guns were distributed", () => {
      mockLobby = {
        players,
        gunsStashStatus: {
          state: "COMPLETED",
          distribution: {},
          results: { correctAnswers: [] },
        },
      };

      render(<CultGunsStashView onDismiss={() => {}} />);

      expect(
        screen.getByText("cultGunsStash.nobodyReceivedGuns"),
      ).toBeInTheDocument();
    });

    it("shows success feedback when player answered correctly", () => {
      mockMyRole = "SAILOR";
      mockLobby = {
        players,
        gunsStashStatus: {
          state: "COMPLETED",
          results: { correctAnswers: ["player1"] },
        },
      };

      render(<CultGunsStashView onDismiss={() => {}} />);

      expect(screen.getByText("conversion.correctAnswer")).toBeInTheDocument();
    });

    it("shows error feedback when player answered incorrectly", () => {
      mockMyRole = "SAILOR";
      mockLobby = {
        players,
        gunsStashStatus: {
          state: "COMPLETED",
          results: { correctAnswers: ["player2"] },
        },
      };

      render(<CultGunsStashView onDismiss={() => {}} />);

      expect(screen.getByText("conversion.wrongAnswer")).toBeInTheDocument();
    });

    it("does not show quiz feedback to Cult Leader", () => {
      mockMyRole = "CULT_LEADER";
      mockLobby = {
        players,
        gunsStashStatus: {
          state: "COMPLETED",
          results: { correctAnswers: [] },
        },
      };

      render(<CultGunsStashView onDismiss={() => {}} />);

      expect(
        screen.queryByText("conversion.correctAnswer"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("conversion.wrongAnswer"),
      ).not.toBeInTheDocument();
    });

    it("calls onDismiss when 'Return to Ship' button is clicked", () => {
      mockLobby = {
        players,
        gunsStashStatus: { state: "COMPLETED", distribution: {} },
      };
      const onDismiss = vi.fn();
      render(<CultGunsStashView onDismiss={onDismiss} />);

      fireEvent.click(screen.getByText("conversion.returnToShip"));
      expect(onDismiss).toHaveBeenCalled();
    });
  });
});
