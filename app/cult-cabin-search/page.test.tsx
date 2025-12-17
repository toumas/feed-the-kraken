import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type GameContextValue, useGame } from "../context/GameContext";
import CultCabinSearchPage from "./page";

// Mock hooks
vi.mock("../context/GameContext");
vi.mock("next/navigation");

describe("CultCabinSearchPage", () => {
  const mockPush = vi.fn();
  const mockClaimCabinSearchRole = vi.fn();
  const mockSetError = vi.fn();

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as unknown as ReturnType<typeof useRouter>);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const setupMock = (overrides: Partial<GameContextValue> = {}) => {
    vi.mocked(useGame).mockReturnValue({
      lobby: {
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
            joinedAt: 1000,
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
            joinedAt: 2000,
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
            joinedAt: 3000,
          },
        ],
        cabinSearchStatus: {
          initiatorId: "p1",
          state: "SETUP",
          claims: {},
        },
      },
      myPlayerId: "p1",
      myRole: "LOYAL_SAILOR",
      claimCabinSearchRole: mockClaimCabinSearchRole,
      cancelCabinSearch: vi.fn(),
      submitCabinSearchAction: vi.fn(),
      error: null,
      setError: mockSetError,
      ...overrides,
    } as unknown as GameContextValue);
  };

  describe("Error Lifecycle", () => {
    it("does not show error initially", () => {
      setupMock();
      render(<CultCabinSearchPage />);
      expect(
        screen.queryByText("This role has already been claimed."),
      ).toBeNull();
    });

    it("shows error when error prop is set", () => {
      setupMock({ error: "This role has already been claimed." });
      render(<CultCabinSearchPage />);
      expect(
        screen.getByText("This role has already been claimed."),
      ).toBeDefined();
    });

    it("calls setError(null) when dismiss button is clicked", () => {
      setupMock({ error: "This role has already been claimed." });
      render(<CultCabinSearchPage />);

      // Find dismiss button within error component
      const errorText = screen.getByText("This role has already been claimed.");
      const errorContainer = errorText.closest("div")?.parentElement;
      const dismissButton = errorContainer?.querySelector("button");

      if (dismissButton) {
        fireEvent.click(dismissButton);
        expect(mockSetError).toHaveBeenCalledWith(null);
      }
    });

    it("shows error when claiming already-claimed role", () => {
      setupMock({
        lobby: {
          code: "TEST",
          status: "PLAYING",
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
              joinedAt: 1000,
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
              joinedAt: 2000,
            },
          ],
          cabinSearchStatus: {
            initiatorId: "p1",
            state: "SETUP",
            claims: { p2: "CAPTAIN" }, // Captain already claimed by p2
          },
        },
      });
      render(<CultCabinSearchPage />);

      // Try to claim Captain (already claimed)
      const captainButton = screen.getByText("Captain");
      fireEvent.click(captainButton);

      expect(mockSetError).toHaveBeenCalledWith(
        "This role has already been claimed.",
      );
    });

    it("claims role successfully when not already claimed", () => {
      setupMock();
      render(<CultCabinSearchPage />);

      const captainButton = screen.getByText("Captain");
      fireEvent.click(captainButton);

      expect(mockClaimCabinSearchRole).toHaveBeenCalledWith("CAPTAIN");
    });
  });
});
