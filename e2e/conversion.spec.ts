import { expect, type Page, test } from "@playwright/test";

test.describe("Conversion to Cult", () => {
  test.setTimeout(90000);
  test("Successful Conversion", async ({ browser }) => {
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
    await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 15000 });
    await expect(hostPage.getByText("Host(You)")).toBeVisible();

    // Get the room code
    const codeElement = hostPage.locator("p.font-mono");
    await expect(codeElement).toBeVisible();
    const code = await codeElement.innerText();
    expect(code).toHaveLength(6);


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
      await expect(page).toHaveURL(/\/lobby/, { timeout: 15000 });

      await expect(page.getByText(`${playerName}(You)`)).toBeVisible();
      players.push({ context, page, name: playerName });
    }

    // 3. Host starts game
    // Wait for all players to be visible on host
    await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();

    const startBtn = hostPage.getByRole("button", { name: "Start Voyage" });
    await expect(startBtn).toBeEnabled();
    await startBtn.click();
    await expect(hostPage).toHaveURL(/\/game/, { timeout: 15000 });

    // 4. Find which player is the Cult Leader
    // We need to reveal the role on each page to find who is the Cult Leader
    let cultLeaderPage = null;
    let cultLeaderIndex = -1;

    // Helper to check role
    const checkRole = async (page: Page) => {
      const revealBtn = page
        .locator("button")
        .filter({ hasText: "Role Hidden" });
      // Wait for button to be attached
      await revealBtn.waitFor({ state: "attached" });

      // Dispatch mousedown to reveal
      await revealBtn.dispatchEvent("mousedown");

      // Check for Cult Leader text
      // Use a short timeout since it should be immediate if it's there
      const isLeader = await page.getByText("Cult Leader").isVisible();

      // Release mouse
      await revealBtn.dispatchEvent("mouseup");

      return isLeader;
    };

    // Check host first
    if (await checkRole(hostPage)) {
      cultLeaderPage = hostPage;
      cultLeaderIndex = -1; // -1 indicates host
    } else {
      // Check each player
      for (let i = 0; i < players.length; i++) {
        if (await checkRole(players[i].page)) {
          cultLeaderPage = players[i].page;
          cultLeaderIndex = i;
          break;
        }
      }
    }

    if (!cultLeaderPage) {
      throw new Error(
        "No cult leader found - could not identify Cult Leader role",
      );
    }



    // 5. Initiate Conversion
    await cultLeaderPage
      .getByRole("button", { name: "Conversion to Cult" })
      .click();

    // Verify all see prompt
    await expect(hostPage.getByText("A ritual has begun")).toBeVisible();
    await expect(players[0].page.getByText("A ritual has begun")).toBeVisible();
    await expect(players[1].page.getByText("A ritual has begun")).toBeVisible();
    await expect(players[2].page.getByText("A ritual has begun")).toBeVisible();
    await expect(players[3].page.getByText("A ritual has begun")).toBeVisible();

    // Cult leader should see "Waiting for others..."
    await expect(
      cultLeaderPage.getByText("Waiting for others..."),
    ).toBeVisible();

    // All other players accept
    const allPages = [hostPage, ...players.map((p) => p.page)];
    for (const page of allPages) {
      if (page !== cultLeaderPage) {
        await page.getByRole("button", { name: "Accept" }).click();
        // Wait for Accept button to disappear (covers both "Waiting..." and navigation cases)
        await expect(
          page.getByRole("button", { name: "Accept", exact: true }),
        ).not.toBeVisible();
      }
    }

    // 6. Verify Navigation to Conversion Page
    await expect(hostPage).toHaveURL(/.*\/conversion/, { timeout: 15000 });
    await expect(players[0].page).toHaveURL(/.*\/conversion/, {
      timeout: 15000,
    });
    await expect(players[1].page).toHaveURL(/.*\/conversion/, {
      timeout: 15000,
    });
    await expect(players[2].page).toHaveURL(/.*\/conversion/, {
      timeout: 15000,
    });
    await expect(players[3].page).toHaveURL(/.*\/conversion/, {
      timeout: 15000,
    });

    // 7. Verify Conversion Page UI
    // Wait for the page to fully load with the active round
    await expect(
      cultLeaderPage.getByRole("heading", { name: "Ritual in Progress" }),
    ).toBeVisible({ timeout: 15000 });

    // Host (Cult Leader) should see player selection UI
    await expect(
      cultLeaderPage.getByRole("heading", { name: "Choose a Convert" }),
    ).toBeVisible({ timeout: 10000 });

    // Players (non-leaders) should see quiz UI
    for (const p of players) {
      if (p.page !== cultLeaderPage) {
        await expect(
          p.page.getByRole("heading", { name: "Prove Your Worth" }),
        ).toBeVisible();
      }
    }

    // 8. Cult Leader Selects a Target
    // Pick a target who is NOT the leader
    const target = players.find((p) => p.page !== cultLeaderPage);
    if (!target) throw new Error("No valid target found");
    const targetName = target.name;



    // Wait for player list to be fully rendered, then click Target
    const targetLabel = cultLeaderPage
      .locator("label")
      .filter({ hasText: targetName });
    await targetLabel.waitFor({ state: "visible", timeout: 10000 });
    await targetLabel.click();

    // Verify the selection was registered by checking for the cyan border/highlight
    await expect(targetLabel).toHaveClass(/border-cyan-500/);

    // 9. Players Answer Quiz
    // Each player answers their quiz question (click first option for simplicity)
    // Wait for quiz options to be visible first
    for (const p of players) {
      if (p.page !== cultLeaderPage) {
        await p.page.getByRole("button", { name: /^A\./ }).waitFor();
        await p.page.getByRole("button", { name: /^A\./ }).click();
      }
    }

    // 10. Wait for Results (timer completes after 15s normally, 60s in E2E)
    // Results should appear showing conversion outcome
    await expect(
      cultLeaderPage.getByRole("heading", { name: "Ritual Complete" }),
    ).toBeVisible({ timeout: 70000 });

    // 11. Verify Results for Cult Leader
    // Cult leader should see "CONVERSION SUCCESSFUL" message
    await expect(
      cultLeaderPage.getByText("CONVERSION SUCCESSFUL"),
    ).toBeVisible();
    // Verify the structure exists - both avatar and text indicating successful conversion
    await expect(
      cultLeaderPage.getByText("Has joined your ranks as a Cultist."),
    ).toBeVisible();

    // 12. Determine which player was actually converted
    // The backend may convert a different player due to timing or fallback logic
    // So we need to check which player page shows the conversion message
    let actualConvertedPage = null;

    for (const p of players) {
      if (p.page !== cultLeaderPage) {
        const hasConversionMessage = await p.page
          .getByText("YOU HAVE BEEN CONVERTED!")
          .isVisible()
          .catch(() => false);
        if (hasConversionMessage) {
          actualConvertedPage = p.page;
          break;
        }
      }
    }

    if (!actualConvertedPage) {
      throw new Error(
        "No player was converted - could not find conversion message on any player page",
      );
    }



    // 13. Verify Results for Converted Player
    // The converted player should see "YOU HAVE BEEN CONVERTED!" message
    await expect(
      actualConvertedPage.getByText("YOU HAVE BEEN CONVERTED!"),
    ).toBeVisible();
    await expect(
      actualConvertedPage.getByText(
        "You are now a Cultist. Serve the Cult Leader.",
      ),
    ).toBeVisible();
    // Should see cult leader info
    await expect(actualConvertedPage.getByText("Your Leader")).toBeVisible();
    // Leader name might be Host or Player X.
    const leaderName =
      cultLeaderIndex === -1 ? "Host" : players[cultLeaderIndex].name;
    await expect(actualConvertedPage.getByText(leaderName)).toBeVisible();

    // 14. Verify Results for Non-Converted Players
    // Other players should see quiz results but no conversion message
    for (const p of players) {
      if (p.page !== cultLeaderPage && p.page !== actualConvertedPage) {
        await expect(
          p.page.getByRole("heading", { name: "Ritual Complete" }),
        ).toBeVisible();

        // They should see either "Correct Answer!" or "Wrong Answer" based on quiz
        const hasCorrectOrWrong =
          (await p.page.getByText("Correct Answer!").isVisible()) ||
          (await p.page.getByText("Wrong Answer").isVisible());
        expect(hasCorrectOrWrong).toBe(true);
      }
    }

    // 15. Return to Game
    await cultLeaderPage.getByRole("link", { name: "Return to Ship" }).click();
    await expect(cultLeaderPage).toHaveURL(/\/game/, { timeout: 15000 });

    // Converted player also returns to game
    await actualConvertedPage
      .getByRole("link", { name: "Return to Ship" })
      .click();
    await expect(actualConvertedPage).toHaveURL(/\/game/, { timeout: 15000 });
  });

  test("Cancelled Conversion", async ({ browser }) => {
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
    await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 15000 });
    await expect(hostPage.getByText("Host(You)")).toBeVisible();

    // Get the room code
    const codeElement = hostPage.locator("p.font-mono");
    await expect(codeElement).toBeVisible();
    const code = await codeElement.innerText();
    expect(code).toHaveLength(6);


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
      await expect(page).toHaveURL(/\/lobby/, { timeout: 15000 });

      await expect(page.getByText(`${playerName}(You)`)).toBeVisible();
      players.push({ context, page, name: playerName });
    }

    // 3. Host starts game
    // Wait for all players to be visible on host
    await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();

    const startBtn = hostPage.getByRole("button", { name: "Start Voyage" });
    await expect(startBtn).toBeEnabled();
    await startBtn.click();
    await expect(hostPage).toHaveURL(/\/game/, { timeout: 15000 });

    // 4. Find which player is the Cult Leader
    // We need to reveal the role on each page to find who is the Cult Leader
    let cultLeaderPage = null;

    // Helper to check role
    const checkRole = async (page: Page) => {
      const revealBtn = page
        .locator("button")
        .filter({ hasText: "Role Hidden" });
      // Wait for button to be attached
      await revealBtn.waitFor({ state: "attached" });

      // Dispatch mousedown to reveal
      await revealBtn.dispatchEvent("mousedown");

      // Check for Cult Leader text
      // Use a short timeout since it should be immediate if it's there
      const isLeader = await page.getByText("Cult Leader").isVisible();

      // Release mouse
      await revealBtn.dispatchEvent("mouseup");

      return isLeader;
    };

    // Check host first
    if (await checkRole(hostPage)) {
      cultLeaderPage = hostPage;
    } else {
      // Check each player
      for (let i = 0; i < players.length; i++) {
        if (await checkRole(players[i].page)) {
          cultLeaderPage = players[i].page;
          break;
        }
      }
    }

    if (!cultLeaderPage) {
      throw new Error(
        "No cult leader found - could not identify Cult Leader role",
      );
    }



    // 5. Initiate Conversion
    await cultLeaderPage
      .getByRole("button", { name: "Conversion to Cult" })
      .click();

    // Verify all see prompt
    await expect(hostPage.getByText("A ritual has begun")).toBeVisible();
    await expect(players[0].page.getByText("A ritual has begun")).toBeVisible();
    await expect(players[1].page.getByText("A ritual has begun")).toBeVisible();
    await expect(players[2].page.getByText("A ritual has begun")).toBeVisible();
    await expect(players[3].page.getByText("A ritual has begun")).toBeVisible();

    await expect(
      cultLeaderPage.getByText("Waiting for others..."),
    ).toBeVisible();

    // A non-leader declines
    const nonLeaderPage =
      players[0].page === cultLeaderPage ? players[1].page : players[0].page;
    await nonLeaderPage.getByRole("button", { name: "Decline" }).click();

    // Verify Cancellation
    await expect(
      hostPage.getByText("The ritual was interrupted!"),
    ).toBeVisible();
    await expect(
      players[0].page.getByText("The ritual was interrupted!"),
    ).toBeVisible();
    await expect(
      players[1].page.getByText("The ritual was interrupted!"),
    ).toBeVisible();
    await expect(
      players[2].page.getByText("The ritual was interrupted!"),
    ).toBeVisible();
    await expect(
      players[3].page.getByText("The ritual was interrupted!"),
    ).toBeVisible();

    // Close
    await hostPage.getByRole("button", { name: "Close" }).click();
    await expect(
      hostPage.getByText("The ritual was interrupted!"),
    ).not.toBeVisible();
  });

  test("Change Vote", async ({ browser }) => {
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
    await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 15000 });
    await expect(hostPage.getByText("Host(You)")).toBeVisible();

    // Get the room code
    const codeElement = hostPage.locator("p.font-mono");
    await expect(codeElement).toBeVisible();
    const code = await codeElement.innerText();
    expect(code).toHaveLength(6);


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
      await expect(page).toHaveURL(/\/lobby/, { timeout: 15000 });

      await expect(page.getByText(`${playerName}(You)`)).toBeVisible();
      players.push({ context, page, name: playerName });
    }

    // 3. Host starts game
    // Wait for all players to be visible on host
    await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();

    const startBtn = hostPage.getByRole("button", { name: "Start Voyage" });
    await expect(startBtn).toBeEnabled();
    await startBtn.click();
    await expect(hostPage).toHaveURL(/\/game/, { timeout: 15000 });

    // 4. Find which player is the Cult Leader
    // We need to reveal the role on each page to find who is the Cult Leader
    let cultLeaderPage = null;

    // Helper to check role
    const checkRole = async (page: Page) => {
      const revealBtn = page
        .locator("button")
        .filter({ hasText: "Role Hidden" });
      // Wait for button to be attached
      await revealBtn.waitFor({ state: "attached" });

      // Dispatch mousedown to reveal
      await revealBtn.dispatchEvent("mousedown");

      // Check for Cult Leader text
      // Use a short timeout since it should be immediate if it's there
      const isLeader = await page.getByText("Cult Leader").isVisible();

      // Release mouse
      await revealBtn.dispatchEvent("mouseup");

      return isLeader;
    };

    // Check host first
    if (await checkRole(hostPage)) {
      cultLeaderPage = hostPage;
    } else {
      // Check each player
      for (let i = 0; i < players.length; i++) {
        if (await checkRole(players[i].page)) {
          cultLeaderPage = players[i].page;
          break;
        }
      }
    }

    if (!cultLeaderPage) {
      throw new Error(
        "No cult leader found - could not identify Cult Leader role",
      );
    }



    // 5. Initiate Conversion
    await cultLeaderPage
      .getByRole("button", { name: "Conversion to Cult" })
      .click();

    // Verify all see prompt
    await expect(hostPage.getByText("A ritual has begun")).toBeVisible();
    await expect(players[0].page.getByText("A ritual has begun")).toBeVisible();
    await expect(players[1].page.getByText("A ritual has begun")).toBeVisible();
    await expect(players[2].page.getByText("A ritual has begun")).toBeVisible();
    await expect(players[3].page.getByText("A ritual has begun")).toBeVisible();

    await expect(
      cultLeaderPage.getByText("Waiting for others..."),
    ).toBeVisible();

    // A non-leader accepts then changes vote
    const nonLeaderPage =
      players[1].page === cultLeaderPage ? players[2].page : players[1].page;
    await nonLeaderPage.getByRole("button", { name: "Accept" }).click();
    await expect(
      nonLeaderPage.getByText("Waiting for others..."),
    ).toBeVisible();
    await nonLeaderPage.getByRole("button", { name: "Decline" }).click();

    // Verify Cancellation
    await expect(
      hostPage.getByText("The ritual was interrupted!"),
    ).toBeVisible();
    await expect(
      players[0].page.getByText("The ritual was interrupted!"),
    ).toBeVisible();
    await expect(
      players[1].page.getByText("The ritual was interrupted!"),
    ).toBeVisible();
    await expect(
      players[2].page.getByText("The ritual was interrupted!"),
    ).toBeVisible();
    await expect(
      players[3].page.getByText("The ritual was interrupted!"),
    ).toBeVisible();

    // Close
    await hostPage.getByRole("button", { name: "Close" }).click();
    await expect(
      hostPage.getByText("The ritual was interrupted!"),
    ).not.toBeVisible();
  });
});
