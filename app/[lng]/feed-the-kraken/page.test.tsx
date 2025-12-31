import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type GameContextValue, useGame } from "../../context/GameContext";
import FeedTheKrakenPage from "./page";

// Mock hooks
vi.mock("../../context/GameContext");
vi.mock("next/navigation");

describe("FeedTheKrakenPage", () => {
  const mockPush = vi.fn();
  const mockHandleFeedTheKrakenRequest = vi.fn();
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
          },
          {
            id: "p3",
            name: "Cult Leader",
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
        status: "PLAYING",
      },
      myPlayerId: "p1",
      handleFeedTheKrakenRequest: mockHandleFeedTheKrakenRequest,
      isFeedTheKrakenPending: false,
      feedTheKrakenResult: null,
      error: null,
      setError: mockSetError,
      ...overrides,
    } as unknown as GameContextValue);
  };

  it("renders loading state when lobby is null", () => {
    setupMock({ lobby: null });
    render(<FeedTheKrakenPage />);
    expect(screen.getByText("Loading game...")).toBeDefined();
  });

  it("renders player list excluding self", () => {
    setupMock();
    render(<FeedTheKrakenPage />);

    // Should show other players
    expect(screen.getByText("Sailor")).toBeDefined();
    expect(screen.getByText("Cult Leader")).toBeDefined();

    // Should NOT show self (Captain) in the selectable list
    expect(screen.queryByText("Captain")).toBeNull();
  });

  it("enables Feed to Kraken button when player is selected", () => {
    setupMock();
    render(<FeedTheKrakenPage />);

    const submitButton = screen.getByRole("button", {
      name: "Feed to Kraken",
    }) as HTMLButtonElement;
    // Button is technically enabled to allow clicking for error feedback
    expect(submitButton.disabled).toBe(false);

    // Click without selection should show error
    fireEvent.click(submitButton);
    expect(screen.getByText("Please select a player first.")).toBeDefined();

    // Select "Sailor"
    fireEvent.click(screen.getByText("Sailor"));

    // Error should be cleared
    expect(screen.queryByText("Please select a player first.")).toBeNull();
    expect(submitButton.disabled).toBe(false);
  });

  it("calls handleFeedTheKrakenRequest when submitted", () => {
    setupMock();
    render(<FeedTheKrakenPage />);

    // Select "Sailor"
    fireEvent.click(screen.getByText("Sailor"));

    // Click submit
    fireEvent.click(screen.getByRole("button", { name: "Feed to Kraken" }));

    expect(mockHandleFeedTheKrakenRequest).toHaveBeenCalledWith("p2");
  });

  it("shows pending overlay when request is pending", () => {
    setupMock({ isFeedTheKrakenPending: true });
    render(<FeedTheKrakenPage />);

    expect(screen.getByText("Waiting for Confirmation")).toBeDefined();
    expect(
      screen.getByText(
        "has chosen to feed you to the Kraken. Do you accept your fate?",
      ),
    ).toBeDefined();
  });

  it("allows selecting unconvertible players", () => {
    setupMock({
      lobby: {
        code: "TESTCODE",
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
            name: "Unconvertible Player",
            photoUrl: null,
            isHost: false,
            isReady: true,
            isOnline: true,
            isEliminated: false,
            isUnconvertible: true,
            notRole: null,
            joinedAt: 2000,
            hasTongue: true,
          },
        ],
        status: "PLAYING",
      },
      myPlayerId: "p1",
    });

    render(<FeedTheKrakenPage />);

    // Select "Unconvertible Player"
    const radio = screen.getByDisplayValue("p2") as HTMLInputElement;
    expect(radio.disabled).toBe(false);

    fireEvent.click(screen.getByText("Unconvertible Player"));

    // Click submit
    fireEvent.click(screen.getByRole("button", { name: "Feed to Kraken" }));

    expect(mockHandleFeedTheKrakenRequest).toHaveBeenCalledWith("p2");
  });
});
