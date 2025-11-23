import { cleanup, render } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameProvider, useGame } from "./GameContext";

// Mock PartySocket
vi.mock("partysocket", () => {
  return {
    default: class MockPartySocket {
      onopen: () => void = () => {};
      onclose: () => void = () => {};
      onerror: () => void = () => {};
      onmessage: () => void = () => {};
      send: () => void = () => {};
      close: () => void = () => {};
    },
  };
});

describe("GameContext Navigation Protection", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("adds beforeunload listener when connected to a lobby", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const TestComponent = () => {
      const { connectToLobby, connectionStatus } = useGame();
      // Simulate connection
      useEffect(() => {
        if (connectionStatus === "disconnected") {
          connectToLobby("TEST");
        }
      }, [connectToLobby, connectionStatus]);
      return null;
    };

    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>,
    );

    // The listener is added on mount
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );

    // Cleanup
    cleanup();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
  });
});
