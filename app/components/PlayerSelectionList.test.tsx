import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Player } from "../types";
import { PlayerSelectionList } from "./PlayerSelectionList";

describe("PlayerSelectionList", () => {
  afterEach(() => {
    cleanup();
  });

  const mockPlayers: Player[] = [
    {
      id: "p1",
      name: "Host",
      isHost: true,
      photoUrl: null,
      isOnline: true,
      isEliminated: false,
      isUnconvertible: false,
      isReady: true,
      notRole: null,
      joinedAt: Date.now(),
      hasTongue: true,
    },
    {
      id: "p2",
      name: "Player 2",
      isHost: false,
      photoUrl: null,
      isOnline: true,
      isEliminated: false,
      isUnconvertible: false,
      isReady: true,
      notRole: null,
      joinedAt: Date.now(),
      hasTongue: true,
    },
    {
      id: "p3",
      name: "Player 3",
      isHost: false,
      photoUrl: null,
      isOnline: true,
      isEliminated: false,
      isUnconvertible: false,
      isReady: true,
      notRole: null,
      joinedAt: Date.now(),
      hasTongue: true,
    },
  ];

  const renderComponent = (onSubmit = () => {}) => {
    return render(
      <PlayerSelectionList.Root players={mockPlayers} myPlayerId="p1">
        <PlayerSelectionList.Content />
        <PlayerSelectionList.Actions>
          <PlayerSelectionList.Submit onSubmit={onSubmit}>
            Confirm
          </PlayerSelectionList.Submit>
        </PlayerSelectionList.Actions>
      </PlayerSelectionList.Root>,
    );
  };

  describe("Error Lifecycle", () => {
    it("does not show error initially", () => {
      renderComponent();
      expect(screen.queryByText("Please select a player first.")).toBeNull();
    });

    it("shows error when Submit clicked without selection", () => {
      renderComponent();
      fireEvent.click(screen.getByText("Confirm"));
      expect(screen.getByText("Please select a player first.")).toBeDefined();
    });

    it("dismisses error when X button is clicked", () => {
      renderComponent();
      fireEvent.click(screen.getByText("Confirm"));
      expect(screen.getByText("Please select a player first.")).toBeDefined();

      // Click dismiss button (the X)
      const dismissButtons = screen.getAllByRole("button");
      const dismissBtn = dismissButtons.find((btn) => btn.querySelector("svg"));
      if (dismissBtn) {
        fireEvent.click(dismissBtn);
      }

      expect(screen.queryByText("Please select a player first.")).toBeNull();
    });

    it("clears error when a player is selected", () => {
      renderComponent();

      // Trigger error
      fireEvent.click(screen.getByText("Confirm"));
      expect(screen.getByText("Please select a player first.")).toBeDefined();

      // Select a player
      fireEvent.click(screen.getByText("Player 2"));

      // Error should be cleared
      expect(screen.queryByText("Please select a player first.")).toBeNull();
    });
  });

  describe("Disabling Logic", () => {
    it("does not disable unconvertible players by default", () => {
      const playersWithUnconvertible = [...mockPlayers];
      playersWithUnconvertible[1] = {
        ...playersWithUnconvertible[1],
        isUnconvertible: true,
      };

      render(
        <PlayerSelectionList.Root
          players={playersWithUnconvertible}
          myPlayerId="p1"
        >
          <PlayerSelectionList.Content />
        </PlayerSelectionList.Root>,
      );

      const radio = screen.getByDisplayValue("p2") as HTMLInputElement;
      expect(radio.disabled).toBe(false);
    });

    it("disables players when isPlayerDisabled returns true", () => {
      render(
        <PlayerSelectionList.Root players={mockPlayers} myPlayerId="p1">
          <PlayerSelectionList.Content
            isPlayerDisabled={(p) => p.id === "p2"}
            disabledLabel="Special Disabled"
          />
        </PlayerSelectionList.Root>,
      );

      const radio = screen.getByDisplayValue("p2") as HTMLInputElement;
      expect(radio.disabled).toBe(true);
      expect(screen.getByText("Special Disabled")).toBeDefined();
    });

    it("still disables eliminated players regardless of isPlayerDisabled", () => {
      const playersWithEliminated = [...mockPlayers];
      playersWithEliminated[1] = {
        ...playersWithEliminated[1],
        isEliminated: true,
      };

      render(
        <PlayerSelectionList.Root
          players={playersWithEliminated}
          myPlayerId="p1"
        >
          <PlayerSelectionList.Content isPlayerDisabled={() => false} />
        </PlayerSelectionList.Root>,
      );

      const radio = screen.getByDisplayValue("p2") as HTMLInputElement;
      expect(radio.disabled).toBe(true);
      expect(screen.getByText("Eliminated")).toBeDefined();
    });
  });
});
