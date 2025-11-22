import { expect, test } from "@playwright/test";

test("Game persistence across reloads", async ({ page }) => {
  // 1. Host creates a lobby
  // 1. Host creates a lobby
  await page.addInitScript(() => {
    localStorage.setItem("kraken_player_name", "Host");
    localStorage.setItem(
      "kraken_player_photo",
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    );
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Create Voyage" }).click();
  const codeElement = page
    .locator("text=Ship Code")
    .locator("..")
    .locator("p.font-mono");
  await expect(codeElement).toBeVisible();

  // 2. Add 4 bots to reach minimum players (5)
  // We can use the debug "Debug Bot" button
  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: "Debug Bot" }).click();
  }

  // 3. Start Game
  await page.getByRole("button", { name: "Start Voyage" }).click();

  // 4. Verify Game Started and Role Assigned
  await expect(page.getByText("Crew Status")).toBeVisible();
  // Check for any role title
  const roleTitles = ["Loyal Sailor", "Pirate", "Cult Leader", "Cultist"];
  const roleLocator = page
    .locator("h2")
    .filter({ hasText: new RegExp(roleTitles.join("|")) });
  await expect(roleLocator).toBeVisible();
  const assignedRole = await roleLocator.innerText();

  // 5. Reload Page
  await page.reload();

  // 6. Verify back in Game with same Role
  await expect(page.getByText("Crew Status")).toBeVisible();
  await expect(page.getByText(assignedRole)).toBeVisible();
});
