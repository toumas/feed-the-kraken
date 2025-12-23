import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type GameContextValue, useGame } from "../../context/GameContext";
import FloggingPage from "./page";

// Mock hooks
vi.mock("../../context/GameContext");
vi.mock("next/navigation");

describe("FloggingPage", () => {
  const mockPush = vi.fn();
  const mockHandleFloggingRequest = vi.fn();

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(useGame).mockReturnValue({
      lobby: {
        players: [
          { id: "p1", name: "Host", isHost: true },
          { id: "p2", name: "Player 2", isHost: false },
        ],
      },
      myPlayerId: "p1",
      handleFloggingRequest: mockHandleFloggingRequest,
      error: null,
      floggingReveal: null,
    } as unknown as GameContextValue);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders loading state when no lobby", () => {
    vi.mocked(useGame).mockReturnValue({
      lobby: null,
    } as unknown as GameContextValue);
    render(<FloggingPage />);
    expect(screen.getByText("Loading game...")).toBeDefined();
  });

  it("renders player selection list", () => {
    render(<FloggingPage />);
    expect(screen.getByText("Flogging")).toBeDefined();
    expect(screen.getByText("Player 2")).toBeDefined();
  });

  it("calls handleFloggingRequest when player is selected", () => {
    render(<FloggingPage />);
    fireEvent.click(screen.getByText("Player 2"));
    fireEvent.click(screen.getByText("Flog Player"));
    expect(mockHandleFloggingRequest).toHaveBeenCalledWith("p2");
  });

  it("shows pending state after selection", () => {
    render(<FloggingPage />);
    fireEvent.click(screen.getByText("Player 2"));
    fireEvent.click(screen.getByText("Flog Player"));
    expect(screen.getByText("Waiting for Confirmation")).toBeDefined();
  });

  it("redirects to game when reveal is received", () => {
    vi.mocked(useGame).mockReturnValue({
      lobby: { players: [] },
      floggingReveal: { targetPlayerId: "p2", revealedRole: "PIRATE" },
    } as unknown as GameContextValue);
    render(<FloggingPage />);
    expect(mockPush).toHaveBeenCalledWith("/game");
  });

  it("shows error when flogging is denied", () => {
    vi.mocked(useGame).mockReturnValue({
      lobby: { players: [] },
      error: "The player denied the flogging.",
      isPending: false,
    } as unknown as GameContextValue);
    render(<FloggingPage />);
    expect(screen.getByText("The player denied the flogging.")).toBeDefined();
  });

  it("alerts and redirects when flogging is already used", () => {
    const mockAlert = vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.mocked(useGame).mockReturnValue({
      lobby: { players: [], isFloggingUsed: true, status: "PLAYING" },
    } as unknown as GameContextValue);
    render(<FloggingPage />);
    expect(mockAlert).toHaveBeenCalledWith(
      "Flogging has already been used this game.",
    );
    expect(mockPush).toHaveBeenCalledWith("/game");
  });
});
