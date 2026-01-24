import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation with all required exports
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/en",
  useParams: () => ({ lng: "en" }),
}));

// Mock i18n - matches the import path from page.tsx
vi.mock("../i18n/client", () => ({
  useT: () => ({
    t: (key: string) => key,
  }),
}));

// Mock child components that have their own dependencies
vi.mock("../components/HomeView", () => ({
  HomeView: ({
    onCreate,
    onJoin,
  }: {
    onCreate: () => void;
    onJoin: () => void;
  }) => (
    <div data-testid="home-view">
      <button onClick={onCreate} type="button">
        Create
      </button>
      <button onClick={onJoin} type="button">
        Join
      </button>
    </div>
  ),
}));

vi.mock("../components/LanguageSelector", () => ({
  LanguageSelector: () => <div data-testid="language-selector">EN</div>,
}));

vi.mock("../components/InlineError", () => ({
  InlineError: ({ message }: { message: string }) => (
    <div data-testid="inline-error">{message}</div>
  ),
}));

// Mock GameContext values - make it mutable for per-test configuration
let mockLobby: { status: string } | null = null;
let mockError: string | null = null;
const mockSetError = vi.fn();

// Mock path matches the import in page.tsx: "../context/GameContext"
vi.mock("../context/GameContext", () => ({
  useGame: () => ({
    lobby: mockLobby,
    error: mockError,
    setError: mockSetError,
    myPlayerId: "player1",
    myName: "Test Player",
    myPhoto: null,
    connectionStatus: "connected",
  }),
}));

// Import after mocks are set up
import KrakenCompanion from "./page";

describe("KrakenCompanion (Home Page)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLobby = null;
    mockError = null;
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  describe("Lobby Redirect Logic", () => {
    it("does not redirect when lobby exists but localStorage has no lobby code", async () => {
      // Simulate the state after clicking "Abandon Ship" - lobby state still has data
      // but localStorage has been cleared
      mockLobby = { status: "WAITING" };
      localStorage.removeItem("kraken_lobby_code");

      render(<KrakenCompanion />);

      // Wait a tick for useEffect to run
      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    it("redirects to /lobby when lobby exists AND localStorage has lobby code", async () => {
      mockLobby = { status: "WAITING" };
      localStorage.setItem("kraken_lobby_code", "ABC123");

      render(<KrakenCompanion />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/en/lobby", undefined);
      });
    });

    it("redirects to /game when lobby status is PLAYING and localStorage has lobby code", async () => {
      mockLobby = { status: "PLAYING" };
      localStorage.setItem("kraken_lobby_code", "ABC123");

      render(<KrakenCompanion />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/en/game", undefined);
      });
    });

    it("does not redirect when lobby is null", async () => {
      mockLobby = null;
      localStorage.setItem("kraken_lobby_code", "ABC123");

      render(<KrakenCompanion />);

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });
  });

  describe("Kick Message Handling", () => {
    it("shows error and clears localStorage when kick message exists", async () => {
      localStorage.setItem("kraken_kick_message", "You were kicked!");

      render(<KrakenCompanion />);

      await waitFor(() => {
        expect(mockSetError).toHaveBeenCalledWith("You were kicked!");
        expect(localStorage.getItem("kraken_kick_message")).toBeNull();
      });
    });

    it("does not set error when no kick message exists", async () => {
      render(<KrakenCompanion />);

      await waitFor(() => {
        expect(mockSetError).not.toHaveBeenCalled();
      });
    });
  });
});
