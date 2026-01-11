import { expect, test } from "@playwright/test";
import { completeIdentifyPage } from "./helpers";

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
  await completeIdentifyPage(hostPage);
  await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 15000 });

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
    await completeIdentifyPage(page);
    await expect(page).toHaveURL(/\/lobby/, { timeout: 15000 });
    players.push({ context, page, name: playerName });
  }

  // 3. Start Game
  await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();
  await hostPage.getByRole("button", { name: "Start Voyage" }).click();
  await expect(hostPage.getByText("Crew Status")).toBeVisible({
    timeout: 10000,
  });

  // 4. Host initiates Flogging on Player 1
  await hostPage.getByRole("button", { name: "Flogging" }).click();
  await expect(
    hostPage.getByRole("heading", { name: "Flogging" }),
  ).toBeVisible();

  // Select Player 1
  await hostPage
    .getByText("Player 1", { exact: true })
    .filter({ visible: true })
    .click();
  await hostPage.getByRole("button", { name: "Flog Player" }).click();

  // Verify pending state on Host
  await expect(hostPage.getByText("Waiting for Confirmation")).toBeVisible();

  // 5. Player 1 confirms
  const player1Page = players[0].page;
  await expect(
    player1Page.getByRole("heading", { name: "Flogging" }),
  ).toBeVisible({ timeout: 10000 });
  await expect(
    player1Page.getByText("Do you accept your punishment?"),
  ).toBeVisible();
  await player1Page.getByRole("button", { name: "Accept" }).click();

  // 6. Host sees reveal
  // Flogging result is shown in FloggingView
  await expect(
    hostPage.getByRole("heading", { name: "Flogging Result" }),
  ).toBeVisible({ timeout: 10000 });
  await expect(
    hostPage.getByRole("heading", { name: "Flogging Result" }),
  ).toBeVisible({ timeout: 10000 });
  await expect(hostPage.getByText("Is Definitely")).toBeVisible();
  const resultElement = hostPage.locator("p.text-3xl.font-bold");
  await expect(resultElement).toBeVisible();
  await expect(resultElement).toHaveText(/NOT (PIRATE|SAILOR|CULT LEADER)/i);

  // 7. Host closes reveal
  await hostPage.getByRole("button", { name: "Done" }).click();
  await expect(
    hostPage.getByRole("heading", { name: "Flogging Result" }),
  ).not.toBeVisible();
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

  // 3. Add bots to reach 5 players
  for (let i = 0; i < 3; i++) {
    await hostPage.getByRole("button", { name: "Debug Bot" }).click();
  }

  // 4. Start Game
  await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();
  await hostPage.getByRole("button", { name: "Start Voyage" }).click();
  await expect(hostPage.getByText("Crew Status")).toBeVisible();

  // 5. Host initiates Flogging on Player 1
  await hostPage.getByRole("button", { name: "Flogging" }).click();
  await expect(
    hostPage.getByRole("heading", { name: "Flogging" }),
  ).toBeVisible();

  // Select Player 1
  await hostPage
    .getByText("Player 1", { exact: true })
    .filter({ visible: true })
    .click();
  await hostPage.getByRole("button", { name: "Flog Player" }).click();

  // Verify pending state on Host
  await expect(hostPage.getByText("Waiting for Confirmation")).toBeVisible();

  // 6. Player 1 denies
  await expect(page.getByRole("heading", { name: "Flogging" })).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("button", { name: "Decline" }).click();

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

  // 3. Add bots to reach 5 players
  for (let i = 0; i < 3; i++) {
    await hostPage.getByRole("button", { name: "Debug Bot" }).click();
  }

  // 4. Start Game
  await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();
  await hostPage.getByRole("button", { name: "Start Voyage" }).click();
  await expect(hostPage.getByText("Crew Status")).toBeVisible();

  // 5. Host initiates Flogging on Player 1
  await hostPage.getByRole("button", { name: "Flogging" }).click();
  await expect(
    hostPage.getByRole("heading", { name: "Flogging" }),
  ).toBeVisible();

  // Select Player 1
  await hostPage
    .getByText("Player 1", { exact: true })
    .filter({ visible: true })
    .click();
  await hostPage.getByRole("button", { name: "Flog Player" }).click();

  // 6. Player 1 confirms
  await expect(page.getByRole("heading", { name: "Flogging" })).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("button", { name: "Accept" }).click();

  // 7. Host sees reveal and closes it
  await expect(
    hostPage.getByRole("heading", { name: "Flogging Result" }),
  ).toBeVisible({ timeout: 10000 });
  await hostPage.getByRole("button", { name: "Done" }).click();
  await expect(
    hostPage.getByRole("heading", { name: "Flogging Result" }),
  ).not.toBeVisible();

  // 8. Verify restriction
  // Link should be clickable but look disabled
  const floggingLink = hostPage.getByRole("button", {
    name: "Flogging (Used)",
  });
  await expect(floggingLink).toBeVisible();
  await expect(floggingLink).toHaveClass(/bg-slate-800\/50/); // Check for disabled style

  // Clicking it should trigger an alert (since it's already used)
  hostPage.once("dialog", (dialog) => dialog.accept());
  await floggingLink.click({ noWaitAfter: true });

  await expect(hostPage.getByText("Crew Status")).toBeVisible();
});
