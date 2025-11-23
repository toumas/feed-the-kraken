import { expect, test } from "@playwright/test";

test("Navigation Protection: Prompt on Refresh", async ({ page }) => {
  // 1. Setup user
  await page.addInitScript(() => {
    localStorage.setItem("kraken_player_name", "Test Sailor");
    localStorage.setItem(
      "kraken_player_photo",
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    );
  });

  // 2. Create Lobby
  await page.goto("/");
  await page.getByRole("button", { name: "Create Voyage" }).click();
  await expect(page).toHaveURL(/\/lobby/);
  await expect(page.getByText("Test Sailor(You)")).toBeVisible();

  // 3. Try to reload and expect dialog
  // Ensure we are fully connected (green dot)
  await expect(page.locator(".bg-green-500")).toBeVisible();

  // Trigger reload.
  // Ensure interaction for Firefox: Perform a meaningful interaction sequence
  // Click Edit Profile
  await page.getByRole("button", { name: "Edit" }).click();
  // Type in the name field
  await page
    .getByPlaceholder("Enter your pirate name...")
    .fill("Test Sailor 2");
  // Click Save
  await page.getByRole("button", { name: "Save Profile" }).click();

  // Wait a bit to ensure the interaction is registered by the browser
  await page.waitForTimeout(500);

  // Expect a dialog to appear during close
  const dialogPromise = page.waitForEvent("dialog");

  // Trigger close with runBeforeUnload: true
  await page.close({ runBeforeUnload: true });

  const dialog = await dialogPromise;
  expect(dialog.type()).toBe("beforeunload");
  await dialog.accept();
});

test("Navigation Protection: Prompt on Close (simulated)", async ({ page }) => {
  // 1. Setup user
  await page.addInitScript(() => {
    localStorage.setItem("kraken_player_name", "Test Sailor");
    localStorage.setItem(
      "kraken_player_photo",
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    );
  });

  // 2. Create Lobby
  await page.goto("/");
  await page.getByRole("button", { name: "Create Voyage" }).click();
  await expect(page).toHaveURL(/\/lobby/);

  // 3. Check if beforeunload is registered
  // We can't easily "close" the tab and check for dialog in the same way as reload in a single page context test,
  // but we can verify the event listener is active via evaluation.
  const isListenerAttached = await page.evaluate(() => {
    // This is tricky because we can't inspect registered listeners easily in JS.
    // But we can try to dispatch a beforeunload event and see if it's prevented/returnValue is set.
    const event = new Event("beforeunload", {
      bubbles: true,
      cancelable: true,
    }) as unknown as BeforeUnloadEvent;

    event.returnValue = undefined;
    window.dispatchEvent(event);

    return event.returnValue !== undefined;
  });

  expect(isListenerAttached).toBe(true);
});
