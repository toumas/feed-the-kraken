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
});
