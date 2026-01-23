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
    await expect(hostPage.getByText("Crew Manifest")).toBeVisible({
      timeout: 15000,
    });

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
      await expect(page.getByText("Crew Manifest")).toBeVisible({
        timeout: 15000,
      });
      players.push({ context, page, name: playerName });
    }

    // 3. Host starts game
    await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    await expect(hostPage.getByText("Crew Manifest")).toBeVisible({
      timeout: 15000,
    });

    // Wait for all players to be in game view
    for (const p of players) {
      await expect(p.page.getByText("Crew Manifest")).toBeVisible();
    }

    // 4. Host navigates to Guns Stash
    await hostPage.getByText("Cult's Guns Stash").click();
    await expect(
      hostPage.getByRole("heading", { name: "Cult's Guns Stash" }),
    ).toBeVisible({
      timeout: 15000,
    });

    // 5. Verify WAITING_FOR_PLAYERS view
    await expect(
      hostPage.getByRole("heading", { name: "Cult's Guns Stash" }),
    ).toBeVisible();

    // Host should be automatically ready (Waiting...)
    // But might see "Waiting..."
    await expect(hostPage.getByText("Waiting...")).toBeVisible();

    // 6. Other players confirm ready
    // Host is already ready, so we skip clicking for host
    for (const p of players) {
      await expect(
        p.page.getByRole("heading", { name: "Cult's Guns Stash" }),
      ).toBeVisible({
        timeout: 15000,
      });
      await p.page.getByText("I'm Ready").click();
    }

    // 7. Verify transition to DISTRIBUTION (timer visible)
    await expect(hostPage.locator("text=/\\d+:\\d{2}/")).toBeVisible({
      timeout: 10000,
    });

    // 8. Identify roles to separate Cult Leader from others
    // The host might be cult leader, or one of the players
    // We need to find ONE non-cult-leader to maximize chances of finding the quiz
    // Actually, simply checking all pages - one MUST see the quiz (unless all happen to be cult leaders which is impossible with 5 players)

    let quizPage = null;
    let cultLeaderPage = null;

    // Check host
    if (
      await hostPage
        .getByRole("heading", { name: "Prove Your Worth" })
        .isVisible({ timeout: 2000 })
    ) {
      quizPage = hostPage;
    } else if (
      await hostPage.getByText("Distribute 3 Guns").isVisible({ timeout: 2000 })
    ) {
      cultLeaderPage = hostPage;
    }

    // Check other players
    for (const p of players) {
      if (
        !quizPage &&
        (await p.page
          .getByRole("heading", { name: "Prove Your Worth" })
          .isVisible({ timeout: 1000 }))
      ) {
        quizPage = p.page;
      }
      if (
        !cultLeaderPage &&
        (await p.page
          .getByText("Distribute 3 Guns")
          .isVisible({ timeout: 1000 }))
      ) {
        cultLeaderPage = p.page;
      }
    }

    // If we found a quiz page, answer it
    if (quizPage) {
      await quizPage.getByRole("button", { name: /^A\./ }).click();
    } else {
      // Should not happen in a valid game of 5 players
      console.warn(
        "No player saw the quiz view - check role distribution logic",
      );
    }

    // If we found a cult leader page, distribute guns (optional for test completion but good for coverage)
    if (cultLeaderPage) {
      // Just verify the distribution UI works by clicking a plus button
      // Logic to find a valid plus button
      const plusButton = cultLeaderPage
        .locator("button")
        .filter({ has: cultLeaderPage.locator("svg.lucide-plus") })
        .first();
      if (await plusButton.isVisible()) {
        await plusButton.click();
      }
    }

    // 9. Wait for completion (30 seconds)
    await hostPage.waitForTimeout(31000);

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
    await expect(hostPage.getByText("Crew Manifest")).toBeVisible({
      timeout: 15000,
    });

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
      await expect(page.getByText("Crew Manifest")).toBeVisible({
        timeout: 15000,
      });
      players.push({ context, page, name: playerName });
    }

    // 3. Start game
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    await expect(hostPage.getByText("Crew Manifest")).toBeVisible({
      timeout: 15000,
    });

    // 4. Navigate to Guns Stash
    await hostPage.getByText("Cult's Guns Stash").click();
    await expect(
      hostPage.getByRole("heading", { name: "Cult's Guns Stash" }),
    ).toBeVisible({
      timeout: 15000,
    });

    // 4.1. Verify all players are in guns stash
    for (const p of players) {
      await expect(
        p.page.getByRole("heading", { name: "Cult's Guns Stash" }),
      ).toBeVisible({
        timeout: 15000,
      });
    }

    // 5. Cancel
    await hostPage.getByRole("button", { name: "Cancel" }).click();

    // 6. Verify Cancellation Modal appears first (obscuring Crew Manifest)
    await expect(
      hostPage.getByText("The ritual was interrupted!"),
    ).toBeVisible();

    // 6.1. Verify all players see the modal
    for (const p of players) {
      await expect(
        p.page.getByText("The ritual was interrupted!"),
      ).toBeVisible();
    }

    // 7. Dismiss Modal on Host
    await hostPage.getByRole("button", { name: "Done" }).click();

    // 7.1 Verify Modal is gone
    await expect(
      hostPage.getByText("The ritual was interrupted!"),
    ).toBeHidden();

    // 8. Verify Redirect to /game (GameView visible)
    await expect(hostPage.getByTestId("game-view")).toBeVisible({
      timeout: 10000,
    });

    // 8.1 Dismiss for other players
    for (const p of players) {
      await p.page.getByRole("button", { name: "Done" }).click();

      await expect(p.page.getByTestId("game-view")).toBeVisible({
        timeout: 10000,
      });
    }

    // Cleanup
    await hostContext.close();
    for (const p of players) {
      await p.context.close();
    }
  });

  test("One-Time Use Restriction", async ({ browser }) => {
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
      await expect(page.getByText("Crew Manifest")).toBeVisible({
        timeout: 15000,
      });
      players.push({ context, page, name: playerName });
    }

    // 3. Start game
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    await expect(hostPage.getByText("Crew Manifest")).toBeVisible({
      timeout: 15000,
    });

    // 4. Navigate to Guns Stash
    await hostPage.getByText("Cult's Guns Stash").click();
    await expect(
      hostPage.getByRole("heading", { name: "Cult's Guns Stash" }),
    ).toBeVisible({
      timeout: 15000,
    });

    // 5. All players confirm ready
    for (const p of players) {
      await expect(
        p.page.getByRole("heading", { name: "Cult's Guns Stash" }),
      ).toBeVisible({ timeout: 15000 });
      const readyButton = p.page.getByRole("button", { name: "I'm Ready" });
      await expect(readyButton).toBeVisible({ timeout: 5000 });
      await readyButton.click();
    }

    // 6. Wait for completion (30 seconds)
    await hostPage.waitForTimeout(33000);

    // 7. Verify COMPLETED state and dismiss
    await expect(
      hostPage.getByRole("heading", { name: "Ritual Complete" }),
    ).toBeVisible({ timeout: 5000 });

    // Click Return to Ship for all players
    for (const p of [...players, { page: hostPage }]) {
      const returnBtn = p.page.getByText("Return to Ship");
      if (await returnBtn.isVisible().catch(() => false)) {
        await returnBtn.click();
      }
    }

    // 8. Verify one-time use restriction - button shows "(Used)"
    await expect(hostPage.getByTestId("game-view")).toBeVisible({
      timeout: 10000,
    });

    const gunsStashLink = hostPage.getByRole("button", {
      name: "Cult's Guns Stash (Used)",
    });
    await expect(gunsStashLink).toBeVisible();
    await expect(gunsStashLink).toHaveClass(/bg-slate-800\/50/);

    // Clicking it should trigger an alert (already used)
    hostPage.once("dialog", (dialog) => dialog.accept());
    await gunsStashLink.click({ noWaitAfter: true });

    // After dismissing alert, should stay on game view
    await expect(hostPage.getByTestId("game-view")).toBeVisible();

    // Cleanup
    await hostContext.close();
    for (const p of players) {
      await p.context.close();
    }
  });
});
