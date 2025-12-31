import { expect, test } from "@playwright/test";
import { completeIdentifyPage } from "./helpers";

test.describe("Cult Guns Stash Flow", () => {
  test.setTimeout(120000); // Longer timeout for multiplayer tests

  test("Complete Guns Stash Flow", async ({ browser }) => {
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

    // 2. 4 Players join (Total 5 players)
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

    // 3. Host starts game
    await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    await expect(hostPage).toHaveURL(/\/game/, { timeout: 15000 });

    // Wait for all players to be in game view
    for (const p of players) {
      await expect(p.page).toHaveURL(/\/game/);
    }

    // 4. Host navigates to Guns Stash
    await hostPage.getByText("Cult's Guns Stash").click();
    await expect(hostPage).toHaveURL(/\/cult-guns-stash/, { timeout: 15000 });

    // 5. Verify WAITING_FOR_PLAYERS view (Host is auto-ready as initiator)
    await expect(
      hostPage.getByRole("heading", { name: "Cult's Guns Stash" }),
    ).toBeVisible();
    // Host is auto-added to readyPlayers, so they see "Waiting..." instead of "I'm Ready"
    await expect(hostPage.getByText("Waiting...")).toBeVisible();

    // 6. All other players navigate to guns stash and confirm ready
    for (const p of players) {
      await p.page.getByText("Cult's Guns Stash").click();
      await expect(p.page).toHaveURL(/\/cult-guns-stash/, { timeout: 15000 });
      await p.page.getByText("I'm Ready").click();
    }

    // 7. Verify transition to DISTRIBUTION (timer visible)
    await expect(hostPage.locator("text=/\\d+:\\d{2}/")).toBeVisible({
      timeout: 10000,
    });

    // 8. Verify non-leader sees quiz
    const nonLeaderPage = players[0].page;
    await expect(
      nonLeaderPage.getByRole("heading", { name: "Prove Your Worth" }),
    ).toBeVisible({ timeout: 10000 });

    // Non-leader answers quiz
    await nonLeaderPage.getByRole("button", { name: /^A\./ }).click();

    // 9. Wait for completion (15 seconds)
    await hostPage.waitForTimeout(16000);

    // 10. Verify COMPLETED state
    await expect(
      hostPage.getByRole("heading", { name: "Ritual Complete" }),
    ).toBeVisible({ timeout: 5000 });
    await expect(hostPage.getByText("Return to Ship")).toBeVisible();

    // Cleanup
    await hostContext.close();
    for (const p of players) {
      await p.context.close();
    }
  });

  test("Cancellation Flow", async ({ browser }) => {
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

    const codeElement = hostPage.locator("p.font-mono");
    await expect(codeElement).toBeVisible();
    const code = await codeElement.innerText();

    // 2. 4 Players join (Total 5 players)
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

    // 3. Start game
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    await expect(hostPage).toHaveURL(/\/game/, { timeout: 15000 });

    // 4. Navigate to Guns Stash
    await hostPage.getByText("Cult's Guns Stash").click();
    await expect(hostPage).toHaveURL(/\/cult-guns-stash/, { timeout: 15000 });

    // 4.1. Verify all players are in guns stash
    for (const p of players) {
      await expect(p.page).toHaveURL(/\/cult-guns-stash/, { timeout: 15000 });
    }

    // 5. Cancel
    await hostPage.getByRole("button", { name: "Cancel" }).click();

    // 6. Verify Redirect to /game
    await expect(hostPage).toHaveURL(/\/game/, { timeout: 10000 });

    // 6.1. Verify all players redirected to /game
    for (const p of players) {
      await expect(p.page).toHaveURL(/\/game/, { timeout: 10000 });
    }

    // 7. Verify Cancellation Modal
    await expect(
      hostPage.getByText("The ritual was interrupted!"),
    ).toBeVisible();

    // 7.1. Verify all players see the modal
    for (const p of players) {
      await expect(
        p.page.getByText("The ritual was interrupted!"),
      ).toBeVisible();
    }

    // Cleanup
    await hostContext.close();
    for (const p of players) {
      await p.context.close();
    }
  });
});
