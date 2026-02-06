import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FeedbackModal } from "./FeedbackModal";

// Mock i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe("FeedbackModal", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly when open", () => {
    render(<FeedbackModal isOpen={true} onClose={onClose} />);
    expect(screen.getByText("feedback.title")).toBeDefined();
    expect(
      screen.getByPlaceholderText("feedback.messagePlaceholder"),
    ).toBeDefined();
    expect(
      screen.getByPlaceholderText("feedback.emailPlaceholder"),
    ).toBeDefined();
  });

  it("calls onClose when cancel is clicked", () => {
    render(<FeedbackModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText("feedback.cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("submits the form successfully", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<FeedbackModal isOpen={true} onClose={onClose} />);

    const messageInput = screen.getByPlaceholderText(
      "feedback.messagePlaceholder",
    );
    fireEvent.change(messageInput, { target: { value: "Great app!" } });

    const emailInput = screen.getByPlaceholderText("feedback.emailPlaceholder");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    fireEvent.click(screen.getByText("feedback.submit"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Great app!",
          email: "test@example.com",
        }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText("feedback.success")).toBeDefined();
    });
  });

  it("shows error message on failure", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
    });

    render(<FeedbackModal isOpen={true} onClose={onClose} />);

    const messageInput = screen.getByPlaceholderText(
      "feedback.messagePlaceholder",
    );
    fireEvent.change(messageInput, { target: { value: "Error test" } });

    fireEvent.click(screen.getByText("feedback.submit"));

    await waitFor(() => {
      expect(screen.getByText("feedback.error")).toBeDefined();
    });
  });
});
