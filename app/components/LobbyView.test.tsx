import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LobbyState } from "../types";
import { LobbyView } from "./LobbyView";

describe("LobbyView", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const createMockLobby = (playerCount: number): LobbyState => ({
    code: "ABC123",
    players: Array.from({ length: playerCount }, (_, i) => ({
      id: `p${i + 1}`,
      name: i === 0 ? "Host" : `Player ${i + 1}`,
      isHost: i === 0,
      photoUrl: null,
      isOnline: true,
      isEliminated: false,
      isUnconvertible: false,
      isReady: false,
      notRole: null,
      joinedAt: Date.now(),
    })),
    status: "WAITING",
  });

  const defaultProps = {
    myPlayerId: "p1",
    onUpdateProfile: vi.fn(),
    onLeave: vi.fn(),
    onStart: vi.fn(),
    onAddBot: vi.fn(),
    connectionStatus: "connected" as const,
  };

  describe("Error Lifecycle", () => {
    it("does not show error initially", () => {
      render(<LobbyView lobby={createMockLobby(5)} {...defaultProps} />);
      expect(screen.queryByText(/Need at least/)).toBeNull();
    });

    it("shows error when Start clicked with < 5 players", () => {
      render(<LobbyView lobby={createMockLobby(3)} {...defaultProps} />);

      const startButton = screen.getByText("Start Voyage");
      fireEvent.click(startButton);

      expect(
        screen.getByText("Need at least 5 sailors to depart!"),
      ).toBeDefined();
    });

    it("dismisses error when X button is clicked", () => {
      render(<LobbyView lobby={createMockLobby(3)} {...defaultProps} />);

      fireEvent.click(screen.getByText("Start Voyage"));
      expect(
        screen.getByText("Need at least 5 sailors to depart!"),
      ).toBeDefined();

      // Find the dismiss button within the error message
      const errorContainer = screen
        .getByText("Need at least 5 sailors to depart!")
        .closest("div");
      const dismissButton = errorContainer?.querySelector("button");
      if (dismissButton) {
        fireEvent.click(dismissButton);
      }

      expect(
        screen.queryByText("Need at least 5 sailors to depart!"),
      ).toBeNull();
    });

    it("calls onStart when enough players", () => {
      const onStart = vi.fn();
      render(
        <LobbyView
          lobby={createMockLobby(5)}
          {...defaultProps}
          onStart={onStart}
        />,
      );

      fireEvent.click(screen.getByText("Start Voyage"));
      expect(onStart).toHaveBeenCalled();
    });
  });
});
