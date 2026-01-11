import { expect, type Page, test } from "@playwright/test";
import {
  checkRoleVisible,
  completeIdentifyPage,
  identifyRole,
} from "./helpers";

test("Feed the Kraken Flow: Host feeds Player 1", async ({ browser }) => {
  // 1. Host creates lobby
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();

  await hostPage.addInitScript(() => {
    localStorage.setItem("kraken_player_name", "Host");
    localStorage.setItem("kraken_player_id", "host-uuid");
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
    localStorage.setItem("kraken_player_id", "p1-uuid");
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

  // 3. Player 2 joins (Observer/Bystander)
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  const player2Name = "Player 2";
  await page2.addInitScript((name) => {
    localStorage.setItem("kraken_player_name", name);
    localStorage.setItem("kraken_player_id", "p2-uuid");
    // Use different photo or same
    localStorage.setItem(
      "kraken_player_photo",
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    );
  }, player2Name);
  await page2.goto("/");
  await page2.getByRole("button", { name: "Join Crew" }).click();
  await page2.getByPlaceholder("XP7K9L").fill(code);
  await page2.getByRole("button", { name: "Board Ship" }).click();
  await completeIdentifyPage(page2);
  await expect(page2).toHaveURL(/\/lobby/, { timeout: 15000 });

  // 4. Add bots to reach 5 players (Host + P1 + P2 + 2 bots)
  for (let i = 0; i < 2; i++) {
    await hostPage.getByRole("button", { name: "Debug Bot" }).click();
  }

  // 4. Start Game
  await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();
  await hostPage.getByRole("button", { name: "Start Voyage" }).click();
  await expect(hostPage).toHaveURL(/\/game/);

  // Check if Player 1 is the Cult Leader
  const isCultLeader = await checkRoleVisible(page);

  // 5. Host initiates Feed the Kraken on Player 1
  await hostPage.getByRole("button", { name: "Feed the Kraken" }).click();
  // Should navigate to feed-the-kraken view
  await expect(
    hostPage.getByRole("heading", { name: "Feed The Kraken" }),
  ).toBeVisible();

  // Select Player 1
  await hostPage
    .locator("label")
    .filter({ has: hostPage.getByRole("radio", { name: /Player 1/ }) })
    .click();
  const feedButton = hostPage.getByRole("button", { name: "Feed to Kraken" });
  await expect(feedButton).toBeEnabled();
  await feedButton.click();

  // Verify pending state on Host
  await expect(hostPage.getByText("Waiting for Confirmation")).toBeVisible();

  // 6. Player 1 receives prompt and confirms
  await expect(
    page.getByRole("heading", { name: "Feed the Kraken" }),
  ).toBeVisible();
  await expect(
    page.getByText("Host has chosen to feed you to the Kraken"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Accept Fate" }).click();

  // 7. Verify Result on Host
  await expect(hostPage).toHaveURL(/\/game/); // Should redirect back

  if (isCultLeader) {
    await expect(hostPage.getByText("CULT WINS!")).toBeVisible();
    await expect(
      hostPage.getByText("The Cult Leader was fed to the Kraken!"),
    ).toBeVisible();
  } else {
    // Scope checks to the modal to avoid matching player list "Eliminated" badge
    const modal = hostPage
      .locator("div")
      .filter({
        has: hostPage.getByRole("heading", { name: "Fed to the Kraken" }),
      })
      .last();
    await expect(modal).toBeVisible();
    await expect(modal.getByText("Eliminated", { exact: true })).toBeVisible();
    await expect(modal.getByText("Player 1")).toBeVisible();
  }

  // Verify Result on Player 2 (Bystander) - Broadcast Check
  await expect(page2).toHaveURL(/\/game/);
  if (isCultLeader) {
    await expect(page2.getByText("CULT WINS!")).toBeVisible();
    await expect(
      page2.getByText("The Cult Leader was fed to the Kraken!"),
    ).toBeVisible();
  } else {
    // Scope checks to the modal to avoid matching player list "Eliminated" badge
    const page2Modal = page2
      .locator("div")
      .filter({
        has: page2.getByRole("heading", { name: "Fed to the Kraken" }),
      })
      .last();
    await expect(page2Modal).toBeVisible();
    await expect(
      page2Modal.getByText("Eliminated", { exact: true }),
    ).toBeVisible();
  }

  // Close result on Host
  await hostPage.getByRole("button", { name: "Done" }).click();
  await expect(hostPage.getByText("Fed to the Kraken")).not.toBeVisible();

  // 8. Verify Result on Player 1 (Eliminated screen)
  await expect(page).toHaveURL(/\/game/);
  await expect(page.getByRole("heading", { name: "Eliminated" })).toBeVisible();
  await expect(page.getByText("Return to Shore")).toBeVisible();
});

test("Feed the Kraken Flow: Player 1 denies", async ({ browser }) => {
  // 1. Host creates lobby
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  await hostPage.addInitScript(() => {
    localStorage.setItem("kraken_player_name", "Host");
    localStorage.setItem("kraken_player_id", "host-uuid");
    localStorage.setItem(
      "kraken_player_photo",
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    );
  });
  await hostPage.goto("/");
  await hostPage.getByRole("button", { name: "Create Voyage" }).click();
  await completeIdentifyPage(hostPage);

  const codeElement = hostPage.locator("p.font-mono");
  await expect(codeElement).toBeVisible();
  const code = await codeElement.innerText();

  // 2. Player 1 joins
  const context = await browser.newContext();
  const page = await context.newPage();
  const playerName = "Player 1";
  await page.addInitScript((name) => {
    localStorage.setItem("kraken_player_name", name);
    localStorage.setItem("kraken_player_id", "p1-uuid");
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

  // 3. Add bots
  for (let i = 0; i < 3; i++) {
    await hostPage.getByRole("button", { name: "Debug Bot" }).click();
  }

  // 4. Start Game
  await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();
  await hostPage.getByRole("button", { name: "Start Voyage" }).click();
  await expect(hostPage).toHaveURL(/\/game/);
  // Ensure Player 1 is also in game
  await expect(page).toHaveURL(/\/game/);

  // Check role for sync
  await checkRoleVisible(page);

  // 5. Host initiates Feed the Kraken
  await hostPage.getByRole("button", { name: "Feed the Kraken" }).click();

  // Select Player 1 with robust locator and verify selection state
  const player1Card = hostPage
    .locator("label")
    .filter({ has: hostPage.getByRole("radio", { name: /Player 1/ }) });
  await player1Card.click();
  // Verify selection (cyan border/styling indicates selection)
  await expect(player1Card).toHaveClass(/border-cyan-500/);

  const feedButton = hostPage.getByRole("button", { name: "Feed to Kraken" });
  await expect(feedButton).toBeEnabled();
  await feedButton.click();

  // Verify pending state on Host to ensure request is sent
  await expect(hostPage.getByText("Waiting for Confirmation")).toBeVisible();

  // 6. Player 1 denies
  await expect(
    page.getByRole("heading", { name: "Feed the Kraken" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Decline" }).click();

  // 7. Host sees denial error
  // Wait for pending state to disappear
  await expect(
    hostPage.getByText("Waiting for Confirmation"),
  ).not.toBeVisible();
  // Check for error toast
  await expect(
    hostPage
      .getByText(/The player refused to be fed to the Kraken/i)
      .and(hostPage.locator(":visible"))
      .first(),
  ).toBeVisible();

  // Host should still be on action page or redirected?
  // Code in page.tsx: useEffect clears isPending on error. It keeps user on the page.
  await expect(hostPage).toHaveURL(/\/en\/game/);
});

test("Feed the Kraken Flow: Cult Leader is fed (Automatic)", async ({
  browser,
}) => {
  test.setTimeout(300_000); // 5 minutes for potential retries

  let success = false;
  // Try up to 5 times to get a game where Host is NOT the Cult Leader
  for (let attempt = 1; attempt <= 5; attempt++) {
    const contexts = [];
    const players = new Array(5);

    try {
      // 1. Host setup
      const hostContext = await browser.newContext();
      contexts.push(hostContext);
      const hostPage = await hostContext.newPage();
      players[0] = { page: hostPage, name: "Host", id: "host-uuid" };

      await hostPage.addInitScript(() => {
        localStorage.setItem("kraken_player_name", "Host");
        localStorage.setItem("kraken_player_id", "host-uuid");
        localStorage.setItem(
          "kraken_player_photo",
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        );
      });
      await hostPage.goto("/");
      await hostPage.getByRole("button", { name: "Create Voyage" }).click();
      await completeIdentifyPage(hostPage);
      const code = await hostPage.locator("p.font-mono").innerText();

      // 2. Peers join (Parallel)
      const peerIndices = [1, 2, 3, 4];
      await Promise.all(
        peerIndices.map(async (i) => {
          const context = await browser.newContext();
          contexts.push(context);
          const page = await context.newPage();
          const name = `Player ${i}`;
          const id = `p${i}-uuid`;
          players[i] = { page, name, id };

          await page.addInitScript(
            (arg) => {
              localStorage.setItem("kraken_player_name", arg.name);
              localStorage.setItem("kraken_player_id", arg.id);
              localStorage.setItem(
                "kraken_player_photo",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
              );
            },
            { name, id },
          );

          await page.goto("/");
          await page.getByRole("button", { name: "Join Crew" }).click();
          await page.getByPlaceholder("XP7K9L").fill(code);
          await page.getByRole("button", { name: "Board Ship" }).click();
          await completeIdentifyPage(page);
          await expect(page).toHaveURL(/\/lobby/, { timeout: 30000 });
        }),
      );

      // 3. Start Game (Automatic Roles is default)
      await hostPage.getByRole("button", { name: "Start Voyage" }).click();
      await expect(hostPage).toHaveURL(/\/game/, { timeout: 30000 });

      // 4. Identify Roles
      // We need to find the Cult Leader.
      let cultLeaderParams: { page: Page; name: string } | null = null;
      let hostIsCultLeader = false;

      // Check Host first
      const hostRole = await identifyRole(hostPage);
      if (hostRole === "CULT_LEADER") {
        hostIsCultLeader = true;
      } else {
        // Check peers
        for (let i = 1; i < players.length; i++) {
          const p = players[i];
          const role = await identifyRole(p.page);
          if (role === "CULT_LEADER") {
            cultLeaderParams = p;
            break;
          }
        }
      }

      if (hostIsCultLeader || !cultLeaderParams) {
        // Retry logic: close valid contexts and continue
        await Promise.all(contexts.map((c) => c.close()));
        continue;
      }

      // 5. Host feeds the Cult Leader
      await hostPage.getByRole("button", { name: "Feed the Kraken" }).click();

      // Select target
      await hostPage
        .locator("label")
        .filter({
          has: hostPage.getByRole("radio", {
            name: new RegExp(cultLeaderParams.name),
          }),
        })
        .click();
      await hostPage.getByRole("button", { name: "Feed to Kraken" }).click();

      // 6. Target accepts
      await expect(
        cultLeaderParams.page.getByRole("heading", { name: "Feed the Kraken" }),
      ).toBeVisible();
      await cultLeaderParams.page
        .getByRole("button", { name: "Accept Fate" })
        .click();

      // 7. Verify Cult Wins on ALL pages
      await expect(
        hostPage.getByText("The Cult Leader was fed to the Kraken!"),
      ).toBeVisible();

      for (const p of players) {
        await expect(p.page.getByText("CULT WINS!")).toBeVisible({
          timeout: 10000,
        });
      }

      success = true;
      await Promise.all(contexts.map((c) => c.close()));
      break;
    } catch (e) {
      console.error(`Attempt ${attempt} failed with error:`, e);
      await Promise.all(contexts.map((c) => c.close()));
    }
  }

  expect(success).toBe(true);
});
