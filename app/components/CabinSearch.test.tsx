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

    expect(screen.getByText("Player 1")).toBeDefined();
    // Confirm button should be enabled
    const confirmButton = screen.getByText(
      "Confirm Search",
    ) as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(false);
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

    const player1Label = screen.getByText("Player 1").closest("label");
    expect(player1Label).not.toBeNull();
    fireEvent.click(player1Label as HTMLElement);

    const confirmButton = screen.getByText("Confirm Search");
    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledWith("p1");
  });

  it("requires selection before submission", () => {
    const onConfirm = vi.fn();
    render(
      <CabinSearch
        players={mockPlayers}
        myPlayerId="me"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    const radioInputs = screen.getAllByRole("radio");
    expect(radioInputs[0].hasAttribute("required")).toBe(true);

    const confirmButton = screen.getByText("Confirm Search");
    fireEvent.click(confirmButton);

    // Note: In JSDOM, form validation doesn't prevent submission automatically with fireEvent.click
    // unless we use userEvent or check validity manually.
    // But we verified the 'required' attribute is present.
    // If we want to ensure onConfirm is NOT called when invalid, we rely on the component logic:
    // if (selectedPlayerId) { onConfirm(...) }
    // Since selectedPlayerId is null initially, onConfirm should not be called.
    expect(onConfirm).not.toHaveBeenCalled();
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

    // Find the radio input for Player 2
    const player2Input = screen.getAllByRole("radio")[1] as HTMLInputElement;
    expect(player2Input.disabled).toBe(true);

    // Try to click the label
    const player2Label = screen.getByText("Player 2").closest("label");
    if (player2Label) {
      fireEvent.click(player2Label);
    }

    const confirmButton = screen.getByText("Confirm Search");
    fireEvent.click(confirmButton);

    expect(onConfirm).not.toHaveBeenCalled();
  });
  it("does not allow selecting an eliminated player", () => {
    const eliminatedPlayer: Player = {
      id: "p3",
      name: "Player 3",
      photoUrl: null,
      isHost: false,
      isReady: true,
      isOnline: true,
      isEliminated: true,
      isUnconvertible: false,
      joinedAt: 1000,
    };
    const players = [...mockPlayers, eliminatedPlayer];
    const onConfirm = vi.fn();

    render(
      <CabinSearch
        players={players}
        myPlayerId="me"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    // Find the radio input for Player 3 (index 2)
    const player3Input = screen.getAllByRole("radio")[2] as HTMLInputElement;
    expect(player3Input.disabled).toBe(true);

    // Check for "Eliminated" text
    expect(screen.getByText("Eliminated")).toBeDefined();

    const confirmButton = screen.getByText("Confirm Search");
    fireEvent.click(confirmButton);

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
