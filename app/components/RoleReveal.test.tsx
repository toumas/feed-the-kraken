import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RoleReveal } from "./RoleReveal";

describe("RoleReveal", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders hidden state initially", () => {
    render(
      <RoleReveal.Root>
        <RoleReveal.Canvas>
          <RoleReveal.Hidden />
          <RoleReveal.Revealed>
            <RoleReveal.Title>Secret Title</RoleReveal.Title>
            <RoleReveal.Description>Secret Description</RoleReveal.Description>
          </RoleReveal.Revealed>
        </RoleReveal.Canvas>
      </RoleReveal.Root>,
    );

    expect(screen.getByText("Role Hidden")).toBeDefined();
    expect(
      screen.getByText("Secret Title").parentElement?.className, // Parent is Revealed div
    ).toContain("opacity-0");
  });

  it("reveals content on 5 clicks", () => {
    render(
      <RoleReveal.Root>
        <RoleReveal.Canvas>
          <RoleReveal.Hidden />
          <RoleReveal.Revealed>
            <div>Secret Content</div>
          </RoleReveal.Revealed>
        </RoleReveal.Canvas>
      </RoleReveal.Root>,
    );

    const button = screen.getByRole("button");

    // 4 clicks - should still be hidden
    for (let i = 0; i < 4; i++) {
      fireEvent.click(button);
    }
    expect(
      screen.getByText("Secret Content").parentElement?.className,
    ).toContain("opacity-0");

    // 5th click - should reveal
    fireEvent.click(button);
    expect(
      screen.getByText("Secret Content").parentElement?.className,
    ).toContain("opacity-100");
    expect(screen.getByText("Role Hidden").parentElement?.className).toContain(
      "opacity-0",
    );
  });

  it("hides content on 1 click when already revealed", () => {
    render(
      <RoleReveal.Root defaultRevealed={true}>
        <RoleReveal.Canvas>
          <RoleReveal.Hidden />
          <RoleReveal.Revealed>
            <div>Secret Content</div>
          </RoleReveal.Revealed>
        </RoleReveal.Canvas>
      </RoleReveal.Root>,
    );

    const button = screen.getByRole("button");

    // Initially revealed
    expect(
      screen.getByText("Secret Content").parentElement?.className,
    ).toContain("opacity-100");

    // 1 click - should hide
    fireEvent.click(button);
    expect(
      screen.getByText("Secret Content").parentElement?.className,
    ).toContain("opacity-0");
    expect(screen.getByText("Role Hidden").parentElement?.className).toContain(
      "opacity-100",
    );
  });

  it("reveals content on 5 Enter key presses", () => {
    render(
      <RoleReveal.Root>
        <RoleReveal.Canvas>
          <RoleReveal.Hidden />
          <RoleReveal.Revealed>
            <div>Secret Content</div>
          </RoleReveal.Revealed>
        </RoleReveal.Canvas>
      </RoleReveal.Root>,
    );

    const button = screen.getByRole("button");

    // 5 Enter key presses
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(button, { key: "Enter" });
    }

    expect(
      screen.getByText("Secret Content").parentElement?.className,
    ).toContain("opacity-100");
  });

  it("hides content on 1 Enter key press when already revealed", () => {
    render(
      <RoleReveal.Root defaultRevealed={true}>
        <RoleReveal.Canvas>
          <RoleReveal.Hidden />
          <RoleReveal.Revealed>
            <div>Secret Content</div>
          </RoleReveal.Revealed>
        </RoleReveal.Canvas>
      </RoleReveal.Root>,
    );

    const button = screen.getByRole("button");

    fireEvent.keyDown(button, { key: "Enter" });

    expect(
      screen.getByText("Secret Content").parentElement?.className,
    ).toContain("opacity-0");
  });

  it("renders hide instruction when revealed", () => {
    render(
      <RoleReveal.Root defaultRevealed={true}>
        <RoleReveal.Canvas>
          <RoleReveal.Revealed>
            <RoleReveal.HideInstruction />
          </RoleReveal.Revealed>
        </RoleReveal.Canvas>
      </RoleReveal.Root>,
    );

    expect(screen.getByText("Tap once to hide your role.")).toBeDefined();
  });
});
