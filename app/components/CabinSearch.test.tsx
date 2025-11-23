import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Player } from "../types";
import { CabinSearch } from "./CabinSearch";

const mockPlayers: Player[] = [
  {
    id: "p1",
    name: "Player 1",
    photoUrl: null,
    isHost: false,
    isReady: true,
    isOnline: true,
    isEliminated: false,
    isUnconvertible: false,
    joinedAt: 1000,
  },
  {
    id: "p2",
    name: "Player 2",
    photoUrl: null,
    isHost: false,
    isReady: true,
    isOnline: true,
    isEliminated: false,
    isUnconvertible: true,
    joinedAt: 1000,
  },
];

describe("CabinSearch", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders correctly", () => {
    render(
      <CabinSearch
        players={mockPlayers}
        myPlayerId="me"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    // Use getAllByText just in case, but expect single for title
    expect(screen.getAllByText("Select Cabin to Search")[0]).toBeDefined();
    expect(screen.getAllByText("Player 1")[0]).toBeDefined();
  });

  it("allows selecting a convertible player", () => {
    const onConfirm = vi.fn();
    render(
      <CabinSearch
        players={mockPlayers}
        myPlayerId="me"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    const player1Button = screen.getByText("Player 1").closest("button");
    expect(player1Button).not.toBeNull();
    fireEvent.click(player1Button as HTMLElement);

    const confirmButton = screen.getByText(
      "Confirm Search",
    ) as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(false);

    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledWith("p1");
  });

  it("does not allow selecting an unconvertible player", () => {
    const onConfirm = vi.fn();
    render(
      <CabinSearch
        players={mockPlayers}
        myPlayerId="me"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    const player2Button = screen
      .getByText("Player 2")
      .closest("button") as HTMLButtonElement;
    expect(player2Button).not.toBeNull();
    expect(player2Button.disabled).toBe(true);

    fireEvent.click(player2Button);

    const confirmButton = screen.getByText(
      "Confirm Search",
    ) as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(true);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(
      <CabinSearch
        players={mockPlayers}
        myPlayerId="me"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );

    const closeButtons = screen.getAllByTestId("close-button");
    // If multiple found, just click the first one, but ideally should be one
    fireEvent.click(closeButtons[0]);
    expect(onCancel).toHaveBeenCalled();
  });
});
