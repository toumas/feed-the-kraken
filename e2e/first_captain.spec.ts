import { expect, test } from "@playwright/test";

test("Captain announcement appears for all players and persists dismissal", async ({
  browser,
}) => {
  test.setTimeout(120000);
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

  // 2. 4 Players join in parallel
  const players = await Promise.all(
    Array.from({ length: 4 }).map(async (_, i) => {
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

      // Auto-submit triggers on 6th char, so we wait for redirect instead of clicking
      // Player should be redirected to Identify page
      await expect(page).toHaveURL(
        new RegExp(`/identify\\?next=join&code=${code}`),
      );
      await page.getByRole("button", { name: "Save Profile" }).click();

      await expect(page).toHaveURL(/\/lobby/);

      await expect(page.getByText(`${playerName}(You)`)).toBeVisible();
      return { context, page, name: playerName };
    }),
  );

  // 3. Host starts game
  // Wait for all players to be visible on host
  await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();

  const startBtn = hostPage.getByRole("button", { name: "Start Voyage" });
  await expect(startBtn).toBeEnabled();
  await startBtn.click();
  await expect(hostPage).toHaveURL(/\/game/);

  // 4. Verify Captain Announcement Modal appears for ALL players
  const allPages = [hostPage, ...players.map((p) => p.page)];

  // We need to find out WHO is the captain first to verify the name.
  // The modal uses a large font for the name: text-2xl font-bold text-white
  // We exclude the "First Captain Appointed!" title check here to just get the name first.
  const modalTitle = hostPage.getByText("First Captain Appointed!");
  await expect(modalTitle).toBeVisible();

  // Get the captain name specifically from the modal's large text
  const captainNameLocator = hostPage
    .locator(".text-2xl.font-bold.text-white")
    .first();
  await expect(captainNameLocator).toBeVisible();
  const captainName = await captainNameLocator.innerText();
  console.log(`Captain is: ${captainName}`);

  // Verify for all players
  for (const page of allPages) {
    await expect(page).toHaveURL(/\/game/);
    await expect(page.getByText("First Captain Appointed!")).toBeVisible();

    // Check that the name appears in the modal style
    const nameInModal = page.locator(".text-2xl.font-bold.text-white");
    await expect(nameInModal).toBeVisible();
    await expect(nameInModal).toHaveText(captainName);
  }

  // 5. Dismiss and Verify Persistence
  // Dismiss on Host
  await hostPage.getByRole("button", { name: "To the Voyage!" }).click();
  await expect(hostPage.getByText("First Captain Appointed!")).toBeHidden();

  // Reload Host Page
  await hostPage.reload();
  await expect(hostPage).toHaveURL(/\/game/);
  // Should NOT see the modal
  await expect(hostPage.getByText("First Captain Appointed!")).toBeHidden();

  // Check another player dismisses
  const player1 = players[0];
  await player1.page.getByRole("button", { name: "To the Voyage!" }).click();
  await expect(player1.page.getByText("First Captain Appointed!")).toBeHidden();

  await player1.page.reload();
  // Should NOT see the modal
  await expect(player1.page.getByText("First Captain Appointed!")).toBeHidden();
});
