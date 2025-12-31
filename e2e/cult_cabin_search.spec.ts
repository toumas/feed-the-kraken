import { expect, test } from "@playwright/test";
import { completeIdentifyPage } from "./helpers";

test.describe("Cult Cabin Search Flow", () => {
  test.setTimeout(120000); // Longer timeout for 4 players and cabin search

  test("Complete Cabin Search Flow", async ({ browser }) => {
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

    // 4. Navigate to Cabin Search
    await hostPage.getByRole("button", { name: "Cabin Search (Cult)" }).click();
    await expect(hostPage).toHaveURL(/\/cult-cabin-search/, { timeout: 15000 });

    // 5. Wait for SETUP view to load
    await expect(
      hostPage.getByRole("heading", { name: "Cabin Search (Cult)" }),
    ).toBeVisible();
    await expect(
      hostPage.getByRole("heading", { name: "Choose Your Role" }),
    ).toBeVisible();

    // 6. Players are auto-redirected to cabin search when host initiates
    for (const p of players) {
      await expect(p.page).toHaveURL(/\/cult-cabin-search/, { timeout: 15000 });
    }

    // 7. Players claim roles
    // Host claims Captain
    await hostPage.getByRole("button", { name: "Captain" }).click();
    await expect(hostPage.getByText("Waiting for others...")).toBeVisible();

    // Player 1 claims Navigator
    await players[0].page.getByRole("button", { name: "Navigator" }).click();
    await expect(
      players[0].page.getByText("Waiting for others..."),
    ).toBeVisible();

    // Player 2 claims Lieutenant
    await players[1].page.getByRole("button", { name: "Lieutenant" }).click();
    await expect(
      players[1].page.getByText("Waiting for others..."),
    ).toBeVisible();

    // Player 3 claims Crew Member (triggers transition to ACTIVE)
    await players[2].page.getByRole("button", { name: "Crew Member" }).click();
    await expect(
      players[2].page.getByText("Waiting for others..."),
    ).toBeVisible();

    // Player 4 claims Crew Member (triggers transition to ACTIVE)
    await players[3].page.getByRole("button", { name: "Crew Member" }).click();

    // 8. Verify transition to ACTIVE state
    // Everyone should see the timer indicating active phase
    await expect(hostPage.locator("text=/\\d+:\\d{2}/")).toBeVisible({
      timeout: 10000,
    });

    // 9. Verify all players are in active phase
    // Depending on game role, players see either:
    // - "Revealed Roles" (if Cult Leader viewing)
    // - "Crew Quiz" / "Prove Your Worth" (if crew member taking quiz)
    // Just verify the page has transitioned by checking for timer or active state elements
    for (const p of players) {
      // Each player should either see quiz or revealed roles
      const hasQuiz = await p.page
        .getByRole("heading", { name: "Crew Quiz" })
        .isVisible()
        .catch(() => false);
      const hasRevealed = await p.page
        .getByText("Revealed Roles")
        .isVisible()
        .catch(() => false);
      const hasTimer = await p.page
        .locator("text=/\\d+:\\d{2}/")
        .isVisible()
        .catch(() => false);
      expect(hasQuiz || hasRevealed || hasTimer).toBe(true);
    }

    // If any player has quiz, answer it
    for (const p of players) {
      const quizButton = p.page.getByRole("button", { name: /^A\./ });
      if (await quizButton.isVisible().catch(() => false)) {
        await quizButton.click();
      }
    }

    // Cleanup
    await hostContext.close();
    for (const p of players) {
      await p.context.close();
    }
  });

  test("Unique Role Constraints", async ({ browser }) => {
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
    for (const p of players) {
      await expect(p.page).toHaveURL(/\/game/);
    }

    // 4. Navigate to Cabin Search
    await hostPage.getByRole("button", { name: "Cabin Search (Cult)" }).click();
    await expect(hostPage).toHaveURL(/\/cult-cabin-search/);

    for (const p of players) {
      await expect(p.page).toHaveURL(/\/cult-cabin-search/);
    }

    // 5. Host claims Captain
    await hostPage.getByRole("button", { name: "Captain" }).click();
    await expect(hostPage.getByText("Waiting for others...")).toBeVisible();

    // 6. Verify Player 1 sees Captain as claimed in role selection view
    // After Host claims Captain, Player 1 should see it as "Claimed by Host"
    await expect(
      players[0].page.getByRole("button", {
        name: /Captain.*Claimed|Claimed.*Host/i,
      }),
    ).toBeVisible({ timeout: 10000 });

    // Cleanup
    await hostContext.close();
    for (const p of players) {
      await p.context.close();
    }
  });

  test("Role Validation Logic", async ({ browser }) => {
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

    // 4. Navigate to Cabin Search
    await hostPage.getByRole("button", { name: "Cabin Search (Cult)" }).click();

    for (const p of players) {
      await expect(p.page).toHaveURL(/\/cult-cabin-search/);
    }

    // 5. Select INVALID roles (e.g. Host=Captain, Player1=Captain, Player2=Crew)
    // Actually, Captain is unique so Player 1 can't select it if Host has.
    // Let's do: Host=Captain, Player1=Crew, Player2=Crew (Missing Navigator/Lieutenant)

    // Host claims Captain
    await hostPage.getByRole("button", { name: "Captain" }).click();

    // All players claim Crew
    for (const p of players) {
      await p.page.getByRole("button", { name: "Crew Member" }).click();
    }

    // 6. Verify cancellation redirect and modal
    // Everyone should be redirected to /game
    await expect(hostPage).toHaveURL(/\/game/, { timeout: 10000 });

    // Check for Cancellation Modal with Reason
    await expect(
      hostPage.getByText("The search was interrupted!"),
    ).toBeVisible();
    await expect(hostPage.getByText(/Invalid role distribution/)).toBeVisible();

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

    // 4. Navigate to Cabin Search
    await hostPage.getByRole("button", { name: "Cabin Search (Cult)" }).click();
    await expect(hostPage).toHaveURL(/\/cult-cabin-search/);

    // 4.1. Verify that all players are in cabin search
    for (const p of players) {
      await expect(p.page).toHaveURL(/\/cult-cabin-search/);
    }

    // 5. Cancel
    await hostPage.getByRole("button", { name: "Cancel" }).click();

    // 6. Verify Redirect
    await expect(hostPage).toHaveURL(/\/game/, { timeout: 10000 });

    // 6.1. Verify that all players are in game
    for (const p of players) {
      await expect(p.page).toHaveURL(/\/game/);
    }

    // 7. Verify Modal
    await expect(
      hostPage.getByText("The search was interrupted!"),
    ).toBeVisible();
    await expect(
      hostPage.getByRole("button", { name: "Done" }).first(),
    ).toBeVisible();

    // 7.1. Verify that all players see the modal
    for (const p of players) {
      await expect(
        p.page.getByText("The search was interrupted!"),
      ).toBeVisible();
      await expect(
        p.page.getByRole("button", { name: "Done" }).first(),
      ).toBeVisible();
    }

    // Cleanup
    await hostContext.close();
    for (const p of players) {
      await p.context.close();
    }
  });
});
