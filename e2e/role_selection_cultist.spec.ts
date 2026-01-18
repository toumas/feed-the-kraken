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
    const manualButton = hostPage.getByRole("button", { name: "Manual" });
    await manualButton.click();
    // Wait for the Manual button to show active styling (server confirmation)
    await expect(manualButton).toHaveClass(/bg-cyan-600/, { timeout: 5000 });
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
      await expect(page.getByText("Crew Manifest")).toBeVisible({
        timeout: 15000,
      });
      players.push({ page, name });
    }

    // 3. Start game
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    await expect(
      hostPage.getByRole("heading", { name: "Choose Your Role", level: 1 }),
    ).toBeVisible({
      timeout: 60000,
    });

    // 4. Assign roles: Host=Cult Leader, P1=Cultist (original), rest split between Sailors and Pirates
    // Role composition for 11: 1 CL, 5 Sailors, 4 Pirates, 1 Cultist
    const rolesToSelect = [
      { page: hostPage, role: "Cult Leader", name: "Host" },
      { page: players[0].page, role: "Cultist", name: players[0].name },
      { page: players[1].page, role: "Sailor", name: players[1].name },
      { page: players[2].page, role: "Sailor", name: players[2].name },
      { page: players[3].page, role: "Sailor", name: players[3].name },
      { page: players[4].page, role: "Sailor", name: players[4].name },
      { page: players[5].page, role: "Sailor", name: players[5].name },
      { page: players[6].page, role: "Pirate", name: players[6].name },
      { page: players[7].page, role: "Pirate", name: players[7].name },
      { page: players[8].page, role: "Pirate", name: players[8].name },
      { page: players[9].page, role: "Pirate", name: players[9].name },
    ];

    for (const p of rolesToSelect) {
      await expect(
        p.page.getByRole("heading", { name: "Choose Your Role", level: 1 }),
      ).toBeVisible();
      const roleRegex = new RegExp(`^${p.role}`);
      await p.page.getByRole("button", { name: roleRegex }).click();
      await p.page
        .getByRole("button", { name: "Confirm", exact: true })
        .click();
    }

    // 5. Verify game started
    await expect(hostPage.getByText("Crew status")).toBeVisible({
      timeout: 30000,
    });

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

    // 7. Verify: Cult Leader can see their own role and "Your Converts" section with placeholder
    await withRoleRevealed(hostPage, async () => {
      await expect(
        hostPage.getByRole("heading", { name: "Cult Leader", exact: true }),
      ).toBeVisible();
      // Cult Leader should see "Your Converts" section
      await expect(hostPage.getByText("Your Converts")).toBeVisible();
      // Since no conversions have happened, should show placeholder text
      await expect(
        hostPage.getByText("Converted cultists will appear here"),
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
    const manualButton = hostPage.getByRole("button", { name: "Manual" });
    await manualButton.click();
    // Wait for the Manual button to show active styling (server confirmation)
    await expect(manualButton).toHaveClass(/bg-cyan-600/, { timeout: 5000 });
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
      await expect(page.getByText("Crew Manifest")).toBeVisible({
        timeout: 15000,
      });
      players.push({ page, name });
    }

    // 3. Start game
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    await expect(
      hostPage.getByRole("heading", { name: "Choose Your Role", level: 1 }),
    ).toBeVisible({
      timeout: 60000,
    });

    // 4. Assign roles: Host=Cult Leader, P1=Cultist (original), P2=Sailor (will be converted)
    const rolesToSelect = [
      { page: hostPage, role: "Cult Leader", name: "Host" },
      { page: players[0].page, role: "Cultist", name: players[0].name },
      { page: players[1].page, role: "Sailor", name: players[1].name },
      { page: players[2].page, role: "Sailor", name: players[2].name },
      { page: players[3].page, role: "Sailor", name: players[3].name },
      { page: players[4].page, role: "Sailor", name: players[4].name },
      { page: players[5].page, role: "Sailor", name: players[5].name },
      { page: players[6].page, role: "Pirate", name: players[6].name },
      { page: players[7].page, role: "Pirate", name: players[7].name },
      { page: players[8].page, role: "Pirate", name: players[8].name },
      { page: players[9].page, role: "Pirate", name: players[9].name },
    ];

    for (const p of rolesToSelect) {
      await expect(
        p.page.getByRole("heading", { name: "Choose Your Role", level: 1 }),
      ).toBeVisible();
      const roleRegex = new RegExp(`^${p.role}`);
      await p.page.getByRole("button", { name: roleRegex }).click();
      await p.page
        .getByRole("button", { name: "Confirm", exact: true })
        .click();
    }

    await expect(hostPage.getByText("Crew status")).toBeVisible({
      timeout: 30000,
    });

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
    await expect(cultLeaderPage.getByText("Ritual in Progress")).toBeVisible({
      timeout: 30000,
    });
    await expect(
      cultLeaderPage.getByRole("heading", { name: "Choose a Convert" }),
    ).toBeVisible({ timeout: 15000 });

    // Select target sailor - click the label, not the hidden radio input
    const conversionModal = cultLeaderPage
      .locator("div")
      .filter({ hasText: "Choose a Convert" })
      .filter({ has: cultLeaderPage.locator("h2") });
    await conversionModal
      .locator("label")
      .filter({ hasText: targetSailor.name })
      .click();

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
      await page.getByText("Return to Ship", { exact: true }).click();
    }
    for (const page of allPages) {
      await expect(page.getByText("Crew status")).toBeVisible();
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
      await expect(
        convertedSailorPage.getByRole("heading", { name: "Your Leader" }),
      ).toBeVisible();
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

    // 8. Verify: Cult Leader sees converted Sailor (P2) in "Your Converts" section
    // but does NOT see the original Cultist (P1)
    await withRoleRevealed(cultLeaderPage, async () => {
      await expect(
        cultLeaderPage.getByRole("heading", {
          name: "Cult Leader",
          exact: true,
        }),
      ).toBeVisible();
      await expect(cultLeaderPage.getByText("Your Converts")).toBeVisible();
      // Should show the converted sailor's name, NOT the placeholder anymore
      await expect(
        cultLeaderPage.getByText("Converted cultists will appear here"),
      ).not.toBeVisible();
      const yourConvertsSection = cultLeaderPage
        .locator("div")
        .filter({ hasText: "Your Converts" })
        .last();
      await expect(
        yourConvertsSection.getByText(targetSailor.name),
      ).toBeVisible();
      // The original Cultist should NOT be visible (they weren't converted, they were dealt the role)
      await expect(
        yourConvertsSection.getByText(players[0].name),
      ).not.toBeVisible();
    });
  });

  test("11 Players: Cult Leader can target the ORIGINAL Cultist for conversion", async ({
    browser,
  }) => {
    // This test verifies that the Cult Leader can select the original Cultist
    // as a conversion target, since they don't know who the original Cultist is.
    // The conversion will "succeed" but effectively do nothing (they're already cult).

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
    const manualButton = hostPage.getByRole("button", { name: "Manual" });
    await manualButton.click();
    // Wait for the Manual button to show active styling (server confirmation)
    await expect(manualButton).toHaveClass(/bg-cyan-600/, { timeout: 5000 });
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
      await expect(page.getByText("Crew Manifest")).toBeVisible({
        timeout: 15000,
      });
      players.push({ page, name });
    }

    // 3. Start game with manual role selection
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    await expect(
      hostPage.getByRole("heading", { name: "Choose Your Role", level: 1 }),
    ).toBeVisible({
      timeout: 60000,
    });

    // 4. Assign roles: Host=Cult Leader, P1=Cultist (the original Cultist we will try to convert)
    const originalCultistPlayer = players[0]; // P1 - the original Cultist
    const rolesToSelect = [
      { page: hostPage, role: "Cult Leader", name: "Host" },
      { page: players[0].page, role: "Cultist", name: players[0].name },
      { page: players[1].page, role: "Sailor", name: players[1].name },
      { page: players[2].page, role: "Sailor", name: players[2].name },
      { page: players[3].page, role: "Sailor", name: players[3].name },
      { page: players[4].page, role: "Sailor", name: players[4].name },
      { page: players[5].page, role: "Sailor", name: players[5].name },
      { page: players[6].page, role: "Pirate", name: players[6].name },
      { page: players[7].page, role: "Pirate", name: players[7].name },
      { page: players[8].page, role: "Pirate", name: players[8].name },
      { page: players[9].page, role: "Pirate", name: players[9].name },
    ];

    for (const p of rolesToSelect) {
      await expect(
        p.page.getByRole("heading", { name: "Choose Your Role", level: 1 }),
      ).toBeVisible();
      const roleRegex = new RegExp(`^${p.role}`);
      await p.page.getByRole("button", { name: roleRegex }).click();
      await p.page
        .getByRole("button", { name: "Confirm", exact: true })
        .click();
    }

    await expect(hostPage.getByText("Crew status")).toBeVisible({
      timeout: 30000,
    });

    // 5. Start conversion and verify original Cultist (P1) is in the target list
    const cultLeaderPage = hostPage;
    const allPages = [hostPage, ...players.map((p) => p.page)];

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
    await expect(cultLeaderPage.getByText("Ritual in Progress")).toBeVisible({
      timeout: 30000,
    });
    await expect(
      cultLeaderPage.getByRole("heading", { name: "Choose a Convert" }),
    ).toBeVisible({ timeout: 15000 });

    // 6. Verify the original Cultist (P1) appears as a selectable target
    const conversionModal = cultLeaderPage
      .locator("div")
      .filter({ hasText: "Choose a Convert" })
      .filter({ has: cultLeaderPage.locator("h2") });

    // The original Cultist should be in the list!
    // Use regex with word boundary to avoid matching P10
    const originalCultistLabel = conversionModal.locator("label").filter({
      hasText: new RegExp(
        `^${originalCultistPlayer.name}$|^${originalCultistPlayer.name}[^0-9]`,
      ),
    });
    await expect(originalCultistLabel).toBeVisible();

    // 7. Select the original Cultist for conversion
    await originalCultistLabel.click();

    // Answer quiz from all non-cult-leader players
    for (const page of allPages) {
      if (page !== cultLeaderPage) {
        const quizBtn = page.getByRole("button", { name: /^A\./ });
        if (await quizBtn.isVisible().catch(() => false)) {
          await quizBtn.click();
        }
      }
    }

    // 8. Wait for results - conversion should still complete
    await expect(cultLeaderPage.getByText("CONVERSION SUCCESSFUL")).toBeVisible(
      { timeout: 70000 },
    );

    // Return to game
    for (const page of allPages) {
      await page.getByText("Return to Ship", { exact: true }).click();
    }
    for (const page of allPages) {
      await expect(page.getByText("Crew status")).toBeVisible();
    }

    // 9. Verify the original Cultist:
    // - Is still a Cultist (no change in role)
    // - Can NOW see "Your Leader" since they were converted
    await withRoleRevealed(originalCultistPlayer.page, async () => {
      await expect(
        originalCultistPlayer.page.getByRole("heading", {
          name: "Cultist",
          exact: true,
        }),
      ).toBeVisible();

      // After being converted, original Cultist should now see "Your Leader"
      await expect(
        originalCultistPlayer.page.getByRole("heading", {
          name: "Your Leader",
        }),
      ).toBeVisible();

      // And should see the Cult Leader's name
      const yourLeaderSection = originalCultistPlayer.page
        .locator("div")
        .filter({ hasText: "Your Leader" })
        .last();
      await expect(yourLeaderSection.getByText("Host")).toBeVisible();
    });
  });
});
