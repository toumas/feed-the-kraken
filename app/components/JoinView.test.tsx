import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JoinView } from "./JoinView";

describe("JoinView", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const defaultProps = {
    onJoin: vi.fn(),
    onBack: vi.fn(),
  };

  describe("Error Lifecycle", () => {
    it("does not show error initially", () => {
      render(<JoinView {...defaultProps} />);
      expect(screen.queryByText(/Please enter a valid/)).toBeNull();
    });

    it("shows error when submit with short code", () => {
      render(<JoinView {...defaultProps} />);

      const input = screen.getByPlaceholderText("XP7K9L");
      fireEvent.change(input, { target: { value: "AB" } });

      const submitButton = screen.getByText("Board Ship");
      fireEvent.click(submitButton);

      expect(
        screen.getByText(
          "Please enter a valid ship code (at least 4 characters).",
        ),
      ).toBeDefined();
    });

    it("dismisses error when X button is clicked", () => {
      render(<JoinView {...defaultProps} />);

      const input = screen.getByPlaceholderText("XP7K9L");
      fireEvent.change(input, { target: { value: "AB" } });
      fireEvent.click(screen.getByText("Board Ship"));

      expect(
        screen.getByText(
          "Please enter a valid ship code (at least 4 characters).",
        ),
      ).toBeDefined();

      // Find the dismiss button
      const errorContainer = screen
        .getByText("Please enter a valid ship code (at least 4 characters).")
        .closest("div");
      const dismissButton = errorContainer?.querySelector("button");
      if (dismissButton) {
        fireEvent.click(dismissButton);
      }

      expect(
        screen.queryByText(
          "Please enter a valid ship code (at least 4 characters).",
        ),
      ).toBeNull();
    });

    it("clears error when typing continues", () => {
      render(<JoinView {...defaultProps} />);

      const input = screen.getByPlaceholderText("XP7K9L");
      fireEvent.change(input, { target: { value: "AB" } });
      fireEvent.click(screen.getByText("Board Ship"));

      expect(
        screen.getByText(
          "Please enter a valid ship code (at least 4 characters).",
        ),
      ).toBeDefined();

      // Continue typing
      fireEvent.change(input, { target: { value: "ABC" } });

      expect(
        screen.queryByText(
          "Please enter a valid ship code (at least 4 characters).",
        ),
      ).toBeNull();
    });

    it("calls onJoin when code is valid", () => {
      const onJoin = vi.fn();
      render(<JoinView {...defaultProps} onJoin={onJoin} />);

      const input = screen.getByPlaceholderText("XP7K9L");
      fireEvent.change(input, { target: { value: "ABCD" } });
      fireEvent.click(screen.getByText("Board Ship"));

      expect(onJoin).toHaveBeenCalledWith("ABCD");
    });

    it("auto-submits when 6 characters are typed", () => {
      const onJoin = vi.fn();
      render(<JoinView {...defaultProps} onJoin={onJoin} />);

      const input = screen.getByPlaceholderText("XP7K9L");
      fireEvent.change(input, { target: { value: "ABCDEF" } });

      expect(onJoin).toHaveBeenCalledWith("ABCDEF");
    });
  });
});
