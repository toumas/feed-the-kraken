import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CabinSearchView } from "./CabinSearchView";
import type { GameContextValue } from "../../context/GameContext";

// Mock the GameContext
const mockUseGame = vi.fn();
vi.mock("../../context/GameContext", () => ({
  useGame: () => mockUseGame(),
  GameContext: { Provider: ({ children }: { children: React.ReactNode }) => children }
}));

// Mock RoleReveal to simulate exposing onReveal
vi.mock("../RoleReveal", () => {
  return {
    RoleReveal: {
      Root: ({ children, onReveal }: { children: React.ReactNode, onReveal?: () => void }) => (
        <div data-testid="role-reveal-root">
          <button type="button" onClick={onReveal} data-testid="trigger-reveal">Trigger Reveal</button>
          {children}
        </div>
      ),
      Hidden: ({ children, instruction }: { children: React.ReactNode, instruction?: string }) => <div>{instruction}{children}</div>,
      Revealed: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      Icon: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      Title: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      Description: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      HideInstruction: () => <div>Hide Instruction</div>,
    }
  };
});

// Mock translations
vi.mock("../../i18n/client", () => ({
  useT: (ns: string) => ({
    t: (key: string, options?: { name?: string }) => {
      // Return specific strings for assertions
      if (key === "cabinSearch.title") return "Cabin Search";
      if (key === "cabinSearch.confirmSearch") return "Confirm Search";
      if (key === "cabinSearch.searchedTitle") return "Cabin Searched";
      // This is the key we want to verify is used
      if (key === "cabinSearch.searchedDesc") return "Tap 5 times to reveal the loyalty card.";
      if (key === "roleReveal.instruction") return "Tap 5 times to reveal your role.";
      if (key === "cabinSearch.foundCard") return `You found ${options?.name}'s loyalty card!`;
      if (key === "cabinSearch.confirmCloseWithoutReveal") return "Confirm close?";
      if (key === "actions.done") return "Done";
      if (key === "roles.SAILOR") return "Sailor";
      
      return key;
    }
  })
}));

describe("CabinSearchView", () => {
  const defaultLobby = {
    code: "ABCD",
    players: [
      { id: "p1", name: "Player 1", photoUrl: null, isOnline: true, isEliminated: false },
      { id: "p2", name: "Player 2", photoUrl: null, isOnline: true, isEliminated: false },
    ],
    hostId: "p1",
    status: "PLAYING" as const,
    voyageMap: "aaa",
    assignments: {},
    settings: {
      roleDistributionMode: "AUTOMATIC" as const
    },
    createdAt: 0,
    cultistConversions: [],
    events: [],
    messages: []
  };

  const defaultContext: Partial<GameContextValue> = {
    lobby: defaultLobby as unknown as GameContextValue["lobby"],
    myPlayerId: "p1",
    handleCabinSearch: vi.fn(),
    cabinSearchResult: null,
    clearCabinSearchResult: vi.fn(),
    error: null,
    setError: vi.fn(),
  };

  it("renders the player selection list initially", () => {
    mockUseGame.mockReturnValue(defaultContext);
    render(<CabinSearchView onDismiss={vi.fn()} />);
    
    expect(screen.getByText("Cabin Search")).toBeDefined();
    expect(screen.getByText("Confirm Search")).toBeDefined();
    expect(screen.getByText("Player 2")).toBeDefined();
  });

  it("renders the correct instruction text when showing search results", () => {
    mockUseGame.mockReturnValue({
      ...defaultContext,
      cabinSearchResult: {
        targetPlayerId: "p2",
        role: "SAILOR",
        originalRole: null,
        isConverted: false
      }
    });

    render(<CabinSearchView onDismiss={vi.fn()} />);
    
    expect(screen.getByText("Cabin Searched")).toBeDefined();
    // This assertion verifies that the component is using the specific instruction
    // for cabin search instead of the generic role reveal instruction
    expect(screen.getByText("Tap 5 times to reveal the loyalty card.")).toBeDefined();
    expect(screen.queryByText("Tap 5 times to reveal your role.")).toBeNull();
  });

  describe("Confirmation Dialog", () => {
    let confirmSpy: ReturnType<typeof vi.spyOn>;
    const onDismiss = vi.fn();

    beforeEach(() => {
      confirmSpy = vi.spyOn(window, "confirm");
      onDismiss.mockClear();
    });

    afterEach(() => {
      confirmSpy.mockRestore();
    });

    it("prompts for confirmation if closing without revealing", () => {
      mockUseGame.mockReturnValue({
        ...defaultContext,
        cabinSearchResult: { targetPlayerId: "p2", role: "SAILOR", originalRole: null, isConverted: false }
      });

      confirmSpy.mockReturnValue(false); // User cancels
      render(<CabinSearchView onDismiss={onDismiss} />);
      
      const doneButton = screen.getByText("Done");
      doneButton.click();

      expect(confirmSpy).toHaveBeenCalledWith("Confirm close?");
      expect(onDismiss).not.toHaveBeenCalled();
      expect(defaultContext.clearCabinSearchResult).not.toHaveBeenCalled();

      confirmSpy.mockReturnValue(true); // User confirms
      fireEvent.click(doneButton);
      
      expect(confirmSpy).toHaveBeenCalledTimes(2);
      expect(onDismiss).toHaveBeenCalled();
      expect(defaultContext.clearCabinSearchResult).toHaveBeenCalled();
    });

    it("does not prompt if already revealed", () => {
       mockUseGame.mockReturnValue({
        ...defaultContext,
        cabinSearchResult: { targetPlayerId: "p2", role: "SAILOR", originalRole: null, isConverted: false }
      });
      
      confirmSpy.mockReturnValue(false); // Should not matter
      render(<CabinSearchView onDismiss={onDismiss} />);

      // Simulate reveal
      fireEvent.click(screen.getByTestId("trigger-reveal"));
      
      const doneButton = screen.getByText("Done");
      fireEvent.click(doneButton);

      expect(confirmSpy).not.toHaveBeenCalled();
      expect(onDismiss).toHaveBeenCalled();
      expect(defaultContext.clearCabinSearchResult).toHaveBeenCalled();
    });
  });
});
