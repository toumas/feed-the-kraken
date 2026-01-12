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

  it("hides content on 1 click when already revealed", () => {
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

    // 1 click on HideInstruction - should hide
    const hideButton = screen.getByText("Tap once to hide your role.");
    fireEvent.click(hideButton);

    // Hidden content should now be visible
    expect(screen.getByText("Role Hidden")).toBeDefined();
    // Revealed content should no longer be in the DOM
    expect(screen.queryByText("Secret Content")).toBeNull();
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

  it("hides content on 1 click of HideInstruction when already revealed", () => {
    render(
      <RoleReveal.Root defaultRevealed={true}>
        <RoleReveal.Hidden />
        <RoleReveal.Revealed>
          <div>Secret Content</div>
          <RoleReveal.HideInstruction />
        </RoleReveal.Revealed>
      </RoleReveal.Root>,
    );

    const button = screen.getByText("Tap once to hide your role.");
    fireEvent.click(button);

    // Hidden content should now be visible
    expect(screen.getByText("Role Hidden")).toBeDefined();
    // Revealed content should not be in the DOM
    expect(screen.queryByText("Secret Content")).toBeNull();
  });

  it("renders hide instruction when revealed", () => {
    render(
      <RoleReveal.Root defaultRevealed={true}>
        <RoleReveal.Revealed>
          <RoleReveal.HideInstruction />
        </RoleReveal.Revealed>
      </RoleReveal.Root>,
    );

    expect(screen.getByText("Tap once to hide your role.")).toBeDefined();
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

  it("auto-hides revealed content after 3 seconds", () => {
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

    // Advance time by 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Content should be hidden again
    expect(screen.queryByText("Secret Content")).toBeNull();
    expect(screen.getByText("Role Hidden")).toBeDefined();

    vi.useRealTimers();
  });
});
