import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LobbyState } from "../types";
import { LobbyView } from "./LobbyView";

describe("LobbyView", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // Mock clipboard
  const mockClipboard = {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  };
  (global.navigator as any).clipboard = mockClipboard;

  const createMockLobby = (playerCount: number): LobbyState => ({
    code: "ABC123",
    players: Array.from({ length: playerCount }, (_, i) => ({
      id: `p${i + 1}`,
      name: i === 0 ? "Host" : `Player ${i + 1}`,
      isHost: i === 0,
      photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=p" + (i + 1),
      isOnline: true,
      isEliminated: false,
      isUnconvertible: false,
      isReady: false,
      notRole: null,
      joinedAt: Date.now(),
      hasTongue: true,
    })),
    status: "WAITING",
  });

  const defaultProps = {
    myPlayerId: "p1",
    onUpdateProfile: vi.fn(),
    onLeave: vi.fn(),
    onStart: vi.fn(),
    onAddBot: vi.fn(),
    onKickPlayer: vi.fn(),
    onSetRoleDistributionMode: vi.fn(),
    onOpenFeedback: vi.fn(),
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

  describe("QR Code", () => {
    it("shows QR code button", () => {
      render(<LobbyView lobby={createMockLobby(5)} {...defaultProps} />);
      expect(screen.getByTitle("Show QR Code")).toBeDefined();
    });

    it("opens QR code modal when button clicked", () => {
      render(<LobbyView lobby={createMockLobby(5)} {...defaultProps} />);

      fireEvent.click(screen.getByTitle("Show QR Code"));

      expect(screen.getByText("Scan to Join")).toBeDefined();
      // The code is shown in the lobby header AND in the modal, so we expect multiple
      expect(screen.getAllByText("ABC123").length).toBeGreaterThan(1);
    });

    it("closes QR code modal when X clicked", () => {
      render(<LobbyView lobby={createMockLobby(5)} {...defaultProps} />);

      fireEvent.click(screen.getByTitle("Show QR Code"));
      expect(screen.getByText("Scan to Join")).toBeDefined();

      // Simpler: The modal is the only place "Scan to Join" appears.
      const modal = screen
        .getByText("Scan to Join")
        .closest("div")?.parentElement;
      const closeButton = modal?.querySelector("button");

      if (closeButton) {
        fireEvent.click(closeButton);
      }

      expect(screen.queryByText("Scan to Join")).toBeNull();
    });
  });

  describe("Interactions", () => {
    it("copies the lobby code", () => {
      render(<LobbyView lobby={createMockLobby(5)} {...defaultProps} />);
      const copyButton = screen.getByTitle("Copy Code");
      fireEvent.click(copyButton);
      expect(mockClipboard.writeText).toHaveBeenCalledWith("ABC123");
    });

    it("opens profile editor and updates profile", () => {
      const onUpdateProfile = vi.fn();
      render(
        <LobbyView
          lobby={createMockLobby(5)}
          {...defaultProps}
          onUpdateProfile={onUpdateProfile}
        />,
      );

      fireEvent.click(screen.getByText("Edit Identity"));

      const nameInput = screen.getByLabelText("Display Name");
      fireEvent.change(nameInput, { target: { value: "New Name" } });

      fireEvent.click(screen.getByText("Save Profile"));

      expect(onUpdateProfile).toHaveBeenCalledWith(
        "New Name",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=p1",
      );
    });

    it("allows host to add a bot in dev mode", () => {
      const onAddBot = vi.fn();
      // Use vi.stubEnv to mock development mode
      vi.stubEnv("NODE_ENV", "development");

      render(
        <LobbyView
          lobby={createMockLobby(5)}
          {...defaultProps}
          onAddBot={onAddBot}
        />,
      );

      fireEvent.click(screen.getByText("Debug Bot"));
      expect(onAddBot).toHaveBeenCalled();

      vi.unstubAllEnvs();
    });

    it("allows host to kick a player", () => {
      const onKickPlayer = vi.fn();
      render(
        <LobbyView
          lobby={createMockLobby(5)}
          {...defaultProps}
          onKickPlayer={onKickPlayer}
        />,
      );

      // Kick Player 2 (Host is p1)
      const kickButtons = screen.getAllByTitle("Remove player");
      fireEvent.click(kickButtons[0]); // p2 is first non-host in list
      expect(onKickPlayer).toHaveBeenCalledWith("p2");
    });

    it("allows host to set role distribution mode", () => {
      const onSetRoleDistributionMode = vi.fn();
      render(
        <LobbyView
          lobby={createMockLobby(5)}
          {...defaultProps}
          onSetRoleDistributionMode={onSetRoleDistributionMode}
        />,
      );

      fireEvent.click(screen.getByText("Manual"));
      expect(onSetRoleDistributionMode).toHaveBeenCalledWith("manual");
    });

    it("shows offline status for players", () => {
      const lobby = createMockLobby(2);
      lobby.players[1].isOnline = false;

      render(<LobbyView lobby={lobby} {...defaultProps} />);

      expect(screen.getAllByTitle("Offline").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Offline").length).toBeGreaterThan(0);
    });
  });
});
