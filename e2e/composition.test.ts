import { expect, test } from "@playwright/test";
import { completeIdentifyPage } from "./helpers";

test("Team Composition component appears in game", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("kraken_player_name", "Captain Test");
    localStorage.setItem(
      "kraken_player_photo",
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    );
  });
  await page.goto("/");
  // Create a voyage
  await page.click("text=Create Voyage");
  await completeIdentifyPage(page);

  // Wait for lobby
  await expect(page).toHaveURL(/\/lobby/, { timeout: 15000 });

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
