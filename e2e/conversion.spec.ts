import { expect, type Page, test } from "@playwright/test";
import { completeIdentifyPage, identifyRole } from "./helpers";

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
    await completeIdentifyPage(hostPage);
    await expect(hostPage.getByText("Crew Manifest")).toBeVisible({
      timeout: 15000,
    });
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
      await completeIdentifyPage(page);
      await expect(page.getByText("Crew Manifest")).toBeVisible({
        timeout: 15000,
      });

      await expect(page.getByText(`${playerName}(You)`)).toBeVisible();
      players.push({ context, page, name: playerName });
    }

    // 3. Host starts game
    // Wait for all players to be visible on host
    await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();

    const startBtn = hostPage.getByRole("button", { name: "Start Voyage" });
    await expect(startBtn).toBeEnabled();
    await startBtn.click();
    await expect(hostPage.getByText("Crew Manifest")).toBeVisible({
      timeout: 15000,
    });

    // 4. Find which player is the Cult Leader
    // We need to reveal the role on each page to find who is the Cult Leader
    let cultLeaderPage: Page | null = null;
    let cultLeaderIndex = -1;

    // Check host first
    const hostRole = await identifyRole(hostPage);
    if (hostRole === "CULT_LEADER") {
      cultLeaderPage = hostPage;
      cultLeaderIndex = -1; // -1 indicates host
    } else {
      // Check each player
      for (let i = 0; i < players.length; i++) {
        const role = await identifyRole(players[i].page);
        if (role === "CULT_LEADER") {
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
    await expect(hostPage.getByText("Ritual in Progress")).toBeVisible({
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

    // Wait for player list to be fully rendered, then click Target - scope to conversion modal
    const conversionModal = cultLeaderPage
      .locator("div")
      .filter({ hasText: "Choose a Convert" })
      .filter({ has: cultLeaderPage.locator("h2") });
    const targetLabel = conversionModal
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
        // Wait for the page to fully load (check that we're not stuck on "Loading game...")
        await expect(
          p.page.getByRole("heading", { name: "Prove Your Worth" }),
        ).toBeVisible({ timeout: 15000 });
        // Wait for quiz answer option A to be visible
        await p.page
          .getByRole("button", { name: /^A\./ })
          .waitFor({ state: "visible", timeout: 15000 });
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
    // Leader name might be Host or Player X - scope to the Your Leader section
    const leaderName =
      cultLeaderIndex === -1 ? "Host" : players[cultLeaderIndex].name;
    const yourLeaderSection = actualConvertedPage
      .locator("div")
      .filter({ hasText: "Your Leader" })
      .last();
    await expect(yourLeaderSection.getByText(leaderName)).toBeVisible();

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

    // 15. All players except one Return to Game
    for (const page of allPages) {
      if (page !== actualConvertedPage) {
        await page.getByText("Return to Ship", { exact: true }).click();
        await expect(page).toHaveURL(/\/game/, { timeout: 15000 });
      }
    }

    // 15a. Verify Cult Leader sees "Your Converts" section with the converted player
    // First, reveal the role again to see the "Your Converts" section
    const revealButton = cultLeaderPage.getByText(
      "Tap 5 times to reveal your role.",
    );
    for (let i = 0; i < 5; i++) {
      await revealButton.click();
    }
    // Verify "Your Converts" section is visible
    await expect(cultLeaderPage.getByText("Your Converts")).toBeVisible();
    // Verify the converted player's name appears in the section
    const yourConvertsSection = cultLeaderPage
      .locator("div")
      .filter({ hasText: "Your Converts" })
      .last();
    // Find which player was actually converted (their page is actualConvertedPage)
    const convertedPlayerName = players.find(
      (p) => p.page === actualConvertedPage,
    )?.name;
    if (convertedPlayerName) {
      await expect(
        yourConvertsSection.getByText(convertedPlayerName),
      ).toBeVisible();
    }
    // Hide the role again by tapping once
    await cultLeaderPage.getByText("Tap once to hide your role.").click();

    // ==========================================
    // SECOND CONVERSION
    // ==========================================

    // 16. Initiate Second Conversion
    await cultLeaderPage
      .getByRole("button", { name: "Conversion to Cult" })
      .click();

    // All other players accept again
    for (const page of allPages) {
      if (page !== cultLeaderPage) {
        await expect(page.getByText("A ritual has begun")).toBeVisible();
        await page.getByRole("button", { name: "Accept" }).click();
        await expect(
          page.getByRole("button", { name: "Accept", exact: true }),
        ).not.toBeVisible();
      }
    }

    // 18. Verify Conversion Page UI (second time)
    await expect(
      cultLeaderPage.getByRole("heading", { name: "Ritual in Progress" }),
    ).toBeVisible({ timeout: 15000 });

    await expect(
      cultLeaderPage.getByRole("heading", { name: "Choose a Convert" }),
    ).toBeVisible({ timeout: 15000 });

    // 19. Cult Leader Selects a Different Target (not the already-converted player)
    // Find a player who is not the cult leader and was not converted in the first round
    const secondTarget = players.find(
      (p) => p.page !== cultLeaderPage && p.page !== actualConvertedPage,
    );
    if (!secondTarget) throw new Error("No valid second target found");
    const secondTargetName = secondTarget.name;

    const secondConversionModal = cultLeaderPage
      .locator("div")
      .filter({ hasText: "Choose a Convert" })
      .filter({ has: cultLeaderPage.locator("h2") });
    const secondTargetLabel = secondConversionModal
      .locator("label")
      .filter({ hasText: secondTargetName });
    // Wait longer for player list to populate - may need time after round transition
    await secondTargetLabel.waitFor({ state: "visible", timeout: 20000 });
    await secondTargetLabel.click();

    await expect(secondTargetLabel).toHaveClass(/border-cyan-500/);

    // 20. Non-cult players Answer Quiz (second round)
    // Note: The converted player from round 1 is now a cultist, they don't get a quiz
    for (const p of players) {
      if (p.page !== cultLeaderPage && p.page !== actualConvertedPage) {
        await expect(
          p.page.getByRole("heading", { name: "Prove Your Worth" }),
        ).toBeVisible({ timeout: 15000 });
        await p.page
          .getByRole("button", { name: /^A\./ })
          .waitFor({ state: "visible", timeout: 15000 });
        await p.page.getByRole("button", { name: /^A\./ }).click();
      }
    }

    // 21. Wait for Second Results
    await expect(
      cultLeaderPage.getByRole("heading", { name: "Ritual Complete" }),
    ).toBeVisible({ timeout: 70000 });

    // 22. Verify Second Conversion Success
    await expect(
      cultLeaderPage.getByText("CONVERSION SUCCESSFUL"),
    ).toBeVisible();

    // 23. Find which player was converted in second round
    let secondConvertedPage = null;

    for (const p of players) {
      if (p.page !== cultLeaderPage && p.page !== actualConvertedPage) {
        const hasConversionMessage = await p.page
          .getByText("YOU HAVE BEEN CONVERTED!")
          .isVisible()
          .catch(() => false);
        if (hasConversionMessage) {
          secondConvertedPage = p.page;
          break;
        }
      }
    }

    if (!secondConvertedPage) {
      throw new Error(
        "No player was converted in second round - could not find conversion message on any player page",
      );
    }

    // 24. Verify Second Conversion Results
    await expect(
      secondConvertedPage.getByText("YOU HAVE BEEN CONVERTED!"),
    ).toBeVisible();
    await expect(
      secondConvertedPage.getByText(
        "You are now a Cultist. Serve the Cult Leader.",
      ),
    ).toBeVisible();

    // 25. Return to Game (second time)
    await cultLeaderPage.getByText("Return to Ship", { exact: true }).click();
    await expect(cultLeaderPage).toHaveURL(/\/game/, { timeout: 15000 });

    await secondConvertedPage
      .getByText("Return to Ship", { exact: true })
      .click();
    await expect(secondConvertedPage).toHaveURL(/\/game/, { timeout: 15000 });

    // 26. Verify Cult Leader sees both converted players in "Your Converts" section
    const finalRevealButton = cultLeaderPage.getByText(
      "Tap 5 times to reveal your role.",
    );
    for (let i = 0; i < 5; i++) {
      await finalRevealButton.click();
    }
    await expect(cultLeaderPage.getByText("Your Converts")).toBeVisible();
    const finalConvertsSection = cultLeaderPage
      .locator("div")
      .filter({ hasText: "Your Converts" })
      .last();
    // Both converted players should be visible
    const firstConvertedName = players.find(
      (p) => p.page === actualConvertedPage,
    )?.name;
    const secondConvertedName = players.find(
      (p) => p.page === secondConvertedPage,
    )?.name;
    if (firstConvertedName) {
      await expect(
        finalConvertsSection.getByText(firstConvertedName),
      ).toBeVisible();
    }
    if (secondConvertedName) {
      await expect(
        finalConvertsSection.getByText(secondConvertedName),
      ).toBeVisible();
    }
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
    await completeIdentifyPage(hostPage);
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
      await completeIdentifyPage(page);
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
    let cultLeaderPage: Page | null = null;

    // Check host first
    const hostRole = await identifyRole(hostPage);
    if (hostRole === "CULT_LEADER") {
      cultLeaderPage = hostPage;
    } else {
      // Check each player
      for (let i = 0; i < players.length; i++) {
        const role = await identifyRole(players[i].page);
        if (role === "CULT_LEADER") {
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
    await hostPage.getByRole("button", { name: "Done" }).click();
    await expect(
      hostPage.getByText("The ritual was interrupted!"),
    ).not.toBeVisible();
  });

  test("Cancel after accepting", async ({ browser }) => {
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
      await completeIdentifyPage(page);
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
    let cultLeaderPage: Page | null = null;

    // Check host first
    const hostRole = await identifyRole(hostPage);
    if (hostRole === "CULT_LEADER") {
      cultLeaderPage = hostPage;
    } else {
      // Check each player
      for (let i = 0; i < players.length; i++) {
        const role = await identifyRole(players[i].page);
        if (role === "CULT_LEADER") {
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
    await hostPage.getByRole("button", { name: "Done" }).click();
    await expect(
      hostPage.getByText("The ritual was interrupted!"),
    ).not.toBeVisible();
  });

  test("Quiz Feedback Display", async ({ browser }) => {
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
      await expect(page.getByText(`${playerName}(You)`)).toBeVisible();
      players.push({ context, page, name: playerName });
    }

    // 3. Start Game
    await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    await expect(hostPage).toHaveURL(/\/game/, { timeout: 15000 });

    // 4. Identify Cult Leader
    let cultLeaderPage: Page | null = null;
    const hostRole = await identifyRole(hostPage);
    if (hostRole === "CULT_LEADER") {
      cultLeaderPage = hostPage;
    } else {
      for (const p of players) {
        if ((await identifyRole(p.page)) === "CULT_LEADER") {
          cultLeaderPage = p.page;
          break;
        }
      }
    }
    if (!cultLeaderPage) throw new Error("Cult Leader not found");

    // 5. Start Conversion
    await cultLeaderPage
      .getByRole("button", { name: "Conversion to Cult" })
      .click();

    // 6. All Accept
    const allPages = [hostPage, ...players.map((p) => p.page)];
    for (const page of allPages) {
      if (page !== cultLeaderPage) {
        await page.getByRole("button", { name: "Accept" }).click();
        await expect(
          page.getByRole("button", { name: "Accept", exact: true }),
        ).not.toBeVisible();
      }
    }

    // 7. Cult Leader picks a target
    const target = players.find((p) => p.page !== cultLeaderPage);
    if (!target) throw new Error("Target not found");
    // Wait for player list
    await expect(
      cultLeaderPage.getByRole("heading", { name: "Choose a Convert" }),
    ).toBeVisible();
    const quizConversionModal = cultLeaderPage
      .locator("div")
      .filter({ hasText: "Choose a Convert" })
      .filter({ has: cultLeaderPage.locator("h2") });
    const targetLabel = quizConversionModal
      .locator("label")
      .filter({ hasText: target.name });
    await targetLabel.waitFor({ state: "visible" });
    await targetLabel.click();

    // 8. Players Answer Quiz - One CORRECT, One WRONG
    const QUIZ_ANSWERS: Record<string, string> = {
      "What is the primary diet of the Kraken?": "Ships and Sailors",
      "Which direction is 'Starboard'?": "Right",
      "What is a 'Jolly Roger'?": "A pirate flag",
      "What does 'Davy Jones' Locker' refer to?": "The bottom of the sea",
      "Which of these is NOT a type of ship?": "Cutlass",
      "What is 'Grog'?": "Diluted rum",
      "Who is the captain of the Flying Dutchman?": "Davy Jones",
      "What is the 'Crow's Nest'?": "A lookout platform",
      "What does 'Shiver me timbers' mean?": "An expression of shock",
      "What is 'Keelhauling'?": "A punishment",
    };

    const nonLeaderPages = allPages.filter((p) => p !== cultLeaderPage);
    let correctPage: Page | null = null;
    let wrongPage: Page | null = null;

    // We need at least 2 players to test both outcomes
    if (nonLeaderPages.length < 2)
      throw new Error("Not enough players for quiz test");

    // Player A answers CORRECTLY
    const playerA = nonLeaderPages[0];
    const questionLinkA = playerA.getByRole("heading", {
      name: "Prove Your Worth",
    });
    await expect(questionLinkA).toBeVisible({ timeout: 15000 });

    let questionTextA = "";
    for (const q of Object.keys(QUIZ_ANSWERS)) {
      if (await playerA.getByText(q).isVisible()) {
        questionTextA = q;
        break;
      }
    }
    if (!questionTextA)
      throw new Error("Could not identify question on Player A screen");

    const correctAnsA = QUIZ_ANSWERS[questionTextA];
    await playerA
      .getByRole("button", { name: correctAnsA, exact: false })
      .click();
    correctPage = playerA;

    // Player B answers INCORRECTLY
    const playerB = nonLeaderPages[1];
    await expect(
      playerB.getByRole("heading", { name: "Prove Your Worth" }),
    ).toBeVisible({ timeout: 15000 });

    let questionTextB = "";
    for (const q of Object.keys(QUIZ_ANSWERS)) {
      if (await playerB.getByText(q).isVisible()) {
        questionTextB = q;
        break;
      }
    }
    if (!questionTextB)
      throw new Error("Could not identify question on Player B screen");

    const correctAnsB = QUIZ_ANSWERS[questionTextB];
    const allButtons = await playerB.getByRole("button").all();
    let clickedWrong = false;
    for (const btn of allButtons) {
      const txt = await btn.innerText();
      // Filter out empty buttons or navigation buttons if any (but expecting only quiz options)
      // Check if button text contains the correct answer. if NOT, click it.
      // Also ignore short/irrelevant text if necessary, but here options are distinct.
      if (txt.includes(".")) {
        // Basic check for option format "A. Answer"
        if (!txt.includes(correctAnsB)) {
          await btn.click();
          clickedWrong = true;
          break;
        }
      }
    }
    if (!clickedWrong) {
      // Fallback: Click the first button that doesn't containing the answer text
      // (Just in case the dot check fails or format changes)
      const wrongOption = playerB
        .getByRole("button")
        .filter({ hasNotText: correctAnsB })
        .first();
      await wrongOption.click();
    }

    wrongPage = playerB;

    // 9. Wait for results
    await expect(
      cultLeaderPage.getByRole("heading", { name: "Ritual Complete" }),
    ).toBeVisible({ timeout: 70000 });

    // 10. Verify Feedback
    if (correctPage) {
      await expect(correctPage.getByText("Correct Answer!")).toBeVisible();
    }
    if (wrongPage) {
      await expect(wrongPage.getByText("Wrong Answer")).toBeVisible();
    }
  });
});
