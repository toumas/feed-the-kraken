import { expect, test } from "@playwright/test";

test("Flogging Flow: Host flogs Player 1", async ({ browser }) => {
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
    await expect(page).toHaveURL(/\/lobby/);
    players.push({ context, page, name: playerName });
  }

  // 3. Start Game
  await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();
  await hostPage.getByRole("button", { name: "Start Voyage" }).click();
  await expect(hostPage).toHaveURL(/\/game/, { timeout: 10000 });

  // 4. Host initiates Flogging on Player 1
  await hostPage.getByRole("link", { name: "Flogging" }).click();
  await expect(hostPage).toHaveURL(/\/flogging/);

  // Select Player 1
  await hostPage.getByText("Player 1").click();
  await hostPage.getByRole("button", { name: "Flog Player" }).click();

  // Verify pending state on Host
  await expect(hostPage.getByText("Waiting for Confirmation")).toBeVisible();

  // 5. Player 1 confirms
  const player1Page = players[0].page;
  await expect(player1Page.getByText("Flogging Request")).toBeVisible();
  await expect(player1Page.getByText("Host wants to flog you")).toBeVisible();
  await player1Page.getByRole("button", { name: "Allow" }).click();

  // 6. Host sees reveal
  await expect(hostPage).toHaveURL(/\/game/); // Should redirect back to game
  await expect(hostPage.getByText("Flogging Result")).toBeVisible();
  await expect(hostPage.getByText("Is Definitely")).toBeVisible();
  const resultElement = hostPage.locator("p.text-3xl.font-bold.text-amber-400");
  await expect(resultElement).toBeVisible();
  await expect(resultElement).toHaveText(/NOT (PIRATE|SAILOR|CULT LEADER)/);

  // 7. Host closes reveal
  await hostPage.getByRole("button", { name: "Close" }).click();
  await expect(hostPage.getByText("Flogging Result")).not.toBeVisible();
});

test("Flogging Flow: Player 1 denies flogging", async ({ browser }) => {
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

  // 5. Host initiates Flogging on Player 1
  await hostPage.getByRole("link", { name: "Flogging" }).click();
  await expect(hostPage).toHaveURL(/\/flogging/);

  // Select Player 1
  await hostPage.getByText("Player 1").click();
  await hostPage.getByRole("button", { name: "Flog Player" }).click();

  // Verify pending state on Host
  await expect(hostPage.getByText("Waiting for Confirmation")).toBeVisible();

  // 6. Player 1 denies
  await expect(page.getByText("Flogging Request")).toBeVisible();
  await page.getByRole("button", { name: "Deny" }).click();

  // 7. Host sees denial error
  await expect(
    hostPage.getByText("Waiting for Confirmation"),
  ).not.toBeVisible();
});

test("Flogging Flow: Restriction (Once per game)", async ({ browser }) => {
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
  await expect(page).toHaveURL(/\/lobby/, { timeout: 10000 });

  // 3. Add bots to reach 5 players
  for (let i = 0; i < 3; i++) {
    await hostPage.getByRole("button", { name: "Debug Bot" }).click();
  }

  // 4. Start Game
  await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();
  await hostPage.getByRole("button", { name: "Start Voyage" }).click();
  await expect(hostPage).toHaveURL(/\/game/);

  // 5. Host initiates Flogging on Player 1
  await hostPage.getByRole("link", { name: "Flogging" }).click();
  await expect(hostPage).toHaveURL(/\/flogging/);

  // Select Player 1
  await hostPage.getByText("Player 1").click();
  await hostPage.getByRole("button", { name: "Flog Player" }).click();

  // 6. Player 1 confirms
  await expect(page.getByText("Flogging Request")).toBeVisible();
  await page.getByRole("button", { name: "Allow" }).click();

  // 7. Host sees reveal and closes it
  await expect(hostPage.getByText("Flogging Result")).toBeVisible();
  await hostPage.getByRole("button", { name: "Close" }).click();
  await expect(hostPage.getByText("Flogging Result")).not.toBeVisible();

  // 8. Verify restriction
  // Link should be clickable but look disabled
  const floggingLink = hostPage.getByRole("link", { name: "Flogging (Used)" });
  await expect(floggingLink).toBeVisible();
  await expect(floggingLink).toHaveClass(/bg-slate-800\/50/); // Check for disabled style

  // Clicking it should redirect (and show alert)
  // We explicitly wait for the dialog to ensure the navigation/check actually happened
  // because we are already on /game, so toHaveURL(/game) would pass immediately otherwise.
  const dialogPromise = hostPage.waitForEvent("dialog");
  await floggingLink.click();
  const dialog = await dialogPromise;
  await dialog.accept();

  await expect(hostPage).toHaveURL(/\/game/);

  // Give WebKit a moment to settle
  await hostPage.waitForTimeout(500);

  // Direct access should redirect
  await hostPage.goto("/flogging");
  await expect(hostPage).toHaveURL(/\/game/);
});
