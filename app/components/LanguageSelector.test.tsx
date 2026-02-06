import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LanguageSelector } from "./LanguageSelector";
import { useRouter, usePathname, useParams } from "next/navigation";

// Mock next/navigation
vi.mock("next/navigation", () => ({
    useRouter: vi.fn(),
    usePathname: vi.fn(),
    useParams: vi.fn(),
}));

describe("LanguageSelector", () => {
    const mockPush = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useRouter as any).mockReturnValue({ push: mockPush });
    });

    it("renders language options", () => {
        (usePathname as any).mockReturnValue("/en/game");
        (useParams as any).mockReturnValue({ lng: "en" });

        render(<LanguageSelector />);

        expect(screen.getByText("English")).toBeDefined();
        expect(screen.getByText("Suomi")).toBeDefined();
    });

    it("changes language when a different language is clicked", () => {
        (usePathname as any).mockReturnValue("/en/game");
        (useParams as any).mockReturnValue({ lng: "en" });

        render(<LanguageSelector />);

        fireEvent.click(screen.getByText("Suomi"));

        expect(mockPush).toHaveBeenCalledWith("/fi/game");
    });

    it("does not change language when the current language is clicked", () => {
        (usePathname as any).mockReturnValue("/en/game");
        (useParams as any).mockReturnValue({ lng: "en" });

        render(<LanguageSelector />);

        fireEvent.click(screen.getByText("English"));

        expect(mockPush).not.toHaveBeenCalled();
    });
});
