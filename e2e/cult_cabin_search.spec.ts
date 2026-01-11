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
    await expect(hostPage.getByText("Crew Manifest")).toBeVisible({
      timeout: 15000,
    });

    const codeElement = hostPage.locator("p.font-mono");
    await expect(codeElement).toBeVisible();
    const code = await codeElement.innerText();

    // 2. 4 Players join (Total 5 players)
    const players: {
      context: typeof hostContext;
      page: typeof hostPage;
      name: string;
    }[] = [];
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
    for (const p of players) {
      await expect(p.page.getByText("Crew Manifest")).toBeVisible();
    }

    // 4. Navigate to Cabin Search
    await hostPage.getByRole("button", { name: "Cabin Search (Cult)" }).click();
    // Verify valid headings for any role (Leader sees Cabin Search (Cult), others see Quiz/Inspection)
    await expect(
      hostPage.getByRole("heading", {
        name: /Cabin Search|Crew Quiz|Cabin Inspection/,
      }),
    ).toBeVisible();

    for (const p of players) {
      await expect(
        p.page.getByRole("heading", {
          name: /Cabin Search|Crew Quiz|Cabin Inspection/,
        }),
      ).toBeVisible();
    }

    // 5. Players claim roles - valid distribution
    // Host claims Captain
    await hostPage.getByRole("button", { name: "Captain" }).click();
    await expect(hostPage.getByText("Waiting for others...")).toBeVisible();

    // 6. Verify Player 1 sees Captain as claimed in role selection view
    await expect(
      players[0].page.getByRole("button", {
        name: /Captain.*Claimed|Claimed.*Host/i,
      }),
    ).toBeVisible({ timeout: 10000 });

    // Player 1 claims Navigator
    await players[0].page.getByRole("button", { name: "Navigator" }).click();

    // Player 2 claims Lieutenant
    await players[1].page.getByRole("button", { name: "Lieutenant" }).click();

    // Player 3 claims Crew Member
    await players[2].page.getByRole("button", { name: "Crew Member" }).click();

    // Player 4 claims Crew Member (triggers transition to ACTIVE)
    await players[3].page.getByRole("button", { name: "Crew Member" }).click();

    // 7. Wait for transition to ACTIVE state (timer visible)
    await expect(hostPage.locator("text=/\\d+:\\d{2}/")).toBeVisible({
      timeout: 10000,
    });

    // 8. Identify the Cult Leader and verify role visibility
    const allPages = [
      { page: hostPage, name: "Host", claimedRole: "Captain" },
      { page: players[0].page, name: "Player 1", claimedRole: "Navigator" },
      { page: players[1].page, name: "Player 2", claimedRole: "Lieutenant" },
      { page: players[2].page, name: "Player 3", claimedRole: "Crew" },
      { page: players[3].page, name: "Player 4", claimedRole: "Crew" },
    ];

    let cultLeaderPage: {
      page: typeof hostPage;
      name: string;
      claimedRole: string;
    } | null = null;
    const quizPages: {
      page: typeof hostPage;
      name: string;
      claimedRole: string;
    }[] = [];

    // Give a brief moment for UI to update after all claims
    await hostPage.waitForTimeout(1000);

    for (const { page, name, claimedRole } of allPages) {
      // Use waitFor with short timeout to properly detect visibility
      const hasRevealedRoles = await page
        .getByText("Revealed Roles")
        .isVisible({ timeout: 1000 })
        .catch(() => false);

      if (hasRevealedRoles) {
        cultLeaderPage = { page, name, claimedRole };
      } else {
        quizPages.push({ page, name, claimedRole });
      }
    }

    // 9. Verify Cult Leader sees revealed roles
    expect(cultLeaderPage).not.toBeNull();
    if (cultLeaderPage) {
      // Cult Leader should see "Revealed Roles" heading
      await expect(
        cultLeaderPage.page.getByText("Revealed Roles"),
      ).toBeVisible();

      // Cult Leader should see role assignments for Captain, Navigator, Lieutenant
      // The UI shows the claimed role (e.g., "Captain") and the actual game role (e.g., "Sailor", "Pirate", "Cult Leader")
      // We check that Captain, Navigator, Lieutenant labels are displayed
      await expect(cultLeaderPage.page.getByText("Captain")).toBeVisible();
      await expect(cultLeaderPage.page.getByText("Navigator")).toBeVisible();
      await expect(cultLeaderPage.page.getByText("Lieutenant")).toBeVisible();

      // Verify at least one actual role is visible (Sailor, Pirate, or Cult Leader)
      const hasSailor = await cultLeaderPage.page
        .getByText("Sailor")
        .first()
        .isVisible()
        .catch(() => false);
      const hasPirate = await cultLeaderPage.page
        .getByText("Pirate")
        .first()
        .isVisible()
        .catch(() => false);
      const hasCultLeader = await cultLeaderPage.page
        .getByText("Cult Leader")
        .first()
        .isVisible()
        .catch(() => false);
      expect(hasSailor || hasPirate || hasCultLeader).toBe(true);
    }

    // 10. Verify other players see the quiz
    expect(quizPages.length).toBeGreaterThan(0);
    for (const { page } of quizPages) {
      // Non-Cult-Leader players should see quiz
      const hasProveWorth = await page
        .getByRole("heading", { name: "Prove Your Worth" })
        .isVisible()
        .catch(() => false);
      const hasCrewQuiz = await page
        .getByRole("heading", { name: "Crew Quiz" })
        .isVisible()
        .catch(() => false);
      const hasCabinInspection = await page
        .getByRole("heading", { name: "Cabin Inspection" })
        .isVisible()
        .catch(() => false);

      expect(hasProveWorth || hasCrewQuiz || hasCabinInspection).toBe(true);
    }

    // 11. Quiz players answer - one CORRECT, one WRONG
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

    let correctPage: typeof hostPage | null = null;
    let wrongPage: typeof hostPage | null = null;

    // Need at least 2 quiz players
    if (quizPages.length >= 2) {
      // Player A answers CORRECTLY
      const playerA = quizPages[0].page;
      let questionTextA = "";
      for (const q of Object.keys(QUIZ_ANSWERS)) {
        if (
          await playerA
            .getByText(q)
            .isVisible()
            .catch(() => false)
        ) {
          questionTextA = q;
          break;
        }
      }
      if (questionTextA) {
        const correctAnsA = QUIZ_ANSWERS[questionTextA];
        await playerA
          .getByRole("button", { name: correctAnsA, exact: false })
          .click();
        correctPage = playerA;
      }

      // Player B answers INCORRECTLY
      const playerB = quizPages[1].page;
      let questionTextB = "";
      for (const q of Object.keys(QUIZ_ANSWERS)) {
        if (
          await playerB
            .getByText(q)
            .isVisible()
            .catch(() => false)
        ) {
          questionTextB = q;
          break;
        }
      }
      if (questionTextB) {
        const correctAnsB = QUIZ_ANSWERS[questionTextB];
        const allButtons = await playerB.getByRole("button").all();
        let clickedWrong = false;
        for (const btn of allButtons) {
          const txt = await btn.innerText();
          if (txt.includes(".")) {
            if (!txt.includes(correctAnsB)) {
              await btn.click();
              clickedWrong = true;
              break;
            }
          }
        }
        if (!clickedWrong) {
          const wrongOption = playerB
            .getByRole("button")
            .filter({ hasNotText: correctAnsB })
            .first();
          await wrongOption.click();
        }
        wrongPage = playerB;
      }
    }

    // 12. Wait for results (COMPLETED state)
    // The quiz timer is 15 seconds from when ACTIVE state started
    // Account for time spent doing verifications + timer + buffer
    // All players see "Ritual Complete" heading in COMPLETED state
    await expect(
      hostPage.getByRole("heading", { name: "Ritual Complete" }),
    ).toBeVisible({ timeout: 45000 });

    // 13. Verify feedback for correct/wrong answers
    if (correctPage) {
      await expect(correctPage.getByText("Correct Answer!")).toBeVisible();
    }
    if (wrongPage) {
      await expect(wrongPage.getByText("Wrong Answer")).toBeVisible();
    }

    // 14. Verify navigation team (Captain, Navigator, Lieutenant) sees "Role Revealed"
    // These are non-Cult-Leader, non-Crew players who claimed Captain/Navigator/Lieutenant
    const navigationTeamPages = allPages.filter(
      (p) =>
        p.claimedRole !== "Crew" &&
        (!cultLeaderPage || p.page !== cultLeaderPage.page),
    );
    for (const { page } of navigationTeamPages) {
      await expect(
        page.getByRole("heading", { name: "Role Revealed" }),
      ).toBeVisible({ timeout: 5000 });
      await expect(
        page.getByText("The Cult Leader has seen your identity"),
      ).toBeVisible();
    }

    // 14. Return to game - all players click "Return to Ship"
    const allPagesForReturn = [hostPage, ...players.map((p) => p.page)];
    for (const page of allPagesForReturn) {
      const returnButton = page.getByText("Return to Ship", { exact: true });
      if (await returnButton.isVisible().catch(() => false)) {
        await returnButton.click();
      }
    }

    // 15. Verify all players are back on game page
    await expect(hostPage.getByText("Crew status")).toBeVisible({
      timeout: 10000,
    });
    for (const p of players) {
      await expect(p.page.getByText("Crew status")).toBeVisible({
        timeout: 10000,
      });
    }

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
      await expect(
        p.page.getByRole("heading", {
          name: /Cabin Search|Crew Quiz|Cabin Inspection/,
        }),
      ).toBeVisible();
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
    await expect(hostPage.getByText("Crew status")).toBeVisible({
      timeout: 10000,
    });

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

    // 4. Navigate to Cabin Search
    await hostPage.getByRole("button", { name: "Cabin Search (Cult)" }).click();
    await expect(
      hostPage.getByRole("heading", {
        name: /Cabin Search|Crew Quiz|Cabin Inspection/,
      }),
    ).toBeVisible();

    // 4.1. Verify that all players are in cabin search
    for (const p of players) {
      await expect(
        p.page.getByRole("heading", {
          name: /Cabin Search|Crew Quiz|Cabin Inspection/,
        }),
      ).toBeVisible();
    }

    // 5. Cancel
    await hostPage.getByRole("button", { name: "Cancel" }).click();

    // 6. Verify Redirect
    await expect(hostPage.getByText("Crew status")).toBeVisible({
      timeout: 10000,
    });

    // 6.1. Verify that all players are in game
    for (const p of players) {
      await expect(p.page.getByText("Crew status")).toBeVisible({
        timeout: 10000,
      }); // Added timeout
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
