import { cleanup, render } from "@testing-library/react";
import { useEffect, useState } from "react";
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
});
