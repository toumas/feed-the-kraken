import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock GameContext
const mockImportDevState = vi.fn();
vi.mock("../context/GameContext", () => ({
    useGame: () => ({
        importDevState: mockImportDevState,
    }),
}));

import { DevStateImporter } from "./DevStateImporter";

describe("DevStateImporter", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv("NODE_ENV", "development");
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllEnvs();
    });

    it("renders floating button in development mode", () => {
        render(<DevStateImporter />);
        expect(screen.getByTitle("Import Game State (Dev Only)")).toBeDefined();
    });

    it("returns null in production mode", () => {
        vi.stubEnv("NODE_ENV", "production");
        const { container } = render(<DevStateImporter />);
        expect(container.innerHTML).toBe("");
    });

    it("opens modal when floating button is clicked", () => {
        render(<DevStateImporter />);
        fireEvent.click(screen.getByTitle("Import Game State (Dev Only)"));
        expect(screen.getByText("Import Game State")).toBeDefined();
        expect(screen.getByPlaceholderText('{ "code": "...", "players": [...] }')).toBeDefined();
    });

    it("closes modal when X button is clicked", () => {
        render(<DevStateImporter />);
        fireEvent.click(screen.getByTitle("Import Game State (Dev Only)"));
        expect(screen.getByText("Import Game State")).toBeDefined();

        // Find close button by position class
        const closeButton = document.querySelector(".absolute.top-4.right-4");
        if (closeButton) fireEvent.click(closeButton);

        expect(screen.queryByText("Import Game State")).toBeNull();
    });

    it("shows error when trying to import empty JSON", () => {
        render(<DevStateImporter />);
        fireEvent.click(screen.getByTitle("Import Game State (Dev Only)"));

        // Get the submit button (last element with "Import State" text, which is the button inside the modal)
        const importButtons = screen.getAllByText("Import State");
        const submitButton = importButtons[importButtons.length - 1];
        fireEvent.click(submitButton);

        expect(screen.getByText("Please paste JSON state first")).toBeDefined();
        expect(mockImportDevState).not.toHaveBeenCalled();
    });

    it("shows error for invalid JSON", () => {
        render(<DevStateImporter />);
        fireEvent.click(screen.getByTitle("Import Game State (Dev Only)"));

        const textarea = screen.getByPlaceholderText('{ "code": "...", "players": [...] }');
        fireEvent.change(textarea, { target: { value: "not valid json" } });

        const importButtons = screen.getAllByText("Import State");
        const submitButton = importButtons[importButtons.length - 1];
        fireEvent.click(submitButton);

        expect(screen.getByText("Invalid JSON format")).toBeDefined();
        expect(mockImportDevState).not.toHaveBeenCalled();
    });

    it("calls importDevState with valid JSON", () => {
        render(<DevStateImporter />);
        fireEvent.click(screen.getByTitle("Import Game State (Dev Only)"));

        const validJson = '{"code": "TEST123", "players": []}';
        const textarea = screen.getByPlaceholderText('{ "code": "...", "players": [...] }');
        fireEvent.change(textarea, { target: { value: validJson } });

        const importButtons = screen.getAllByText("Import State");
        const submitButton = importButtons[importButtons.length - 1];
        fireEvent.click(submitButton);

        expect(mockImportDevState).toHaveBeenCalledWith(validJson);
        expect(screen.getByText("State imported successfully! Redirecting...")).toBeDefined();
    });

    it("resets error state when typing in textarea", () => {
        render(<DevStateImporter />);
        fireEvent.click(screen.getByTitle("Import Game State (Dev Only)"));

        // Trigger error first
        const importButtons = screen.getAllByText("Import State");
        const submitButton = importButtons[importButtons.length - 1];
        fireEvent.click(submitButton);
        expect(screen.getByText("Please paste JSON state first")).toBeDefined();

        // Type in textarea
        const textarea = screen.getByPlaceholderText('{ "code": "...", "players": [...] }');
        fireEvent.change(textarea, { target: { value: "something" } });

        // Error should be gone
        expect(screen.queryByText("Please paste JSON state first")).toBeNull();
    });
});
