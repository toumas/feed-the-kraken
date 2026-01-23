import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoleReveal } from "./RoleReveal";

describe("RoleReveal", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders hidden state initially", () => {
    render(
      <RoleReveal.Root>
        <RoleReveal.Hidden />
        <RoleReveal.Revealed>
          <RoleReveal.Title>Secret Title</RoleReveal.Title>
          <RoleReveal.Description>Secret Description</RoleReveal.Description>
        </RoleReveal.Revealed>
      </RoleReveal.Root>,
    );

    expect(screen.getByText("Role Hidden")).toBeDefined();
    // Revealed content should not be in the DOM when hidden
    expect(screen.queryByText("Secret Title")).toBeNull();
  });

  it("reveals content on 5 clicks", () => {
    render(
      <RoleReveal.Root>
        <RoleReveal.Hidden />
        <RoleReveal.Revealed>
          <div>Secret Content</div>
        </RoleReveal.Revealed>
      </RoleReveal.Root>,
    );

    const button = screen.getByRole("button");

    // 4 clicks - should still be hidden
    for (let i = 0; i < 4; i++) {
      fireEvent.click(button);
    }
    // Revealed content should not be in the DOM yet
    expect(screen.queryByText("Secret Content")).toBeNull();

    // 5th click - should reveal
    fireEvent.click(button);
    expect(screen.getByText("Secret Content")).toBeDefined();
    // Hidden content should no longer be in the DOM
    expect(screen.queryByText("Role Hidden")).toBeNull();
  });

  it("pauses auto-hide timer when holding HideInstruction button and resumes with remaining time", () => {
    vi.useFakeTimers();

    render(
      <RoleReveal.Root defaultRevealed={true}>
        <RoleReveal.Hidden />
        <RoleReveal.Revealed>
          <div>Secret Content</div>
          <RoleReveal.HideInstruction />
        </RoleReveal.Revealed>
      </RoleReveal.Root>,
    );

    // Initially revealed
    expect(screen.getByText("Secret Content")).toBeDefined();

    // Wait 4 seconds (1 second remaining)
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // Start holding the button - timer paused with 1 second remaining
    const hideButton = screen.getByText("Hold to pause countdown.");
    fireEvent.mouseDown(hideButton);

    // Advance time by 10 seconds while paused - should NOT hide
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // Content should still be visible
    expect(screen.getByText("Secret Content")).toBeDefined();

    // Release the button
    fireEvent.mouseUp(hideButton);

    // Advance less than 1 second - should still be visible
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText("Secret Content")).toBeDefined();

    // Advance 500ms more (total: 1 second remaining) - should hide now
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Hidden content should now be visible
    expect(screen.getByText("Role Hidden")).toBeDefined();
    // Revealed content should no longer be in the DOM
    expect(screen.queryByText("Secret Content")).toBeNull();

    vi.useRealTimers();
  });

  it("reveals content on 5 Enter key presses", () => {
    render(
      <RoleReveal.Root>
        <RoleReveal.Hidden />
        <RoleReveal.Revealed>
          <div>Secret Content</div>
        </RoleReveal.Revealed>
      </RoleReveal.Root>,
    );

    const button = screen.getByRole("button");

    // 5 click events (simulating keyboard activation)
    for (let i = 0; i < 5; i++) {
      fireEvent.click(button);
    }

    expect(screen.getByText("Secret Content")).toBeDefined();
  });

  it("pauses auto-hide timer on touch when holding HideInstruction button", () => {
    vi.useFakeTimers();

    render(
      <RoleReveal.Root defaultRevealed={true}>
        <RoleReveal.Hidden />
        <RoleReveal.Revealed>
          <div>Secret Content</div>
          <RoleReveal.HideInstruction />
        </RoleReveal.Revealed>
      </RoleReveal.Root>,
    );

    const hideButton = screen.getByText("Hold to pause countdown.");
    fireEvent.touchStart(hideButton);

    // Advance time while holding - should NOT hide
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText("Secret Content")).toBeDefined();

    vi.useRealTimers();
  });

  it("renders hide instruction when revealed", () => {
    render(
      <RoleReveal.Root defaultRevealed={true}>
        <RoleReveal.Revealed>
          <RoleReveal.HideInstruction />
        </RoleReveal.Revealed>
      </RoleReveal.Root>,
    );

    expect(screen.getByText("Hold to pause countdown.")).toBeDefined();
  });

  it("renders with custom children in Hidden", () => {
    render(
      <RoleReveal.Root>
        <RoleReveal.Hidden>
          <div>Custom Hidden Content</div>
        </RoleReveal.Hidden>
        <RoleReveal.Revealed>
          <div>Secret Content</div>
        </RoleReveal.Revealed>
      </RoleReveal.Root>,
    );

    // Custom hidden content should be visible
    expect(screen.getByText("Custom Hidden Content")).toBeDefined();
    // The reveal button should still be present
    expect(screen.getByText("Tap 5 times to reveal your role.")).toBeDefined();
  });

  it("auto-hides revealed content after 5 seconds", () => {
    vi.useFakeTimers();

    render(
      <RoleReveal.Root>
        <RoleReveal.Hidden />
        <RoleReveal.Revealed>
          <div>Secret Content</div>
        </RoleReveal.Revealed>
      </RoleReveal.Root>,
    );

    const button = screen.getByRole("button");

    // 5 clicks to reveal
    for (let i = 0; i < 5; i++) {
      fireEvent.click(button);
    }

    // Content should be revealed
    expect(screen.getByText("Secret Content")).toBeDefined();

    // Advance time by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Content should be hidden again
    expect(screen.queryByText("Secret Content")).toBeNull();
    expect(screen.getByText("Role Hidden")).toBeDefined();

    vi.useRealTimers();
  });
});
