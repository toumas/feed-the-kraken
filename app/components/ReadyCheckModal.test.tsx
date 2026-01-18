import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReadyCheckModal } from "./ReadyCheckModal";

describe("ReadyCheckModal", () => {
  describe("Root", () => {
    it("renders children within modal container", () => {
      render(
        <ReadyCheckModal.Root readyLabel="Ready" pendingLabel="Pending">
          <div data-testid="child">Test content</div>
        </ReadyCheckModal.Root>,
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
    });
  });

  describe("Header", () => {
    it("renders title with Eye icon", () => {
      render(
        <ReadyCheckModal.Root readyLabel="Ready" pendingLabel="Pending">
          <ReadyCheckModal.Header title="Test Title" />
        </ReadyCheckModal.Root>,
      );

      expect(screen.getByText("Test Title")).toBeInTheDocument();
    });
  });

  describe("Description", () => {
    it("renders description text", () => {
      render(
        <ReadyCheckModal.Root readyLabel="Ready" pendingLabel="Pending">
          <ReadyCheckModal.Description>
            Test description content
          </ReadyCheckModal.Description>
        </ReadyCheckModal.Root>,
      );

      expect(screen.getByText("Test description content")).toBeInTheDocument();
    });
  });

  describe("PlayerList", () => {
    it("renders children in scrollable container", () => {
      render(
        <ReadyCheckModal.Root readyLabel="Ready" pendingLabel="Pending">
          <ReadyCheckModal.PlayerList>
            <div data-testid="player">Player item</div>
          </ReadyCheckModal.PlayerList>
        </ReadyCheckModal.Root>,
      );

      expect(screen.getByTestId("player")).toBeInTheDocument();
    });
  });

  describe("PlayerItem", () => {
    const mockPlayer = {
      id: "player-1",
      name: "Test Player",
      photoUrl: "https://example.com/photo.jpg",
    };

    it("renders player name and avatar", () => {
      render(
        <ReadyCheckModal.Root readyLabel="Ready" pendingLabel="Pending">
          <ReadyCheckModal.PlayerItem player={mockPlayer} isReady={false} />
        </ReadyCheckModal.Root>,
      );

      expect(screen.getByText("Test Player")).toBeInTheDocument();
    });

    it("shows ready label when player is ready", () => {
      render(
        <ReadyCheckModal.Root readyLabel="Ready" pendingLabel="Pending">
          <ReadyCheckModal.PlayerItem player={mockPlayer} isReady={true} />
        </ReadyCheckModal.Root>,
      );

      expect(screen.getByText("Ready")).toBeInTheDocument();
    });

    it("shows pending label when player is not ready", () => {
      render(
        <ReadyCheckModal.Root readyLabel="Ready" pendingLabel="Pending">
          <ReadyCheckModal.PlayerItem player={mockPlayer} isReady={false} />
        </ReadyCheckModal.Root>,
      );

      expect(screen.getByText("Pending")).toBeInTheDocument();
    });
  });

  describe("WaitingText", () => {
    it("renders waiting message", () => {
      render(
        <ReadyCheckModal.Root readyLabel="Ready" pendingLabel="Pending">
          <ReadyCheckModal.WaitingText>
            Waiting for others...
          </ReadyCheckModal.WaitingText>
        </ReadyCheckModal.Root>,
      );

      expect(screen.getByText("Waiting for others...")).toBeInTheDocument();
    });
  });

  describe("Actions", () => {
    it("renders action buttons", () => {
      render(
        <ReadyCheckModal.Root readyLabel="Ready" pendingLabel="Pending">
          <ReadyCheckModal.Actions>
            <button type="button">Action</button>
          </ReadyCheckModal.Actions>
        </ReadyCheckModal.Root>,
      );

      expect(
        screen.getByRole("button", { name: "Action" }),
      ).toBeInTheDocument();
    });
  });

  describe("ActionButtons", () => {
    it("renders button group", () => {
      render(
        <ReadyCheckModal.Root readyLabel="Ready" pendingLabel="Pending">
          <ReadyCheckModal.ActionButtons>
            <button type="button">Button 1</button>
            <button type="button">Button 2</button>
          </ReadyCheckModal.ActionButtons>
        </ReadyCheckModal.Root>,
      );

      expect(
        screen.getByRole("button", { name: "Button 1" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Button 2" }),
      ).toBeInTheDocument();
    });
  });

  describe("CancelButton", () => {
    it("renders cancel button and handles click", () => {
      const handleClick = vi.fn();
      render(
        <ReadyCheckModal.Root readyLabel="Ready" pendingLabel="Pending">
          <ReadyCheckModal.CancelButton onClick={handleClick}>
            Cancel
          </ReadyCheckModal.CancelButton>
        </ReadyCheckModal.Root>,
      );

      const button = screen.getByRole("button", { name: "Cancel" });
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("ReadyButton", () => {
    it("renders not ready state", () => {
      const handleClick = vi.fn();
      render(
        <ReadyCheckModal.Root readyLabel="Ready" pendingLabel="Pending">
          <ReadyCheckModal.ReadyButton
            onClick={handleClick}
            isReady={false}
            readyLabel="Accepted"
            notReadyLabel="Accept"
          />
        </ReadyCheckModal.Root>,
      );

      expect(
        screen.getByRole("button", { name: "Accept" }),
      ).toBeInTheDocument();
    });

    it("renders ready state with checkmark", () => {
      const handleClick = vi.fn();
      render(
        <ReadyCheckModal.Root readyLabel="Ready" pendingLabel="Pending">
          <ReadyCheckModal.ReadyButton
            onClick={handleClick}
            isReady={true}
            readyLabel="Accepted"
            notReadyLabel="Accept"
          />
        </ReadyCheckModal.Root>,
      );

      expect(screen.getByText("Accepted")).toBeInTheDocument();
    });

    it("handles click", () => {
      const handleClick = vi.fn();
      render(
        <ReadyCheckModal.Root readyLabel="Ready" pendingLabel="Pending">
          <ReadyCheckModal.ReadyButton
            onClick={handleClick}
            isReady={false}
            readyLabel="Accepted"
            notReadyLabel="Accept"
          />
        </ReadyCheckModal.Root>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Accept" }));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("Context requirement", () => {
    it("throws error when PlayerItem used outside Root", () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        render(
          <ReadyCheckModal.PlayerItem
            player={{ id: "1", name: "Test" }}
            isReady={false}
          />,
        );
      }).toThrow(
        "ReadyCheckModal subcomponents must be used within a ReadyCheckModal.Root",
      );

      consoleError.mockRestore();
    });
  });
});
