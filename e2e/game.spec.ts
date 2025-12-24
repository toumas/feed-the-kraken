import { expect, test } from "@playwright/test";

test("Game flow: 5 Players Join and Start Game", async ({ browser }) => {
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

  // Host should be redirected to Identify page, then save to go to lobby
  await expect(hostPage).toHaveURL(/\/identify\?next=create/);
  await hostPage.getByRole("button", { name: "Save Profile" }).click();

  await expect(hostPage).toHaveURL(/\/lobby/);
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

    // Fill join form
    await page.getByPlaceholder("XP7K9L").fill(code);
    await page.getByRole("button", { name: "Board Ship" }).click();

    // Player should be redirected to Identify page
    await expect(page).toHaveURL(new RegExp(`/identify\\?next=join&code=${code}`));
    await page.getByRole("button", { name: "Save Profile" }).click();

    await expect(page).toHaveURL(/\/lobby/);

    await expect(page.getByText(`${playerName}(You)`)).toBeVisible();
    players.push({ context, page, name: playerName });
  }

  // 3. Host starts game
  // Wait for all players to be visible on host
  await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();

  const startBtn = hostPage.getByRole("button", { name: "Start Voyage" });
  await expect(startBtn).toBeEnabled();
  await startBtn.click();
  await expect(hostPage).toHaveURL(/\/game/);

  // 4. Verify roles
  // Host role
  const hostRoleTitle = hostPage.locator("h2.text-4xl");
  await expect(hostRoleTitle).toBeVisible();
  const hostRole = await hostRoleTitle.innerText();

  const allRoles = [hostRole];

  for (const p of players) {
    const roleTitle = p.page.locator("h2.text-4xl");
    await expect(roleTitle).toBeVisible();
    const role = await roleTitle.innerText();

    allRoles.push(role);
  }

  // Verify distribution
  // 5 players: 1 Cult Leader, AND (1 Pirate, 3 Sailors OR 2 Pirates, 2 Sailors)
  const cultLeaders = allRoles.filter((r) => r === "Cult Leader").length;
  const pirates = allRoles.filter((r) => r === "Pirate").length;
  const sailors = allRoles.filter((r) => r === "Loyal Sailor").length;

  expect(cultLeaders).toBe(1);
  if (pirates === 1) {
    expect(sailors).toBe(3);
  } else {
    expect(pirates).toBe(2);
    expect(sailors).toBe(2);
  }
});
