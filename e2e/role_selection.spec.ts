import { expect, test } from "@playwright/test";
import { checkRoleVisible, completeIdentifyPage } from "./helpers";

test.describe("Manual Role Selection", () => {
  test("5 Players: Success with 3 Sailors, 1 Pirate, 1 Cult Leader", async ({
    browser,
  }) => {
    // 1. Host creates lobby and sets manual mode
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    await hostPage.addInitScript(() => {
      localStorage.setItem("kraken_player_name", "Host");
      localStorage.setItem(
        "kraken_player_photo",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      );
    });
    await hostPage.goto("/");
    await hostPage.getByRole("button", { name: "Create Voyage" }).click();
    await completeIdentifyPage(hostPage);
    await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 15000 });

    // Set to manual distribution
    await hostPage.getByRole("button", { name: "Manual" }).click();

    // Get the room code
    const code = await hostPage.locator("p.font-mono").innerText();

    // 2. 4 Players join
    const players = [];
    for (let i = 0; i < 4; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const playerName = `Player ${i + 1}`;
      await page.addInitScript((name) => {
        localStorage.setItem("kraken_player_name", name);
        localStorage.setItem(
          "kraken_player_photo",
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        );
      }, playerName);
      await page.goto("/");
      await page.getByRole("button", { name: "Join Crew" }).click();
      await page.getByPlaceholder("XP7K9L").fill(code);
      await page.getByRole("button", { name: "Board Ship" }).click();
      await completeIdentifyPage(page);
      await expect(page).toHaveURL(/\/lobby/, { timeout: 15000 });
      players.push({ page, name: playerName });
    }

    // 3. Host starts game
    await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    // Wait for role selection view to appear (it's now a view on /game, not a separate URL)
    await expect(
      hostPage.getByRole("heading", { name: "Choose Your Role", level: 1 }),
    ).toBeVisible({ timeout: 15000 });

    // 4. Players select roles (3 Sailors, 1 Pirate, 1 Cult Leader)
    const rolesToSelect = [
      { page: hostPage, role: "Cult Leader" },
      { page: players[0].page, role: "Sailor" },
      { page: players[1].page, role: "Sailor" },
      { page: players[2].page, role: "Sailor" },
      { page: players[3].page, role: "Pirate" },
    ];

    for (const p of rolesToSelect) {
      await expect(
        p.page.getByRole("heading", { name: "Choose Your Role", level: 1 }),
      ).toBeVisible({ timeout: 15000 });
      // Using regex to match button name starting with role title to avoid description collisions
      const roleRegex = new RegExp(`^${p.role}`);
      await p.page.getByRole("button", { name: roleRegex }).click();
      await p.page
        .getByRole("button", { name: "Confirm", exact: true })
        .click();
    }

    // 5. Verify transition to game
    await expect(hostPage).toHaveURL(/\/game/);

    // 6. verify that the player roles are what they picked by using checkRoleVisible from helpers.ts
    for (const p of rolesToSelect) {
      const isCorrectRole = await checkRoleVisible(p.page, p.role);
      expect(isCorrectRole).toBe(true);
    }
  });

  test("5 Players: Failure and Reset when all pick Cult Leader", async ({
    browser,
  }) => {
    // 1. Setup
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    await hostPage.addInitScript(() => {
      localStorage.setItem("kraken_player_name", "Host");
      localStorage.setItem(
        "kraken_player_photo",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      );
    });
    await hostPage.goto("/");
    await hostPage.getByRole("button", { name: "Create Voyage" }).click();
    await completeIdentifyPage(hostPage);
    await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 15000 });
    await hostPage.getByRole("button", { name: "Manual" }).click();
    const code = await hostPage.locator("p.font-mono").innerText();

    const players = [];
    for (let i = 0; i < 4; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.addInitScript(
        (name) => {
          localStorage.setItem("kraken_player_name", name);
          localStorage.setItem(
            "kraken_player_photo",
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          );
        },
        `Player ${i + 1}`,
      );
      await page.goto("/");
      await page.getByRole("button", { name: "Join Crew" }).click();
      await page.getByPlaceholder("XP7K9L").fill(code);
      await page.getByRole("button", { name: "Board Ship" }).click();
      await completeIdentifyPage(page);
      await expect(page).toHaveURL(/\/lobby/, { timeout: 15000 });
      players.push(page);
    }

    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    // Wait for role selection view to appear
    await expect(
      hostPage.getByRole("heading", { name: "Choose Your Role", level: 1 }),
    ).toBeVisible({ timeout: 15000 });

    // 2. Everyone picks Cult Leader
    const allPages = [hostPage, ...players];
    for (const p of allPages) {
      await expect(
        p.getByRole("heading", { name: "Choose Your Role", level: 1 }),
      ).toBeVisible({ timeout: 15000 });
      await p.getByRole("button", { name: /^Cult Leader/ }).click();
      await p.getByRole("button", { name: "Confirm", exact: true }).click();
    }

    // 3. Verify role selection is cancelled and they see the lobby again
    // When all pick the same role, the selection should be cancelled
    // The state goes back to lobby but URL may not change, so check for lobby content
    await expect(
      hostPage.getByText("Crew Manifest", { exact: false }),
    ).toBeVisible({ timeout: 15000 });
    for (const p of players) {
      await expect(p.getByText("Crew Manifest", { exact: false })).toBeVisible({
        timeout: 15000,
      });
    }
  });

  test("11 Players: Success with full composition", async ({ browser }) => {
    test.setTimeout(180000); // 11 players takes a lot of time
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    await hostPage.addInitScript(() => {
      localStorage.setItem("kraken_player_name", "Host");
      localStorage.setItem(
        "kraken_player_photo",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      );
    });
    await hostPage.goto("/");
    await hostPage.getByRole("button", { name: "Create Voyage" }).click();
    await completeIdentifyPage(hostPage);
    await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 15000 });
    await hostPage.getByRole("button", { name: "Manual" }).click();

    const code = await hostPage.locator("p.font-mono").innerText();

    const players = [];
    for (let i = 0; i < 10; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.addInitScript(
        (name) => {
          localStorage.setItem("kraken_player_name", name);
          localStorage.setItem(
            "kraken_player_photo",
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          );
        },
        `P${i + 1}`,
      );
      await page.goto("/");
      await page.getByRole("button", { name: "Join Crew" }).click();
      await page.getByPlaceholder("XP7K9L").fill(code);
      await page.getByRole("button", { name: "Board Ship" }).click();
      await completeIdentifyPage(page);
      await expect(page).toHaveURL(/\/lobby/, { timeout: 15000 });
      players.push(page);
    }

    await hostPage.getByRole("button", { name: "Start Voyage" }).click();

    // Role composition for 11: 1 CL, 5 Sailors, 4 Pirates, 1 Cultist
    const rolesToSelect = [
      { p: hostPage, r: "Cult Leader" },
      { p: players[0], r: "Cultist" },
      { p: players[1], r: "Sailor" },
      { p: players[2], r: "Sailor" },
      { p: players[3], r: "Sailor" },
      { p: players[4], r: "Sailor" },
      { p: players[5], r: "Sailor" },
      { p: players[6], r: "Pirate" },
      { p: players[7], r: "Pirate" },
      { p: players[8], r: "Pirate" },
      { p: players[9], r: "Pirate" },
    ];

    for (const item of rolesToSelect) {
      const roleRegex = new RegExp(`^${item.r}`);
      await item.p.getByRole("button", { name: roleRegex }).click();
      await item.p
        .getByRole("button", { name: "Confirm", exact: true })
        .click();
    }

    await expect(hostPage).toHaveURL(/\/game/, { timeout: 30000 });

    for (const p of rolesToSelect) {
      const isCorrectRole = await checkRoleVisible(p.p, p.r);
      expect(isCorrectRole).toBe(true);
    }
  });
});
