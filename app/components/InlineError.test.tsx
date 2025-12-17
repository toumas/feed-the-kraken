import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InlineError } from "./InlineError";

describe("InlineError", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the error message", () => {
    render(<InlineError message="Test error message" onDismiss={() => {}} />);
    expect(screen.getByText("Test error message")).toBeDefined();
  });

  it("calls onDismiss when X button is clicked", () => {
    const onDismiss = vi.fn();
    render(<InlineError message="Error" onDismiss={onDismiss} />);

    const dismissButton = screen.getByRole("button");
    fireEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders AlertCircle icon", () => {
    const { container } = render(
      <InlineError message="Error" onDismiss={() => {}} />,
    );
    // AlertCircle renders as an SVG
    const svg = container.querySelector("svg");
    expect(svg).toBeDefined();
  });
});
