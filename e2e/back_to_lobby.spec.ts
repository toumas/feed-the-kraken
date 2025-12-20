import { test, expect } from "@playwright/test";

test.describe("Back to Lobby", () => {
  test("Host can return to lobby and reset the game state", async ({
    context,
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
    await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 15000 });

    // Get the room code
    const codeElement = hostPage.locator("p.font-mono");
    await expect(codeElement).toBeVisible();
    const code = await codeElement.innerText();
    console.log(`Lobby created with code: ${code}`);

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
      await expect(page).toHaveURL(/\/lobby/, { timeout: 15000 });
      players.push({ context, page, name: playerName });
    }

    // 3. Start the game
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    await expect(hostPage).toHaveURL(/\/game/);

    // 4. Host clicks "Back to Lobby"
    await hostPage.getByRole("button", { name: "Back to Lobby" }).click();

    // 5. Confirm in modal
    await hostPage
      .getByRole("button", { name: "Back to Lobby", exact: true })
      .nth(1)
      .click();

    // 6. Verify both are back in lobby
    await expect(hostPage).toHaveURL(/\/lobby/);
    for (const p of players) {
      await expect(p.page).toHaveURL(/\/lobby/);
    }

    // 7. Verify lobby state is reset (Start Voyage button is visible again for host)
    await expect(
      hostPage.getByRole("button", { name: "Start Voyage" }),
    ).toBeVisible();
  });
});
