import { expect, test } from "@playwright/test";
import { completeIdentifyPage, withRoleRevealed } from "./helpers";

test.describe("Captain Cabin Search Flow (Consecutive)", () => {
  test("Two different players perform Cabin Search sequentially", async ({
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
    await expect(hostPage.getByText("Crew Manifest")).toBeVisible({
      timeout: 15000,
    });

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
      await expect(page.getByText("Crew Manifest")).toBeVisible({
        timeout: 15000,
      });
      players.push({ context, page, name: playerName });
    }

    // 3. Start Game
    await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    await expect(hostPage.getByText("Crew Manifest")).toBeVisible({
      timeout: 10000,
    });

    // 4. Host initiates Cabin Search on Player 1
    console.log("--- Search 1: Host searches Player 1 ---");
    await hostPage
      .getByRole("button", { name: "Cabin Search", exact: true })
      .click();
    // URL check removed, relying on UI state
    await expect(
      hostPage.locator("h1").filter({ hasText: "Cabin Search" }),
    ).toBeVisible();

    // Select Player 1 - scope to Cabin Search modal
    const cabinSearchModal1 = hostPage
      .locator("div")
      .filter({ hasText: "Cabin Search" })
      .filter({ has: hostPage.locator("h1") });
    await cabinSearchModal1
      .locator("label")
      .filter({ hasText: "Player 1" })
      .click();
    await hostPage.getByRole("button", { name: "Confirm Search" }).click();

    // Verify pending state on Host
    await expect(hostPage.getByText("Waiting for Confirmation")).toBeVisible();

    // Player 1 confirms the search
    const player1Page = players[0].page;
    await expect(
      player1Page.getByRole("heading", { name: "Cabin Search" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      player1Page.getByText("wants to search your cabin"),
    ).toBeVisible();
    await player1Page.getByRole("button", { name: "Accept" }).click();

    // Host sees the role reveal
    await expect(hostPage.getByText("Cabin Searched")).toBeVisible({
      timeout: 10000,
    });

    // The role should be visible after the RoleReveal interaction
    await withRoleRevealed(hostPage, async () => {
      const roleTitle = hostPage.locator("h2.text-4xl, h2.text-3xl").first();
      await expect(roleTitle).toBeVisible();
    });

    // Host closes reveal
    await hostPage.getByRole("button", { name: "Done" }).click();
    // Click Return to Ship if visible (flow may auto-navigate back)
    const returnBtn1 = hostPage.getByText("Return to Ship", { exact: true });
    if (await returnBtn1.isVisible().catch(() => false)) {
      await returnBtn1.click();
    }
    await expect(hostPage.getByText("Crew Status")).toBeVisible();

    // 5. Player 2 initiates Cabin Search on Player 3
    console.log("--- Search 2: Player 2 searches Player 3 ---");
    const player2Page = players[1].page;
    const player3Page = players[2].page;

    // Navigate Player 2 to Cabin Search
    await player2Page
      .getByRole("button", { name: "Cabin Search", exact: true })
      .click();
    await expect(
      player2Page.locator("h1").filter({ hasText: "Cabin Search" }),
    ).toBeVisible();

    // Select Player 3 - scope to Cabin Search modal
    const cabinSearchModal2 = player2Page
      .locator("div")
      .filter({ hasText: "Cabin Search" })
      .filter({ has: player2Page.locator("h1") });
    await cabinSearchModal2
      .locator("label")
      .filter({ hasText: "Player 3" })
      .click();
    await player2Page.getByRole("button", { name: "Confirm Search" }).click();

    // Verify pending state on Player 2
    await expect(
      player2Page.getByText("Waiting for Confirmation"),
    ).toBeVisible();

    // Player 3 confirms the search
    await expect(
      player3Page.getByRole("heading", { name: "Cabin Search" }),
    ).toBeVisible({ timeout: 10000 });
    // Check that the requester name is Player 2
    const modal = player3Page.locator("div.fixed.inset-0").last();
    await expect(modal).toBeVisible();
    await expect(modal.getByText("Player 2")).toBeVisible();
    await expect(modal.getByText("wants to search your cabin")).toBeVisible();
    await modal.getByRole("button", { name: "Accept" }).click();

    // Player 2 sees the role reveal
    await expect(player2Page.getByText("Cabin Searched")).toBeVisible({
      timeout: 10000,
    });

    // The role should be visible after the RoleReveal interaction
    await withRoleRevealed(player2Page, async () => {
      const roleTitle = player2Page.locator("h2.text-4xl, h2.text-3xl").first();
      await expect(roleTitle).toBeVisible();
    });

    // Player 2 closes reveal
    await player2Page.getByRole("button", { name: "Done" }).click();
    // Click Return to Ship if visible (flow may auto-navigate back)
    const returnBtn2 = player2Page.getByText("Return to Ship", { exact: true });
    if (await returnBtn2.isVisible().catch(() => false)) {
      await returnBtn2.click();
    }
    await expect(player2Page.getByText("Crew Status")).toBeVisible();
  });
});
