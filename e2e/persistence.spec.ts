import { expect, test } from "@playwright/test";

test("Profile persistence across reloads", async ({ page }) => {
  // 1. Navigate to home
  await page.goto("/");

  // 2. Create a lobby
  await page.getByRole("button", { name: "Create Voyage" }).click();

  // 3. Edit Profile
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByPlaceholder("Enter your pirate name...").fill("Captain Jack");
  await page.getByRole("button", { name: "Save Profile" }).click();

  // 4. Verify name is updated
  await expect(page.getByText("Captain Jack").first()).toBeVisible();

  // 5. Reload the page
  await page.reload();

  // 6. Verify name persists
  await expect(page.getByText("Captain Jack").first()).toBeVisible();

  // 7. Verify we are still in the lobby (reconnection logic)
  await expect(page.getByText("Ship Code")).toBeVisible();
});
