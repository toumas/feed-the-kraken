import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfileEditor } from "./ProfileEditor";

describe("ProfileEditor", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps: {
    initialName: string;
    initialPhoto: string | null;
    onSave: (name: string, photo: string | null) => void;
  } = {
    initialName: "",
    initialPhoto: null,
    onSave: vi.fn(),
  };

  const renderEditor = (props = defaultProps) => {
    return render(
      <ProfileEditor.Root {...props}>
        <ProfileEditor.Photo />
        <ProfileEditor.Name />
        <ProfileEditor.Submit />
      </ProfileEditor.Root>,
    );
  };

  it("renders all components", () => {
    renderEditor();
    expect(
      screen.getByPlaceholderText("Enter your pirate name..."),
    ).toBeDefined();
    expect(screen.getByText("Save Profile")).toBeDefined();
    // Avatar placeholder or camera button should be visible
    expect(screen.getByTitle("Open Camera")).toBeDefined();
  });

  it("shows validation errors when saving with empty fields", () => {
    renderEditor();
    const saveButton = screen.getByText("Save Profile");
    fireEvent.click(saveButton);

    expect(screen.getByText("Please enter your name.")).toBeDefined();
    expect(screen.getByText("Please take a photo to continue.")).toBeDefined();
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it("calls onSave when fields are valid", () => {
    const onSave = vi.fn();
    renderEditor({
      ...defaultProps,
      onSave,
      initialName: "Captain Jack",
      initialPhoto: "fake-photo-url",
    });

    const saveButton = screen.getByText("Save Profile");
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith("Captain Jack", "fake-photo-url");
  });

  it("updates name input", () => {
    renderEditor();
    const input = screen.getByPlaceholderText("Enter your pirate name...");
    fireEvent.change(input, { target: { value: "Barbossa" } });
    expect((input as HTMLInputElement).value).toBe("Barbossa");
  });
});
