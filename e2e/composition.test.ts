import { expect, test } from "@playwright/test";

test("Team Composition component appears in game", async ({ page }) => {
  await page.goto("/");
  // Create a voyage
  await page.click("text=Create Voyage");
  // Fill profile
  await page.fill('input[type="text"]', "Captain Test");
  // Bypass photo using the special name trick we added (or just rely on the component being present)
  // In our test environment, we might need to be careful.
  await page.click("text=Save Profile");

  // Add bots until we have 5 players
  for (let i = 0; i < 4; i++) {
    await page.click("text=Debug Bot");
  }

  // Start game
  await page.click("text=Start Voyage");

  // Wait for game to load
  await page.waitForSelector("text=Team Composition Overview");

  // Check text
  await expect(
    page.locator("text=Team Composition Overview (5)"),
  ).toBeVisible();

  // Expand
  await page.click("text=Team Composition Overview");

  // Check content
  await expect(page.locator("text=3 or 2")).toBeVisible();
  await expect(page.locator("text=1 or 2")).toBeVisible();
});
