import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DenialView } from "./DenialView";

// Mock the useGame hook
const mockHandleDenialOfCommand = vi.fn();
vi.mock("../../context/GameContext", () => ({
  useGame: () => ({
    handleDenialOfCommand: mockHandleDenialOfCommand,
    lobby: { code: "TEST", players: [], status: "PLAYING" },
  }),
}));

// Mock i18n
vi.mock("../../i18n/client", () => ({
  useT: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "denial.title": "Denial of Command",
        "denial.description": "This action is irreversible.",
        "denial.confirm": "Yes, I Deny Command",
        "actions.cancel": "Cancel",
        "game.loading": "Loading...",
      };
      return translations[key] || key;
    },
  }),
}));

describe("DenialView", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the denial view with title and description", () => {
    const onDismiss = vi.fn();
    render(<DenialView onDismiss={onDismiss} />);

    // Title appears twice (header and content), so use getAllByText
    expect(screen.getAllByText("Denial of Command")).toHaveLength(2);
    expect(
      screen.getByText("This action is irreversible."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Yes, I Deny Command" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls handleDenialOfCommand and onDismiss when confirm is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<DenialView onDismiss={onDismiss} />);

    await user.click(
      screen.getByRole("button", { name: "Yes, I Deny Command" }),
    );

    expect(mockHandleDenialOfCommand).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss when cancel is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<DenialView onDismiss={onDismiss} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockHandleDenialOfCommand).not.toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
