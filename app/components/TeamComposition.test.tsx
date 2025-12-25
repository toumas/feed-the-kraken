import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TeamComposition } from "./TeamComposition";

// Mock translation hook
vi.mock("../i18n/client", () => ({
  useT: () => ({
    t: (key: string) => key,
  }),
}));

describe("TeamComposition", () => {
  it("renders collapsed initially", () => {
    render(<TeamComposition playerCount={7} />);
    expect(
      screen.getByText("game.teamComposition.title (7)"),
    ).toBeInTheDocument();
    // Content should not be visible (checking for one of the roles)
    expect(screen.queryByText("roles.SAILOR")).not.toBeInTheDocument();
  });

  it("expands when clicked", () => {
    render(<TeamComposition playerCount={7} />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(screen.getByText("roles.SAILOR")).toBeInTheDocument();
  });

  it("shows correct counts for 5 players (hardcoded case)", () => {
    render(<TeamComposition playerCount={5} />);
    fireEvent.click(screen.getByRole("button"));

    // Check for hardcoded "3 or 2"
    expect(screen.getByText("3 game.teamComposition.or 2")).toBeInTheDocument();
    expect(screen.getByText("1 game.teamComposition.or 2")).toBeInTheDocument();
  });

  it("shows correct counts for 7 players (standard case)", () => {
    // 7 players: 4 Sailors, 2 Pirates, 1 Cult Leader
    render(<TeamComposition playerCount={7} />);
    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows cultist count only when applicable (>= 11 players)", () => {
    render(<TeamComposition playerCount={11} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("roles.CULTIST")).toBeInTheDocument();
  });

  it("does not show cultist count for small games", () => {
    render(<TeamComposition playerCount={7} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByText("roles.CULTIST")).not.toBeInTheDocument();
  });
});
