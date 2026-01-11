import { act, cleanup, render, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameProvider, useGame } from "./GameContext";

// Mock PartySocket
let socketOnMessage: ((event: MessageEvent) => void) | undefined;

vi.mock("partysocket/react", () => {
  return {
    default: vi.fn().mockImplementation((options) => {
      socketOnMessage = options.onMessage;
      return {
        send: vi.fn(),
        close: vi.fn(),
      };
    }),
  };
});

vi.mock("partysocket", () => {
  return {
    default: class MockPartySocket {
      send = vi.fn();
      close = vi.fn();
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

describe("GameContext Cross-Dismissal", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    // Clear localStorage between tests
    localStorage.clear();
  });

  it("dismissOtherModals('conversion') dismisses all modals except conversion", () => {
    let capturedState = {
      isConversionDismissed: false,
      isCabinSearchDismissed: false,
      isGunsStashDismissed: false,
    };

    const TestComponent = () => {
      const {
        isConversionDismissed,
        setIsConversionDismissed,
        isCabinSearchDismissed,
        setIsCabinSearchDismissed,
        isGunsStashDismissed,
        setIsGunsStashDismissed,
        handleRespondConversion,
      } = useGame();

      const [hasSetup, setHasSetup] = useState(false);

      // First, set all to false (modals visible)
      useEffect(() => {
        if (!hasSetup) {
          setIsConversionDismissed(false);
          setIsCabinSearchDismissed(false);
          setIsGunsStashDismissed(false);
          setHasSetup(true);
        }
      }, [
        hasSetup,
        setIsConversionDismissed,
        setIsCabinSearchDismissed,
        setIsGunsStashDismissed,
      ]);

      // Then trigger the handler that should dismiss others
      useEffect(() => {
        if (hasSetup) {
          // Accept conversion should dismiss all EXCEPT conversion
          handleRespondConversion(true);
        }
      }, [hasSetup, handleRespondConversion]);

      capturedState = {
        isConversionDismissed,
        isCabinSearchDismissed,
        isGunsStashDismissed,
      };

      return null;
    };

    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>,
    );

    // After accepting conversion, other modals should be dismissed but not conversion
    expect(capturedState.isConversionDismissed).toBe(false); // NOT dismissed (preserved)
    expect(capturedState.isCabinSearchDismissed).toBe(true); // dismissed
    expect(capturedState.isGunsStashDismissed).toBe(true); // dismissed
  });

  it("dismissOtherModals('cabinSearch') dismisses all modals except cabin search", () => {
    let capturedState = {
      isConversionDismissed: false,
      isCabinSearchDismissed: false,
      isGunsStashDismissed: false,
    };

    const TestComponent = () => {
      const {
        isConversionDismissed,
        setIsConversionDismissed,
        isCabinSearchDismissed,
        setIsCabinSearchDismissed,
        isGunsStashDismissed,
        setIsGunsStashDismissed,
        claimCabinSearchRole,
      } = useGame();

      const [hasSetup, setHasSetup] = useState(false);

      useEffect(() => {
        if (!hasSetup) {
          setIsConversionDismissed(false);
          setIsCabinSearchDismissed(false);
          setIsGunsStashDismissed(false);
          setHasSetup(true);
        }
      }, [
        hasSetup,
        setIsConversionDismissed,
        setIsCabinSearchDismissed,
        setIsGunsStashDismissed,
      ]);

      useEffect(() => {
        if (hasSetup) {
          claimCabinSearchRole("CAPTAIN");
        }
      }, [hasSetup, claimCabinSearchRole]);

      capturedState = {
        isConversionDismissed,
        isCabinSearchDismissed,
        isGunsStashDismissed,
      };

      return null;
    };

    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>,
    );

    expect(capturedState.isConversionDismissed).toBe(true); // dismissed
    expect(capturedState.isCabinSearchDismissed).toBe(false); // NOT dismissed (preserved)
    expect(capturedState.isGunsStashDismissed).toBe(true); // dismissed
  });

  it("dismissOtherModals('gunsStash') dismisses all modals except guns stash", () => {
    let capturedState = {
      isConversionDismissed: false,
      isCabinSearchDismissed: false,
      isGunsStashDismissed: false,
    };

    const TestComponent = () => {
      const {
        isConversionDismissed,
        setIsConversionDismissed,
        isCabinSearchDismissed,
        setIsCabinSearchDismissed,
        isGunsStashDismissed,
        setIsGunsStashDismissed,
        confirmGunsStashReady,
      } = useGame();

      const [hasSetup, setHasSetup] = useState(false);

      useEffect(() => {
        if (!hasSetup) {
          setIsConversionDismissed(false);
          setIsCabinSearchDismissed(false);
          setIsGunsStashDismissed(false);
          setHasSetup(true);
        }
      }, [
        hasSetup,
        setIsConversionDismissed,
        setIsCabinSearchDismissed,
        setIsGunsStashDismissed,
      ]);

      useEffect(() => {
        if (hasSetup) {
          confirmGunsStashReady();
        }
      }, [hasSetup, confirmGunsStashReady]);

      capturedState = {
        isConversionDismissed,
        isCabinSearchDismissed,
        isGunsStashDismissed,
      };

      return null;
    };

    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>,
    );

    expect(capturedState.isConversionDismissed).toBe(true); // dismissed
    expect(capturedState.isCabinSearchDismissed).toBe(true); // dismissed
    expect(capturedState.isGunsStashDismissed).toBe(false); // NOT dismissed (preserved)
  });

  it("does not reset isGunsStashDismissed when loading with COMPLETED state (simulating refresh)", async () => {
    // 1. Mock localStorage to have dismissal: true
    localStorage.setItem("kraken_guns_stash_dismissed", "true");

    let capturedState = {
      isGunsStashDismissed: false,
    };

    const TestComponent = () => {
      const { isGunsStashDismissed } = useGame();

      capturedState = {
        isGunsStashDismissed,
      };

      return null;
    };

    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>,
    );

    // Initial state from localStorage
    expect(capturedState.isGunsStashDismissed).toBe(true);

    // 2. Simulate receiving the lobby state from server via socket
    // We trigger a STATE_UPDATE message
    const lobbyState = {
      code: "REFRESH",
      players: [{ id: "p1", name: "Player 1" }],
      status: "PLAYING",
      gunsStashStatus: { state: "COMPLETED" },
    };

    if (socketOnMessage) {
      act(() => {
        socketOnMessage?.({
          data: JSON.stringify({
            type: "STATE_UPDATE",
            snapshot: {
              context: lobbyState,
              value: "playing",
            },
          }),
        } as MessageEvent);
      });
    }

    // 3. Check if isGunsStashDismissed became false (BUG!)
    // We use waitFor because effects run asynchronously after render
    await waitFor(() => {
      expect(capturedState.isGunsStashDismissed).toBe(true);
    });
  });
});
