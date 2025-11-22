import { expect, test } from "@playwright/test";

test("Profile persistence across reloads", async ({ page }) => {
  // 1. Navigate to home
  // We pre-fill photo but NOT name, to trigger profile setup but allow saving
  await page.addInitScript(() => {
    localStorage.setItem(
      "kraken_player_photo",
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    );
  });
  await page.goto("/");

  // 2. Create a lobby - should be intercepted
  await page.getByRole("button", { name: "Create Voyage" }).click();

  // 3. Verify we are in Profile Setup
  await expect(page.getByText("Identify Yourself")).toBeVisible();

  // 4. Fill Name and Save
  // First try to save without name to verify validation
  await page.getByRole("button", { name: "Save Profile" }).click();
  await expect(page.getByText("Please enter your name.")).toBeVisible();

  await page.getByPlaceholder("Enter your pirate name...").fill("Captain Jack");
  await page.getByRole("button", { name: "Save Profile" }).click();

  // 5. Verify we are now in Lobby
  await expect(page.getByText("Ship Code")).toBeVisible();
  await expect(page.getByText("Captain Jack(You)")).toBeVisible();

  // 6. Reload the page
  await page.reload();

  // 7. Verify name persists and we reconnect
  await expect(page.getByText("Captain Jack(You)")).toBeVisible();
  await expect(page.getByText("Ship Code")).toBeVisible();
});
