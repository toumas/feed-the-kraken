"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FloggingView } from "./FloggingView";

// Default mock values
let mockLobby: object | null = {
  players: [
    { id: "player1", name: "Player 1", photoUrl: null, isEliminated: false },
    { id: "player2", name: "Player 2", photoUrl: null, isEliminated: false },
  ],
};
let mockError: string | null = "Test error message";
let mockFloggingReveal: object | null = null;
const mockSetError = vi.fn();
const mockHandleFloggingRequest = vi.fn();

// Mock the useGame hook
vi.mock("../../context/GameContext", () => ({
  useGame: () => ({
    lobby: mockLobby,
    myPlayerId: "player1",
    handleFloggingRequest: mockHandleFloggingRequest,
    error: mockError,
    setError: mockSetError,
    floggingReveal: mockFloggingReveal,
  }),
}));

// Mock the translation hook
vi.mock("../../i18n/client", () => ({
  useT: () => ({
    t: (key: string) => key,
  }),
}));

describe("FloggingView", () => {
  beforeEach(() => {
    mockSetError.mockClear();
    mockHandleFloggingRequest.mockClear();
    mockLobby = {
      players: [
        {
          id: "player1",
          name: "Player 1",
          photoUrl: null,
          isEliminated: false,
        },
        {
          id: "player2",
          name: "Player 2",
          photoUrl: null,
          isEliminated: false,
        },
      ],
    };
    mockError = "Test error message";
    mockFloggingReveal = null;
  });

  it("renders error message and can dismiss it", () => {
    const onDismiss = vi.fn();
    render(<FloggingView onDismiss={onDismiss} />);

    // Check that error is displayed
    expect(screen.getByText("Test error message")).toBeInTheDocument();

    // Click the dismiss button (X icon)
    const dismissButton = screen.getByRole("button", { name: "" });
    fireEvent.click(dismissButton);

    // Check that setError was called with null
    expect(mockSetError).toHaveBeenCalledWith(null);
  });

  it("renders the flogging title", () => {
    const onDismiss = vi.fn();
    render(<FloggingView onDismiss={onDismiss} />);

    expect(screen.getByText("flogging.title")).toBeInTheDocument();
  });

  it("renders loading state when lobby is null", () => {
    mockLobby = null;
    const onDismiss = vi.fn();
    render(<FloggingView onDismiss={onDismiss} />);

    expect(screen.getByText("game.loading")).toBeInTheDocument();
  });

  it("calls onDismiss when floggingReveal is set", () => {
    mockFloggingReveal = { targetPlayerId: "player2", revealedRole: "SAILOR" };
    const onDismiss = vi.fn();
    render(<FloggingView onDismiss={onDismiss} />);

    expect(onDismiss).toHaveBeenCalled();
  });

  it("renders without error when no error is present", () => {
    mockError = null;
    const onDismiss = vi.fn();
    render(<FloggingView onDismiss={onDismiss} />);

    expect(screen.queryByText("Test error message")).not.toBeInTheDocument();
    expect(screen.getByText("flogging.title")).toBeInTheDocument();
  });
});
