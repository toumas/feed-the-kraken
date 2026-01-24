"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CultCabinSearchView } from "./CultCabinSearchView";

// Default mock values
let mockLobby: object | null = null;
let mockError: string | null = null;
const mockSetError = vi.fn();
const mockClaimCabinSearchRole = vi.fn();
const mockCancelCabinSearch = vi.fn();
const mockSubmitCabinSearchAction = vi.fn();

// Mock the useGame hook
vi.mock("../../context/GameContext", () => ({
  useGame: () => ({
    lobby: mockLobby,
    myPlayerId: "player1",
    myRole: "SAILOR",
    claimCabinSearchRole: mockClaimCabinSearchRole,
    cancelCabinSearch: mockCancelCabinSearch,
    submitCabinSearchAction: mockSubmitCabinSearchAction,
    error: mockError,
    setError: mockSetError,
  }),
}));

// Mock the translation hook
vi.mock("../../i18n/client", () => ({
  useT: () => ({
    t: (key: string) => key,
  }),
}));

describe("CultCabinSearchView", () => {
  beforeEach(() => {
    mockSetError.mockClear();
    mockClaimCabinSearchRole.mockClear();
    mockCancelCabinSearch.mockClear();
    mockSubmitCabinSearchAction.mockClear();
    mockLobby = null;
    mockError = null;
  });

  it("renders loading state when lobby is null", () => {
    mockLobby = null;
    const onDismiss = vi.fn();
    render(<CultCabinSearchView onDismiss={onDismiss} />);

    expect(screen.getByText("game.loading")).toBeInTheDocument();
  });

  it("renders loading state when cabinSearchStatus is null", () => {
    mockLobby = {
      players: [
        {
          id: "player1",
          name: "Player 1",
          photoUrl: null,
          isEliminated: false,
          isOnline: true,
        },
      ],
      cabinSearchStatus: null,
    };

    const onDismiss = vi.fn();
    render(<CultCabinSearchView onDismiss={onDismiss} />);

    expect(screen.getByText("game.loading")).toBeInTheDocument();
  });

  it("renders role selection in SETUP state", () => {
    mockLobby = {
      players: [
        {
          id: "player1",
          name: "Player 1",
          photoUrl: null,
          isEliminated: false,
          isOnline: true,
        },
      ],
      cabinSearchStatus: { state: "SETUP", claims: {} },
    };

    const onDismiss = vi.fn();
    render(<CultCabinSearchView onDismiss={onDismiss} />);

    expect(screen.getByText("roleSelection.title")).toBeInTheDocument();
  });

  it("clears error and calls cancelCabinSearch when cancel button is clicked", () => {
    mockLobby = {
      players: [
        {
          id: "player1",
          name: "Player 1",
          photoUrl: null,
          isEliminated: false,
          isOnline: true,
        },
      ],
      cabinSearchStatus: { state: "SETUP", claims: {} },
    };

    const onDismiss = vi.fn();
    render(<CultCabinSearchView onDismiss={onDismiss} />);

    const cancelButton = screen.getByText("actions.cancel");
    fireEvent.click(cancelButton);

    expect(mockSetError).toHaveBeenCalledWith(null);
    expect(mockCancelCabinSearch).toHaveBeenCalled();
  });
});
