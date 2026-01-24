import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockBack = vi.fn();
let mockLng: string | undefined = "en";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: vi.fn(),
    back: mockBack,
  }),
  useParams: () => ({ lng: mockLng }),
}));

import { useLocalizedRouter } from "./useLocalizedRouter";

describe("useLocalizedRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLng = "en";
  });

  describe("push", () => {
    it("adds language prefix to path without prefix", () => {
      const { result } = renderHook(() => useLocalizedRouter());

      result.current.push("/lobby");

      expect(mockPush).toHaveBeenCalledWith("/en/lobby", undefined);
    });

    it("preserves path that already has /en/ prefix", () => {
      const { result } = renderHook(() => useLocalizedRouter());

      result.current.push("/en/game");

      expect(mockPush).toHaveBeenCalledWith("/en/game", undefined);
    });

    it("preserves path that already has /fi/ prefix", () => {
      const { result } = renderHook(() => useLocalizedRouter());

      result.current.push("/fi/game");

      expect(mockPush).toHaveBeenCalledWith("/fi/game", undefined);
    });

    it("uses Finnish prefix when lng is fi", () => {
      mockLng = "fi";
      const { result } = renderHook(() => useLocalizedRouter());

      result.current.push("/lobby");

      expect(mockPush).toHaveBeenCalledWith("/fi/lobby", undefined);
    });

    it("passes options to router.push", () => {
      const { result } = renderHook(() => useLocalizedRouter());
      const options = { scroll: false };

      result.current.push("/lobby", options);

      expect(mockPush).toHaveBeenCalledWith("/en/lobby", options);
    });

    it("falls back to original path when lng is undefined", () => {
      mockLng = undefined;
      const { result } = renderHook(() => useLocalizedRouter());

      result.current.push("/lobby");

      expect(mockPush).toHaveBeenCalledWith("/lobby", undefined);
    });
  });

  describe("replace", () => {
    it("adds language prefix to path without prefix", () => {
      const { result } = renderHook(() => useLocalizedRouter());

      result.current.replace("/");

      expect(mockReplace).toHaveBeenCalledWith("/en/", undefined);
    });

    it("preserves path that already has /en/ prefix", () => {
      const { result } = renderHook(() => useLocalizedRouter());

      result.current.replace("/en/home");

      expect(mockReplace).toHaveBeenCalledWith("/en/home", undefined);
    });

    it("preserves path that already has /fi/ prefix", () => {
      const { result } = renderHook(() => useLocalizedRouter());

      result.current.replace("/fi/home");

      expect(mockReplace).toHaveBeenCalledWith("/fi/home", undefined);
    });

    it("uses Finnish prefix when lng is fi", () => {
      mockLng = "fi";
      const { result } = renderHook(() => useLocalizedRouter());

      result.current.replace("/");

      expect(mockReplace).toHaveBeenCalledWith("/fi/", undefined);
    });

    it("passes options to router.replace", () => {
      const { result } = renderHook(() => useLocalizedRouter());
      const options = { scroll: true };

      result.current.replace("/", options);

      expect(mockReplace).toHaveBeenCalledWith("/en/", options);
    });

    it("falls back to original path when lng is undefined", () => {
      mockLng = undefined;
      const { result } = renderHook(() => useLocalizedRouter());

      result.current.replace("/");

      expect(mockReplace).toHaveBeenCalledWith("/", undefined);
    });
  });
});
