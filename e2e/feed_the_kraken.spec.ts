import { expect, test } from "@playwright/test";
import { checkRoleVisible } from "./helpers";

test("Feed the Kraken Flow: Host feeds Player 1", async ({ browser }) => {
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
  await expect(hostPage).toHaveURL(/\/lobby/);

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
  await expect(page).toHaveURL(/\/lobby/);

  // 3. Player 2 joins (Observer/Bystander)
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  const player2Name = "Player 2";
  await page2.addInitScript((name) => {
    localStorage.setItem("kraken_player_name", name);
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
  await expect(page2).toHaveURL(/\/lobby/);

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
  await hostPage.getByRole("link", { name: "Feed the Kraken" }).click();
  // Should navigate to feed-the-kraken page
  await expect(hostPage).toHaveURL(/\/feed-the-kraken/);

  // Select Player 1
  await hostPage.locator("main").getByText("Player 1").first().click();
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
    await expect(hostPage.getByText("Fed to the Kraken")).toBeVisible();
    await expect(hostPage.getByText("Has been eliminated")).toBeVisible();
    // Scope "Player 1" check to the modal content to avoid matching player list
    const modal = hostPage
      .locator("div")
      .filter({ hasText: "Fed to the Kraken" })
      .last();
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
    await expect(page2.getByText("Fed to the Kraken")).toBeVisible();
    await expect(page2.getByText("Has been eliminated")).toBeVisible();
  }

  // Close result on Host
  await hostPage.getByRole("button", { name: "Close" }).click();
  await expect(hostPage.getByText("Fed to the Kraken")).not.toBeVisible();

  // 8. Verify Result on Player 1 (Eliminated screen)
  await expect(page).toHaveURL(/\/game/);
  await expect(page.getByText("Eliminated")).toBeVisible();
  await expect(page.getByText("Return to Shore")).toBeVisible();
});

test("Feed the Kraken Flow: Player 1 denies", async ({ browser }) => {
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
  await hostPage.getByRole("link", { name: "Feed the Kraken" }).click();

  // Select Player 1 with robust locator and verify selection state
  const player1Card = hostPage.locator("label").filter({ hasText: "Player 1" });
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
  await page.getByRole("button", { name: "Deny" }).click();

  // 7. Host sees denial error
  // Wait for pending state to disappear
  await expect(
    hostPage.getByText("Waiting for Confirmation"),
  ).not.toBeVisible();
  // Check for error toast
  await expect(
    hostPage.getByText("The player refused to be fed to the Kraken"),
  ).toBeVisible();

  // Host should still be on action page or redirected?
  // Code in page.tsx: useEffect clears isPending on error. It keeps user on the page.
  await expect(hostPage).toHaveURL(/\/feed-the-kraken/);
});
