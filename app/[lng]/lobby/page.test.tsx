import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock i18n
vi.mock("../../i18n/client", () => ({
  useT: () => ({
    t: (key: string) => key,
  }),
}));

// Mock child components
vi.mock("../../components/LobbyView", () => ({
  LobbyView: ({ onLeave }: { onLeave: () => void }) => (
    <div data-testid="lobby-view">
      <button onClick={onLeave} type="button" data-testid="leave-button">
        Leave
      </button>
    </div>
  ),
}));

vi.mock("../../components/InlineError", () => ({
  InlineError: ({ message }: { message: string }) => (
    <div data-testid="inline-error">{message}</div>
  ),
}));

// Mock GameContext values
let mockLobby: { status: string; roleSelectionStatus?: unknown } | null = null;
const mockLeaveLobby = vi.fn();

vi.mock("../../context/GameContext", () => ({
  useGame: () => ({
    lobby: mockLobby,
    myPlayerId: "player1",
    updateMyProfile: vi.fn(),
    leaveLobby: mockLeaveLobby,
    startGame: vi.fn(),
    addBotPlayer: vi.fn(),
    kickPlayer: vi.fn(),
    setRoleDistributionMode: vi.fn(),
    connectionStatus: "connected",
  }),
}));

import LobbyPage from "./page";

describe("LobbyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLobby = { status: "WAITING" };
  });

  afterEach(() => {
    cleanup();
  });

  describe("Leave Lobby", () => {
    it("renders null after clicking leave to prevent flash", () => {
      const { container } = render(<LobbyPage />);

      // Initially shows lobby view
      expect(screen.getByTestId("lobby-view")).toBeDefined();

      // Click leave
      fireEvent.click(screen.getByTestId("leave-button"));

      // Should render nothing after leaving
      expect(container.innerHTML).toBe("");
      expect(mockLeaveLobby).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  describe("Game Started Redirect", () => {
    it("redirects to /game when lobby status is PLAYING", () => {
      mockLobby = { status: "PLAYING" };
      render(<LobbyPage />);

      expect(mockPush).toHaveBeenCalledWith("/game");
    });
  });
});
