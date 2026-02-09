import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditableProfile } from "./EditableProfile";

describe("EditableProfile", () => {
    afterEach(() => {
        cleanup();
    });

    describe("default behavior", () => {
        it("shows Display content when defaultEditing is false", () => {
            render(
                <EditableProfile defaultEditing={false}>
                    <EditableProfile.Display>
                        <div data-testid="display-content">Display Content</div>
                    </EditableProfile.Display>
                    <EditableProfile.Editor>
                        {() => <div data-testid="editor-content">Editor Content</div>}
                    </EditableProfile.Editor>
                </EditableProfile>,
            );

            expect(screen.getByTestId("display-content")).toBeDefined();
            expect(screen.queryByTestId("editor-content")).toBeNull();
        });

        it("shows Editor content when defaultEditing is true", () => {
            render(
                <EditableProfile defaultEditing={true}>
                    <EditableProfile.Display>
                        <div data-testid="display-content">Display Content</div>
                    </EditableProfile.Display>
                    <EditableProfile.Editor>
                        {() => <div data-testid="editor-content">Editor Content</div>}
                    </EditableProfile.Editor>
                </EditableProfile>,
            );

            expect(screen.queryByTestId("display-content")).toBeNull();
            expect(screen.getByTestId("editor-content")).toBeDefined();
        });
    });

    describe("EditTrigger", () => {
        it("switches from Display to Editor when EditTrigger is clicked", () => {
            render(
                <EditableProfile defaultEditing={false}>
                    <EditableProfile.Display>
                        <div data-testid="display-content">Display Content</div>
                        <EditableProfile.EditTrigger>Edit</EditableProfile.EditTrigger>
                    </EditableProfile.Display>
                    <EditableProfile.Editor>
                        {() => <div data-testid="editor-content">Editor Content</div>}
                    </EditableProfile.Editor>
                </EditableProfile>,
            );

            expect(screen.getByTestId("display-content")).toBeDefined();
            expect(screen.queryByTestId("editor-content")).toBeNull();

            fireEvent.click(screen.getByText("Edit"));

            expect(screen.queryByTestId("display-content")).toBeNull();
            expect(screen.getByTestId("editor-content")).toBeDefined();
        });

        it("applies className to EditTrigger button", () => {
            render(
                <EditableProfile defaultEditing={false}>
                    <EditableProfile.EditTrigger className="custom-class">
                        Edit
                    </EditableProfile.EditTrigger>
                </EditableProfile>,
            );

            expect(screen.getByText("Edit").className).toContain("custom-class");
        });
    });

    describe("save function", () => {
        it("switches from Editor to Display when save is called", () => {
            render(
                <EditableProfile defaultEditing={true}>
                    <EditableProfile.Display>
                        <div data-testid="display-content">Display Content</div>
                    </EditableProfile.Display>
                    <EditableProfile.Editor>
                        {(save) => (
                            <div>
                                <div data-testid="editor-content">Editor Content</div>
                                <button type="button" onClick={save}>
                                    Save
                                </button>
                            </div>
                        )}
                    </EditableProfile.Editor>
                </EditableProfile>,
            );

            expect(screen.queryByTestId("display-content")).toBeNull();
            expect(screen.getByTestId("editor-content")).toBeDefined();

            fireEvent.click(screen.getByText("Save"));

            expect(screen.getByTestId("display-content")).toBeDefined();
            expect(screen.queryByTestId("editor-content")).toBeNull();
        });

        it("calls onSave callback when save is called", () => {
            const onSave = vi.fn();
            render(
                <EditableProfile defaultEditing={true} onSave={onSave}>
                    <EditableProfile.Editor>
                        {(save) => (
                            <button type="button" onClick={save}>
                                Save
                            </button>
                        )}
                    </EditableProfile.Editor>
                </EditableProfile>,
            );

            fireEvent.click(screen.getByText("Save"));
            expect(onSave).toHaveBeenCalledTimes(1);
        });
    });

    describe("defaultEditing sync (bug fix)", () => {
        it("closes editor when defaultEditing changes from true to false", () => {
            const { rerender } = render(
                <EditableProfile defaultEditing={true}>
                    <EditableProfile.Display>
                        <div data-testid="display-content">Display Content</div>
                    </EditableProfile.Display>
                    <EditableProfile.Editor>
                        {() => <div data-testid="editor-content">Editor Content</div>}
                    </EditableProfile.Editor>
                </EditableProfile>,
            );

            // Initially editing
            expect(screen.queryByTestId("display-content")).toBeNull();
            expect(screen.getByTestId("editor-content")).toBeDefined();

            // Simulate profile becoming valid (defaultEditing changes to false)
            rerender(
                <EditableProfile defaultEditing={false}>
                    <EditableProfile.Display>
                        <div data-testid="display-content">Display Content</div>
                    </EditableProfile.Display>
                    <EditableProfile.Editor>
                        {() => <div data-testid="editor-content">Editor Content</div>}
                    </EditableProfile.Editor>
                </EditableProfile>,
            );

            // Should now show display, not editor
            expect(screen.getByTestId("display-content")).toBeDefined();
            expect(screen.queryByTestId("editor-content")).toBeNull();
        });

        it("does not open editor when defaultEditing changes from false to true (user must click)", () => {
            const { rerender } = render(
                <EditableProfile defaultEditing={false}>
                    <EditableProfile.Display>
                        <div data-testid="display-content">Display Content</div>
                    </EditableProfile.Display>
                    <EditableProfile.Editor>
                        {() => <div data-testid="editor-content">Editor Content</div>}
                    </EditableProfile.Editor>
                </EditableProfile>,
            );

            // Initially not editing
            expect(screen.getByTestId("display-content")).toBeDefined();
            expect(screen.queryByTestId("editor-content")).toBeNull();

            // Simulate defaultEditing changing to true (should not auto-open)
            rerender(
                <EditableProfile defaultEditing={true}>
                    <EditableProfile.Display>
                        <div data-testid="display-content">Display Content</div>
                    </EditableProfile.Display>
                    <EditableProfile.Editor>
                        {() => <div data-testid="editor-content">Editor Content</div>}
                    </EditableProfile.Editor>
                </EditableProfile>,
            );

            // Should still show display (useEffect only closes, doesn't open)
            expect(screen.getByTestId("display-content")).toBeDefined();
            expect(screen.queryByTestId("editor-content")).toBeNull();
        });
    });

    describe("error handling", () => {
        it("throws an error when using compound components outside EditableProfile", () => {
            // Suppress console.error for this test
            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });

            expect(() => {
                render(<EditableProfile.Display>Content</EditableProfile.Display>);
            }).toThrow(
                "EditableProfile compound components must be used within an EditableProfile provider",
            );

            consoleSpy.mockRestore();
        });
    });
});
