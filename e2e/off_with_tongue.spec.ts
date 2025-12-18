import { expect, test } from "@playwright/test";

test("Off with the Tongue Flow: Host silences Player 1", async ({
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

  // 3. Add bots to reach 5 players
  for (let i = 0; i < 3; i++) {
    await hostPage.getByRole("button", { name: "Debug Bot" }).click();
  }

  // 4. Start Game
  await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();
  await hostPage.getByRole("button", { name: "Start Voyage" }).click();
  await expect(hostPage).toHaveURL(/\/game/);
  await expect(page).toHaveURL(/\/game/);

  // 5. Host initiates Off with the Tongue on Player 1
  await hostPage.getByRole("link", { name: "Off with the Tongue" }).click();
  await expect(hostPage).toHaveURL(/\/off-with-tongue/);

  // Select Player 1
  await hostPage.locator("main").getByText("Player 1").first().click();
  const silenceButton = hostPage.getByRole("button", {
    name: "Silence Sailor",
  });
  await expect(silenceButton).toBeEnabled();
  await silenceButton.click();

  // Verify pending state on Host
  await expect(hostPage.getByText("Waiting for Confirmation")).toBeVisible();

  // 6. Player 1 receives prompt and accepts
  await expect(
    page.getByRole("heading", { name: "Off with the Tongue" }),
  ).toBeVisible();
  await expect(page.getByText("Host wants to silence you")).toBeVisible();
  await page.getByRole("button", { name: "Accept" }).click();

  // 7. Verify Host is redirected back to game
  await expect(hostPage).toHaveURL(/\/game/);

  // 8. Verify Player 1 is shown as "Silenced" in crew status
  // Check on Host's view
  await expect(hostPage.getByText("Silenced")).toBeVisible();

  // Cleanup
  await hostContext.close();
  await context.close();
});

test("Off with the Tongue Flow: Player 1 denies", async ({ browser }) => {
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
  await expect(page).toHaveURL(/\/game/);

  // 5. Host initiates Off with the Tongue
  await hostPage.getByRole("link", { name: "Off with the Tongue" }).click();

  // Select Player 1
  const player1Card = hostPage.locator("label").filter({ hasText: "Player 1" });
  await player1Card.click();
  await expect(player1Card).toHaveClass(/border-cyan-500/);

  const silenceButton = hostPage.getByRole("button", {
    name: "Silence Sailor",
  });
  await expect(silenceButton).toBeEnabled();
  await silenceButton.click();

  // Verify pending state
  await expect(hostPage.getByText("Waiting for Confirmation")).toBeVisible();

  // 6. Player 1 denies
  await expect(
    page.getByRole("heading", { name: "Off with the Tongue" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Deny" }).click();

  // 7. Host sees denial error
  await expect(
    hostPage.getByText("Waiting for Confirmation"),
  ).not.toBeVisible();
  await expect(
    hostPage.getByText("The player refused to be silenced"),
  ).toBeVisible();

  // Host should still be on off-with-tongue page
  await expect(hostPage).toHaveURL(/\/off-with-tongue/);

  // Cleanup
  await hostContext.close();
  await context.close();
});

test("Silenced player cannot claim Captain in Cult Cabin Search", async ({
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
  await expect(hostPage).toHaveURL(/\/lobby/);

  const codeElement = hostPage.locator("p.font-mono");
  await expect(codeElement).toBeVisible();
  const code = await codeElement.innerText();

  // 2. Player 1 joins
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem("kraken_player_name", "Player 1");
    localStorage.setItem(
      "kraken_player_photo",
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    );
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Join Crew" }).click();
  await page.getByPlaceholder("XP7K9L").fill(code);
  await page.getByRole("button", { name: "Board Ship" }).click();
  await expect(page).toHaveURL(/\/lobby/);

  // 3. Add bots to reach 5 players
  for (let i = 0; i < 3; i++) {
    await hostPage.getByRole("button", { name: "Debug Bot" }).click();
  }

  // 4. Start Game
  await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();
  await hostPage.getByRole("button", { name: "Start Voyage" }).click();
  await expect(hostPage).toHaveURL(/\/game/);
  await expect(page).toHaveURL(/\/game/);

  // 5. Silence Player 1
  await hostPage.getByRole("link", { name: "Off with the Tongue" }).click();
  // expect url to change
  await expect(hostPage).toHaveURL(/\/off-with-tongue/);
  await hostPage.locator("main").getByText("Player 1").first().click();
  await hostPage.getByRole("button", { name: "Silence Sailor" }).click();

  // Player 1 accepts
  await expect(
    page.getByRole("heading", { name: "Off with the Tongue" }),
  ).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Accept" }).click();

  // Wait for redirect
  await expect(hostPage).toHaveURL(/\/game/);

  // Verify Player 1 is silenced
  await expect(hostPage.getByText("Silenced")).toBeVisible();

  // 6. Start Cult Cabin Search
  await hostPage.getByText("Cult Cabin Search").click();
  await expect(hostPage).toHaveURL(/\/cult-cabin-search/);
  await expect(page).toHaveURL(/\/cult-cabin-search/);

  // 7. Player 1 (silenced) tries to claim Captain
  // This should fail with an error
  await page.getByRole("button", { name: "Captain" }).click();

  // Should see error message
  await expect(
    page.getByText("cannot claim Captain because you have been silenced"),
  ).toBeVisible();

  // Cleanup
  await hostContext.close();
  await context.close();
});
