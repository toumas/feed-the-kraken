import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RoleReveal } from "./RoleReveal";

describe("RoleReveal", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders hidden state initially", () => {
        render(
            <RoleReveal>
                <div>Secret Content</div>
            </RoleReveal>,
        );

        expect(screen.getByText("Role Hidden")).toBeDefined();
        expect(screen.getByText("Secret Content").parentElement?.className).toContain("opacity-0");
    });

    it("reveals content on mouse down", () => {
        render(
            <RoleReveal>
                <div>Secret Content</div>
            </RoleReveal>,
        );

        const button = screen.getByRole("button");
        fireEvent.mouseDown(button);

        expect(screen.getByText("Secret Content").parentElement?.className).toContain("opacity-100");
        expect(screen.getByText("Role Hidden").parentElement?.className).toContain("opacity-0");
    });

    it("hides content on mouse up", () => {
        render(
            <RoleReveal>
                <div>Secret Content</div>
            </RoleReveal>,
        );

        const button = screen.getByRole("button");
        fireEvent.mouseDown(button);
        fireEvent.mouseUp(button);

        expect(screen.getByText("Secret Content").parentElement?.className).toContain("opacity-0");
        expect(screen.getByText("Role Hidden").parentElement?.className).toContain("opacity-100");
    });

    it("reveals content on touch start", () => {
        render(
            <RoleReveal>
                <div>Secret Content</div>
            </RoleReveal>,
        );

        const button = screen.getByRole("button");
        fireEvent.touchStart(button);

        expect(screen.getByText("Secret Content").parentElement?.className).toContain("opacity-100");
        expect(screen.getByText("Role Hidden").parentElement?.className).toContain("opacity-0");
    });

    it("hides content on touch end", () => {
        render(
            <RoleReveal>
                <div>Secret Content</div>
            </RoleReveal>,
        );

        const button = screen.getByRole("button");
        fireEvent.touchStart(button);
        fireEvent.touchEnd(button);

        expect(screen.getByText("Secret Content").parentElement?.className).toContain("opacity-0");
        expect(screen.getByText("Role Hidden").parentElement?.className).toContain("opacity-100");
    });

    it("reveals content on Enter key down", () => {
        render(
            <RoleReveal>
                <div>Secret Content</div>
            </RoleReveal>,
        );

        const button = screen.getByRole("button");
        fireEvent.keyDown(button, { key: "Enter" });

        expect(screen.getByText("Secret Content").parentElement?.className).toContain("opacity-100");
        expect(screen.getByText("Role Hidden").parentElement?.className).toContain("opacity-0");
    });

    it("hides content on Enter key up", () => {
        render(
            <RoleReveal>
                <div>Secret Content</div>
            </RoleReveal>,
        );

        const button = screen.getByRole("button");
        fireEvent.keyDown(button, { key: "Enter" });
        fireEvent.keyUp(button, { key: "Enter" });

        expect(screen.getByText("Secret Content").parentElement?.className).toContain("opacity-0");
        expect(screen.getByText("Role Hidden").parentElement?.className).toContain("opacity-100");
    });
});
