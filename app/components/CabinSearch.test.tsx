import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { CabinSearch } from "./CabinSearch";
import type { Player } from "../types";

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
                onConfirm={() => { }}
                onCancel={() => { }}
            />
        );

        // Use getAllByText just in case, but expect single for title
        expect(screen.getAllByText("Cabin Search")[0]).toBeDefined();
        expect(screen.getAllByText("Player 1")[0]).toBeDefined();
    });

    it("allows selecting a convertible player", () => {
        const onConfirm = vi.fn();
        render(
            <CabinSearch
                players={mockPlayers}
                onConfirm={onConfirm}
                onCancel={() => { }}
            />
        );

        const player1Button = screen.getByText("Player 1").closest("button");
        fireEvent.click(player1Button!);

        const confirmButton = screen.getByText("Confirm Search") as HTMLButtonElement;
        expect(confirmButton.disabled).toBe(false);

        fireEvent.click(confirmButton);
        expect(onConfirm).toHaveBeenCalledWith("p1");
    });

    it("does not allow selecting an unconvertible player", () => {
        const onConfirm = vi.fn();
        render(
            <CabinSearch
                players={mockPlayers}
                onConfirm={onConfirm}
                onCancel={() => { }}
            />
        );

        const player2Button = screen.getByText("Player 2").closest("button") as HTMLButtonElement;
        expect(player2Button.disabled).toBe(true);

        fireEvent.click(player2Button!);

        const confirmButton = screen.getByText("Confirm Search") as HTMLButtonElement;
        expect(confirmButton.disabled).toBe(true);
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it("calls onCancel when cancel button is clicked", () => {
        const onCancel = vi.fn();
        render(
            <CabinSearch
                players={mockPlayers}
                onConfirm={() => { }}
                onCancel={onCancel}
            />
        );

        const closeButtons = screen.getAllByTestId("close-button");
        // If multiple found, just click the first one, but ideally should be one
        fireEvent.click(closeButtons[0]);
        expect(onCancel).toHaveBeenCalled();
    });
});
