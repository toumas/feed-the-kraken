import { expect, test } from "@playwright/test";
import { completeIdentifyPage, withRoleRevealed } from "./helpers";

test.describe("Captain Cabin Search Flow", () => {
  test("Host searches Player 1's cabin and sees their role", async ({
    browser,
  }) => {
    // 1. Host creates lobby
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

    // Get the room code
    const codeElement = hostPage.locator("p.font-mono");
    await expect(codeElement).toBeVisible();
    const code = await codeElement.innerText();

    // 2. 4 Players join (Need 5 total to start)
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
      players.push({ context, page, name: playerName });
    }

    // 3. Start Game
    await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    await expect(hostPage.getByText("Crew Manifest")).toBeVisible({
      timeout: 10000,
    });

    // 4. Host initiates Cabin Search on Player 1
    await hostPage
      .getByRole("button", { name: "Cabin Search", exact: true })
      .click();
    await expect(
      hostPage.locator("h1").filter({ hasText: "Cabin Search" }),
    ).toBeVisible();

    // Select Player 1
    await hostPage.getByText("Player 1").first().click();
    await hostPage.getByRole("button", { name: "Confirm Search" }).click();

    // Verify pending state on Host
    await expect(hostPage.getByText("Waiting for Confirmation")).toBeVisible();

    // 5. Player 1 confirms the search
    const player1Page = players[0].page;
    await expect(
      player1Page.getByRole("heading", { name: "Cabin Search" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      player1Page.getByText("wants to search your cabin"),
    ).toBeVisible();
    await player1Page.getByRole("button", { name: "Accept" }).click();

    // 6. Host sees the role reveal (using RoleReveal component)
    await expect(hostPage.getByText("Cabin Searched")).toBeVisible({
      timeout: 10000,
    });

    await withRoleRevealed(hostPage, async () => {
      // Check that one of the roles is displayed
      const roleTitle = hostPage.locator("h2.text-4xl, h2.text-3xl").first();
      await expect(roleTitle).toBeVisible();
      const roleText = await roleTitle.innerText();
      expect(["Sailor", "Pirate", "Cult Leader", "Cultist"]).toContain(
        roleText,
      );
    });

    // 7. Host closes reveal
    await hostPage.getByRole("button", { name: "Done" }).click();
    await expect(hostPage.getByText("Crew Status")).toBeVisible();
  });

  test("Player 1 denies cabin search", async ({ browser }) => {
    // 1. Host creates lobby
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

    // Get the room code
    const codeElement = hostPage.locator("p.font-mono");
    await expect(codeElement).toBeVisible();
    const code = await codeElement.innerText();

    // 2. Player 1 joins
    const context = await browser.newContext();
    const page = await context.newPage();
    const playerName = "Player 1";
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

    // 3. Add bots to reach 5 players
    for (let i = 0; i < 3; i++) {
      await hostPage.getByRole("button", { name: "Debug Bot" }).click();
    }

    // 4. Start Game
    await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    await expect(hostPage.getByText("Crew Manifest")).toBeVisible();

    // 5. Host initiates Cabin Search on Player 1
    await hostPage
      .getByRole("button", { name: "Cabin Search", exact: true })
      .click();
    await expect(
      hostPage.locator("h1").filter({ hasText: "Cabin Search" }),
    ).toBeVisible();

    // Select Player 1
    await hostPage.getByText("Player 1").first().click();
    await hostPage.getByRole("button", { name: "Confirm Search" }).click();

    // Verify pending state on Host
    await expect(hostPage.getByText("Waiting for Confirmation")).toBeVisible();

    // 6. Player 1 denies
    await expect(
      page.getByRole("heading", { name: "Cabin Search" }),
    ).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole("button", { name: "Decline" }).click();

    // 7. Host sees denial - pending state disappears but stays in view
    await expect(
      hostPage.getByText("Waiting for Confirmation"),
    ).not.toBeVisible();

    // Host should still be in the Cabin Search view
    await expect(
      hostPage.locator("h1").filter({ hasText: "Cabin Search" }),
    ).toBeVisible();

    // Host should see the denial error
    await expect(hostPage.getByText(/denied/i).first()).toBeVisible();
  });
});
