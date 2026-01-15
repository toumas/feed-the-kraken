import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Quiz } from "./Quiz";

describe("Quiz", () => {
  describe("OptionsList", () => {
    const mockOptions = [
      { id: "opt-a", text: "Option A" },
      { id: "opt-b", text: "Option B" },
      { id: "opt-c", text: "Option C" },
    ];

    it("shuffles options on initial render", () => {
      const onSelect = vi.fn();
      render(
        <Quiz.Root selectedAnswerId={null} onSelect={onSelect}>
          <Quiz.OptionsList options={mockOptions} />
        </Quiz.Root>,
      );

      // All options should be rendered
      expect(screen.getByText("Option A")).toBeInTheDocument();
      expect(screen.getByText("Option B")).toBeInTheDocument();
      expect(screen.getByText("Option C")).toBeInTheDocument();
    });

    it("does not re-shuffle when an option is selected", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      const { rerender } = render(
        <Quiz.Root selectedAnswerId={null} onSelect={onSelect}>
          <Quiz.OptionsList options={mockOptions} />
        </Quiz.Root>,
      );

      // Capture initial order
      const getOptionOrder = () =>
        screen
          .getAllByRole("button")
          .map((btn) => btn.textContent?.replace(/^[A-C]\.\s*/, ""));
      const initialOrder = getOptionOrder();

      // Simulate selecting an option - triggers re-render with new selectedAnswerId
      await user.click(screen.getByText("Option A"));
      expect(onSelect).toHaveBeenCalledWith("opt-a");

      // Re-render with selected answer (simulates parent state update)
      rerender(
        <Quiz.Root selectedAnswerId="opt-a" onSelect={onSelect}>
          <Quiz.OptionsList options={mockOptions} />
        </Quiz.Root>,
      );

      // Order should remain the same
      const orderAfterSelection = getOptionOrder();
      expect(orderAfterSelection).toEqual(initialOrder);
    });

    it("does not re-shuffle when options prop has new array reference but same content", () => {
      const onSelect = vi.fn();

      const { rerender } = render(
        <Quiz.Root selectedAnswerId={null} onSelect={onSelect}>
          <Quiz.OptionsList options={mockOptions} />
        </Quiz.Root>,
      );

      const getOptionOrder = () =>
        screen
          .getAllByRole("button")
          .map((btn) => btn.textContent?.replace(/^[A-C]\.\s*/, ""));
      const initialOrder = getOptionOrder();

      // Re-render with NEW array reference but SAME content (mimics .map() in parent)
      const newOptionsReference = [
        { id: "opt-a", text: "Option A" },
        { id: "opt-b", text: "Option B" },
        { id: "opt-c", text: "Option C" },
      ];

      rerender(
        <Quiz.Root selectedAnswerId={null} onSelect={onSelect}>
          <Quiz.OptionsList options={newOptionsReference} />
        </Quiz.Root>,
      );

      // Order should remain the same - no reshuffle
      const orderAfterRerender = getOptionOrder();
      expect(orderAfterRerender).toEqual(initialOrder);
    });

    it("re-shuffles when options content actually changes", () => {
      const onSelect = vi.fn();

      const { rerender } = render(
        <Quiz.Root selectedAnswerId={null} onSelect={onSelect}>
          <Quiz.OptionsList options={mockOptions} />
        </Quiz.Root>,
      );

      // All original options rendered
      expect(screen.getByText("Option A")).toBeInTheDocument();
      expect(screen.getByText("Option B")).toBeInTheDocument();
      expect(screen.getByText("Option C")).toBeInTheDocument();

      // Re-render with DIFFERENT options (different question)
      const differentOptions = [
        { id: "new-a", text: "New Option 1" },
        { id: "new-b", text: "New Option 2" },
        { id: "new-c", text: "New Option 3" },
      ];

      rerender(
        <Quiz.Root selectedAnswerId={null} onSelect={onSelect}>
          <Quiz.OptionsList options={differentOptions} />
        </Quiz.Root>,
      );

      // New options should be rendered
      expect(screen.getByText("New Option 1")).toBeInTheDocument();
      expect(screen.getByText("New Option 2")).toBeInTheDocument();
      expect(screen.getByText("New Option 3")).toBeInTheDocument();
    });
  });

  describe("Option", () => {
    it("shows selected styling when selected", () => {
      const onSelect = vi.fn();
      render(
        <Quiz.Root selectedAnswerId="opt-a" onSelect={onSelect}>
          <Quiz.OptionsList
            options={[
              { id: "opt-a", text: "Option A" },
              { id: "opt-b", text: "Option B" },
            ]}
          />
        </Quiz.Root>,
      );

      const selectedButton = screen.getByText("Option A").closest("button");
      expect(selectedButton).toHaveClass("bg-cyan-900/40");
    });

    it("calls onSelect when clicked", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(
        <Quiz.Root selectedAnswerId={null} onSelect={onSelect}>
          <Quiz.OptionsList options={[{ id: "opt-a", text: "Option A" }]} />
        </Quiz.Root>,
      );

      await user.click(screen.getByText("Option A"));
      expect(onSelect).toHaveBeenCalledWith("opt-a");
    });
  });

  describe("Header", () => {
    it("renders title and description", () => {
      const onSelect = vi.fn();
      render(
        <Quiz.Root selectedAnswerId={null} onSelect={onSelect}>
          <Quiz.Header title="Test Title" description="Test Description" />
        </Quiz.Root>,
      );

      expect(screen.getByText("Test Title")).toBeInTheDocument();
      expect(screen.getByText("Test Description")).toBeInTheDocument();
    });
  });

  describe("Question", () => {
    it("renders question text", () => {
      const onSelect = vi.fn();
      render(
        <Quiz.Root selectedAnswerId={null} onSelect={onSelect}>
          <Quiz.Question text="What is the answer?" />
        </Quiz.Root>,
      );

      expect(screen.getByText("What is the answer?")).toBeInTheDocument();
    });
  });
});
