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
    onDenialOfCommand: vi.fn(),
  };

  it("renders role information", () => {
    render(<GameView {...defaultProps} />);
    expect(screen.getByText("Loyal Sailor")).toBeDefined();
    expect(
      screen.getByText(
        "Steer the ship to safety! Trust no one but your fellow sailors.",
      ),
    ).toBeDefined();
  });

  it("renders Denial of Command button", () => {
    render(<GameView {...defaultProps} />);
    expect(screen.getByText("Denial of Command")).toBeDefined();
  });

  it("calls onDenialOfCommand when confirmed", () => {
    const onDenialOfCommand = vi.fn();
    // Mock confirm to return true
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <GameView {...defaultProps} onDenialOfCommand={onDenialOfCommand} />,
    );

    fireEvent.click(screen.getByText("Denial of Command"));

    expect(window.confirm).toHaveBeenCalled();
    expect(onDenialOfCommand).toHaveBeenCalled();
  });

  it("does not call onDenialOfCommand when cancelled", () => {
    const onDenialOfCommand = vi.fn();
    // Mock confirm to return false
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(
      <GameView {...defaultProps} onDenialOfCommand={onDenialOfCommand} />,
    );

    fireEvent.click(screen.getByText("Denial of Command"));

    expect(window.confirm).toHaveBeenCalled();
    expect(onDenialOfCommand).not.toHaveBeenCalled();
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
        "You have chosen Denial of Command. You are eliminated from the game.",
      ),
    ).toBeDefined();
    expect(screen.queryByText("Denial of Command")).toBeNull();
  });

  it("calls onLeave when End Session is confirmed", () => {
    const onLeave = vi.fn();
    // Mock confirm to return true
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<GameView {...defaultProps} onLeave={onLeave} />);

    fireEvent.click(screen.getByText("End Session"));

    expect(window.confirm).toHaveBeenCalledWith(
      "Are you sure you want to end the session?",
    );
    expect(onLeave).toHaveBeenCalled();
  });

  it("does not call onLeave when End Session is cancelled", () => {
    const onLeave = vi.fn();
    // Mock confirm to return false
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<GameView {...defaultProps} onLeave={onLeave} />);

    fireEvent.click(screen.getByText("End Session"));

    expect(window.confirm).toHaveBeenCalledWith(
      "Are you sure you want to end the session?",
    );
    expect(onLeave).not.toHaveBeenCalled();
  });

  it("shows other pirates when player is a pirate", () => {
    const pirateLobby: LobbyState = {
      ...mockLobby,
      players: [
        { ...mockLobby.players[0], id: "p1", name: "Me (Pirate)" },
        {
          ...mockLobby.players[0],
          id: "p2",
          name: "Teammate Pirate",
          photoUrl: "http://example.com/p2.jpg",
        },
        { ...mockLobby.players[0], id: "p3", name: "Sailor" },
      ],
      assignments: {
        p1: "PIRATE",
        p2: "PIRATE",
        p3: "SAILOR",
      },
    };

    render(
      <GameView
        {...defaultProps}
        lobby={pirateLobby}
        myRole="PIRATE"
        myPlayerId="p1"
      />,
    );

    // Should see the section header
    expect(screen.getByText("Pirate Crew")).toBeDefined();
    // Should see the teammate
    expect(screen.getByText("Teammate Pirate")).toBeDefined();
    // "Teammate Pirate" appears once (in Pirate Crew section only)
    expect(screen.getAllByText("Teammate Pirate")).toHaveLength(1);
  });

  it("does not show other pirates when player is not a pirate", () => {
    const pirateLobby: LobbyState = {
      ...mockLobby,
      players: [
        { ...mockLobby.players[0], id: "p1", name: "Me (Sailor)" },
        { ...mockLobby.players[0], id: "p2", name: "Enemy Pirate" },
      ],
      assignments: {
        p1: "SAILOR",
        p2: "PIRATE",
      },
    };

    render(
      <GameView
        {...defaultProps}
        lobby={pirateLobby}
        myRole="SAILOR"
        myPlayerId="p1"
      />,
    );

    // Should NOT see the section header
    expect(screen.queryByText("Pirate Crew")).toBeNull();
    // "Enemy Pirate" should NOT appear (not in Crew Status, not in Pirate Crew)
    expect(screen.queryByText("Enemy Pirate")).toBeNull();
  });
});
