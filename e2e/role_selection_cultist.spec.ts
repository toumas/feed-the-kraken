import { expect, type Page, test } from "@playwright/test";
import { completeIdentifyPage, withRoleRevealed } from "./helpers";

test.describe("Cult Role Visibility in 11-Player Games", () => {
  test.setTimeout(180000); // 11 players takes time

  test("11 Players: Original Cultist does NOT see Cult Leader", async ({
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
    await completeIdentifyPage(hostPage);
    await hostPage.getByRole("button", { name: "Manual" }).click();
    const code = await hostPage.locator("p.font-mono").innerText();

    // 2. 10 Players join
    const players: { page: Page; name: string }[] = [];
    for (let i = 0; i < 10; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const name = `P${i + 1}`;
      await page.addInitScript((n) => {
        localStorage.setItem("kraken_player_name", n);
        localStorage.setItem(
          "kraken_player_photo",
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        );
      }, name);
      await page.goto("/");
      await page.getByRole("button", { name: "Join Crew" }).click();
      await page.getByPlaceholder("XP7K9L").fill(code);
      await page.getByRole("button", { name: "Board Ship" }).click();
      await completeIdentifyPage(page);
      await expect(page).toHaveURL(/\/lobby/, { timeout: 15000 });
      players.push({ page, name });
    }

    // 3. Start game
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    await expect(hostPage).toHaveURL(/\/role-selection/, { timeout: 30000 });

    // 4. Assign roles: Host=Cult Leader, P1=Cultist (original), rest split between Sailors and Pirates
    // Role composition for 11: 1 CL, 5 Sailors, 4 Pirates, 1 Cultist
    const rolesToSelect = [
      { page: hostPage, role: "Cult Leader", name: "Host" },
      { page: players[0].page, role: "Cultist", name: players[0].name },
      { page: players[1].page, role: "Loyal Sailor", name: players[1].name },
      { page: players[2].page, role: "Loyal Sailor", name: players[2].name },
      { page: players[3].page, role: "Loyal Sailor", name: players[3].name },
      { page: players[4].page, role: "Loyal Sailor", name: players[4].name },
      { page: players[5].page, role: "Loyal Sailor", name: players[5].name },
      { page: players[6].page, role: "Pirate", name: players[6].name },
      { page: players[7].page, role: "Pirate", name: players[7].name },
      { page: players[8].page, role: "Pirate", name: players[8].name },
      { page: players[9].page, role: "Pirate", name: players[9].name },
    ];

    for (const p of rolesToSelect) {
      await expect(p.page).toHaveURL(/\/role-selection/);
      const roleRegex = new RegExp(`^${p.role}`);
      await p.page.getByRole("button", { name: roleRegex }).click();
      await p.page
        .getByRole("button", { name: "Confirm", exact: true })
        .click();
    }

    // 5. Verify game started
    await expect(hostPage).toHaveURL(/\/game/, { timeout: 30000 });

    // 6. Verify: Original Cultist (P1) does NOT see "Your Leader" or Cult Leader's name
    const originalCultistPage = players[0].page;
    await withRoleRevealed(originalCultistPage, async () => {
      // Should see "Cultist" role title
      await expect(
        originalCultistPage.getByRole("heading", {
          name: "Cultist",
          exact: true,
        }),
      ).toBeVisible();
      // Should NOT see "Your Leader" section
      await expect(
        originalCultistPage.getByText("Your Leader"),
      ).not.toBeVisible();
    });

    // 7. Verify: Cult Leader can see their own role
    await withRoleRevealed(hostPage, async () => {
      await expect(
        hostPage.getByRole("heading", { name: "Cult Leader", exact: true }),
      ).toBeVisible();
    });
  });

  test("11 Players: Converted player sees Cult Leader but not other Cultist", async ({
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
    await completeIdentifyPage(hostPage);
    await hostPage.getByRole("button", { name: "Manual" }).click();
    const code = await hostPage.locator("p.font-mono").innerText();

    // 2. 10 Players join
    const players: { page: Page; name: string }[] = [];
    for (let i = 0; i < 10; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const name = `P${i + 1}`;
      await page.addInitScript((n) => {
        localStorage.setItem("kraken_player_name", n);
        localStorage.setItem(
          "kraken_player_photo",
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        );
      }, name);
      await page.goto("/");
      await page.getByRole("button", { name: "Join Crew" }).click();
      await page.getByPlaceholder("XP7K9L").fill(code);
      await page.getByRole("button", { name: "Board Ship" }).click();
      await completeIdentifyPage(page);
      await expect(page).toHaveURL(/\/lobby/, { timeout: 15000 });
      players.push({ page, name });
    }

    // 3. Start game
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    await expect(hostPage).toHaveURL(/\/role-selection/, { timeout: 60000 });

    // 4. Assign roles: Host=Cult Leader, P1=Cultist (original), P2=Sailor (will be converted)
    const rolesToSelect = [
      { page: hostPage, role: "Cult Leader", name: "Host" },
      { page: players[0].page, role: "Cultist", name: players[0].name },
      { page: players[1].page, role: "Loyal Sailor", name: players[1].name },
      { page: players[2].page, role: "Loyal Sailor", name: players[2].name },
      { page: players[3].page, role: "Loyal Sailor", name: players[3].name },
      { page: players[4].page, role: "Loyal Sailor", name: players[4].name },
      { page: players[5].page, role: "Loyal Sailor", name: players[5].name },
      { page: players[6].page, role: "Pirate", name: players[6].name },
      { page: players[7].page, role: "Pirate", name: players[7].name },
      { page: players[8].page, role: "Pirate", name: players[8].name },
      { page: players[9].page, role: "Pirate", name: players[9].name },
    ];

    for (const p of rolesToSelect) {
      await expect(p.page).toHaveURL(/\/role-selection/);
      const roleRegex = new RegExp(`^${p.role}`);
      await p.page.getByRole("button", { name: roleRegex }).click();
      await p.page
        .getByRole("button", { name: "Confirm", exact: true })
        .click();
    }

    await expect(hostPage).toHaveURL(/\/game/, { timeout: 30000 });

    // 5. Convert P2 (Sailor)
    const cultLeaderPage = hostPage;
    const allPages = [hostPage, ...players.map((p) => p.page)];
    const targetSailor = players[1]; // P2 - a sailor to be converted

    // Start conversion
    await cultLeaderPage
      .getByRole("button", { name: "Conversion to Cult" })
      .click();

    // All accept
    for (const page of allPages) {
      if (page !== cultLeaderPage) {
        await page.getByRole("button", { name: "Accept" }).click();
      }
    }

    // Wait for conversion page
    await expect(cultLeaderPage).toHaveURL(/.*\/conversion/, {
      timeout: 30000,
    });
    await expect(
      cultLeaderPage.getByRole("heading", { name: "Choose a Convert" }),
    ).toBeVisible({ timeout: 15000 });

    // Select target sailor
    const targetLabel = cultLeaderPage
      .locator("label")
      .filter({ hasText: targetSailor.name });
    await targetLabel.click();

    // Answer quiz
    for (const page of allPages) {
      if (page !== cultLeaderPage) {
        const quizBtn = page.getByRole("button", { name: /^A\./ });
        if (await quizBtn.isVisible().catch(() => false)) {
          await quizBtn.click();
        }
      }
    }

    // Wait for results
    await expect(cultLeaderPage.getByText("CONVERSION SUCCESSFUL")).toBeVisible(
      { timeout: 70000 },
    );

    // Return to game
    for (const page of allPages) {
      await page.getByRole("link", { name: "Return to Ship" }).click();
    }
    for (const page of allPages) {
      await expect(page).toHaveURL(/\/game/);
    }

    // 6. Verify: Converted Sailor (P2) sees "Your Leader" with Cult Leader's name
    const convertedSailorPage = targetSailor.page;
    await withRoleRevealed(convertedSailorPage, async () => {
      await expect(
        convertedSailorPage.getByRole("heading", {
          name: "Cultist",
          exact: true,
        }),
      ).toBeVisible();
      await expect(convertedSailorPage.getByText("Your Leader")).toBeVisible();
      // Should show Cult Leader's name (Host)
      const yourLeaderSection = convertedSailorPage
        .locator("div")
        .filter({ hasText: "Your Leader" })
        .last();
      await expect(yourLeaderSection.getByText("Host")).toBeVisible();
    });

    // 7. Verify: Original Cultist (P1) still does NOT see Cult Leader
    const originalCultistPage = players[0].page;
    await withRoleRevealed(originalCultistPage, async () => {
      await expect(
        originalCultistPage.getByRole("heading", {
          name: "Cultist",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        originalCultistPage.getByText("Your Leader"),
      ).not.toBeVisible();
    });
  });
});
