import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type GameContextValue, useGame } from "../../context/GameContext";
import OffWithTonguePage from "./page";

// Mock hooks
vi.mock("../../context/GameContext");
vi.mock("next/navigation");

describe("OffWithTonguePage", () => {
  const mockPush = vi.fn();
  const mockHandleOffWithTongueRequest = vi.fn();
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
            name: "Captain",
            photoUrl: null,
            isHost: true,
            isReady: true,
            isOnline: true,
            isEliminated: false,
            isUnconvertible: false,
            notRole: null,
            joinedAt: 1000,
            hasTongue: true,
          },
          {
            id: "p2",
            name: "Sailor",
            photoUrl: null,
            isHost: false,
            isReady: true,
            isOnline: true,
            isEliminated: false,
            isUnconvertible: false,
            notRole: null,
            joinedAt: 2000,
            hasTongue: true,
          },
          {
            id: "p3",
            name: "Silenced Sailor",
            photoUrl: null,
            isHost: false,
            isReady: true,
            isOnline: true,
            isEliminated: false,
            isUnconvertible: false,
            notRole: null,
            joinedAt: 3000,
            hasTongue: false,
          },
        ],
        status: "PLAYING",
      },
      myPlayerId: "p1",
      handleOffWithTongueRequest: mockHandleOffWithTongueRequest,
      isOffWithTonguePending: false,
      error: null,
      setError: mockSetError,
      ...overrides,
    } as unknown as GameContextValue);
  };

  it("renders loading state when lobby is null", () => {
    setupMock({ lobby: null });
    render(<OffWithTonguePage />);
    expect(screen.getByText("Loading...")).toBeDefined();
  });

  it("renders player list showing self excluded, silenced players shown as disabled", () => {
    setupMock();
    render(<OffWithTonguePage />);

    // Should show players with tongue
    expect(screen.getByText("Sailor")).toBeDefined();

    // Should NOT show self (Captain) in the selectable list
    expect(screen.queryByText("Captain")).toBeNull();

    // Should show silenced player with "Already silenced" label
    expect(screen.getByText("Silenced Sailor")).toBeDefined();
    expect(screen.getByText("Already silenced")).toBeDefined();
  });

  it("shows error when attempting to submit without selection", () => {
    setupMock();
    render(<OffWithTonguePage />);

    const submitButton = screen.getByRole("button", {
      name: "Silence Sailor",
    }) as HTMLButtonElement;

    // Click without selection should show error
    fireEvent.click(submitButton);
    expect(screen.getByText("Please select a player first.")).toBeDefined();
  });

  it("calls handleOffWithTongueRequest when player is selected and submitted", () => {
    setupMock();
    render(<OffWithTonguePage />);

    // Select "Sailor"
    fireEvent.click(screen.getByText("Sailor"));

    // Click submit
    fireEvent.click(screen.getByRole("button", { name: "Silence Sailor" }));

    expect(mockHandleOffWithTongueRequest).toHaveBeenCalledWith("p2");
  });

  it("shows pending overlay when request is pending", () => {
    setupMock({ isOffWithTonguePending: true });
    render(<OffWithTonguePage />);

    expect(screen.getByText("Waiting for Confirmation")).toBeDefined();
    expect(
      screen.getByText("The sailor must accept their punishment..."),
    ).toBeDefined();
  });

  it("shows error when error prop is set", () => {
    setupMock({ error: "The player refused to be silenced." });
    render(<OffWithTonguePage />);

    expect(
      screen.getByText("The player refused to be silenced."),
    ).toBeDefined();
  });

  it("navigates back when Cancel is clicked", () => {
    setupMock();
    render(<OffWithTonguePage />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockPush).toHaveBeenCalledWith("/game");
  });
});
