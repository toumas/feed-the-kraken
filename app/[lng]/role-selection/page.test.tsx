import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { describe, expect, it, type Mock, vi } from "vitest";
import { useGame } from "../../context/GameContext";
import RoleSelectionPage from "./page";

vi.mock("../../context/GameContext");
vi.mock("next/navigation");

describe("RoleSelectionPage", () => {
  const mockPush = vi.fn();
  (useRouter as Mock).mockReturnValue({ push: mockPush });

  const mockSelectRole = vi.fn();
  const mockConfirmRole = vi.fn();
  const mockCancelRoleSelection = vi.fn();
  const mockSetError = vi.fn();

  const createMockLobby = (playerCount: number) => ({
    players: Array.from({ length: playerCount }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
    })),
    roleSelectionStatus: {
      state: "SELECTING",
      availableRoles: [], // Should no longer depend on this for filtering
      selections: {},
    },
  });

  const setup = (playerCount = 5, error: string | null = null) => {
    (useGame as Mock).mockReturnValue({
      lobby: createMockLobby(playerCount),
      myPlayerId: "p1",
      selectRole: mockSelectRole,
      confirmRole: mockConfirmRole,
      cancelRoleSelection: mockCancelRoleSelection,
      error,
      setError: mockSetError,
    });
  };

  it("shows Cult Leader, Sailor and Pirate but NOT Cultist for 5 players", () => {
    setup(5);
    render(<RoleSelectionPage />);

    expect(screen.getByText("Cult Leader")).toBeInTheDocument();
    expect(screen.getByText("Loyal Sailor")).toBeInTheDocument();
    expect(screen.getByText("Pirate")).toBeInTheDocument();
    expect(screen.queryByText("Cultist")).not.toBeInTheDocument();
  });

  it("shows Cultist for 11 players", () => {
    setup(11);
    render(<RoleSelectionPage />);

    expect(screen.getByText("Cultist")).toBeInTheDocument();
  });

  it("keeps roles visible even if already selected by others", () => {
    const lobby = createMockLobby(5);
    // Simulate 3 players already picking Sailor
    lobby.roleSelectionStatus.selections = {
      p2: { role: "SAILOR", confirmed: true },
      p3: { role: "SAILOR", confirmed: true },
      p4: { role: "SAILOR", confirmed: true },
    };

    (useGame as Mock).mockReturnValue({
      lobby: lobby,
      myPlayerId: "p1",
      selectRole: mockSelectRole,
      confirmRole: mockConfirmRole,
      cancelRoleSelection: mockCancelRoleSelection,
      error: null,
      setError: mockSetError,
    });

    render(<RoleSelectionPage />);

    // Sailor should STILL be visible as an option for p1
    expect(screen.getByText("Loyal Sailor")).toBeInTheDocument();
  });

  it("shows server-side errors", () => {
    setup(5, "Server error message");
    render(<RoleSelectionPage />);

    expect(screen.getByText("Server error message")).toBeInTheDocument();
  });

  it("opens confirmation modal when a role is selected", async () => {
    setup(5);
    const { userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<RoleSelectionPage />);

    const sailorButton = screen.getByText("Loyal Sailor").closest("button");
    if (!sailorButton) throw new Error("Sailor button not found");
    await user.click(sailorButton);

    expect(screen.getByText("Confirm Your Role")).toBeInTheDocument();
    expect(
      screen.getByText(/This cannot be changed once confirmed!/),
    ).toBeInTheDocument();
  });

  it("calls confirmRole when confirm button is clicked in modal", async () => {
    setup(5);
    const { userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<RoleSelectionPage />);

    const pirateButton = screen.getByText("Pirate").closest("button");
    if (!pirateButton) throw new Error("Pirate button not found");
    await user.click(pirateButton);

    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    await user.click(confirmButton);

    expect(mockConfirmRole).toHaveBeenCalled();
  });

  it("calls cancelRoleSelection when cancel button is clicked", async () => {
    setup(5);
    const { userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<RoleSelectionPage />);

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancelButton);

    expect(mockCancelRoleSelection).toHaveBeenCalled();
  });

  it("shows waiting state after confirmation", () => {
    const lobby = createMockLobby(5);
    (useGame as Mock).mockReturnValue({
      lobby: lobby,
      myPlayerId: "p1",
      selectRole: mockSelectRole,
      confirmRole: mockConfirmRole,
      cancelRoleSelection: mockCancelRoleSelection,
      error: null,
      setError: mockSetError,
    });

    lobby.roleSelectionStatus.selections = {
      p1: { role: "SAILOR", confirmed: true },
    };

    render(<RoleSelectionPage />);

    expect(screen.getByText(/Waiting for others/)).toBeInTheDocument();
    expect(screen.getByText(/1\s*\/\s*5/)).toBeInTheDocument();
  });
});
