import { expect, type Page, test } from "@playwright/test";
import {
  completeIdentifyPage,
  identifyRole,
  withRoleRevealed,
} from "./helpers";

test.describe("Conversion Role Display", () => {
  test.setTimeout(120000); // Longer timeout for 6 players and conversion

  test("Converted Pirate Role Display", async ({ browser }) => {
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
    await expect(hostPage.getByText("Crew Manifest")).toBeVisible({
      timeout: 15000,
    });

    // Get the room code
    const codeElement = hostPage.locator("p.font-mono");
    await expect(codeElement).toBeVisible();
    const code = await codeElement.innerText();

    // 2. 5 Players join (Total 6 players for 2 Pirates)
    const players = [];
    for (let i = 0; i < 5; i++) {
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
      await expect(page.getByText("Crew Manifest")).toBeVisible({
        timeout: 15000,
      });
      players.push({ context, page, name: playerName });
    }

    // 3. Host starts game
    await expect(hostPage.getByText("Crew Manifest (6/11)")).toBeVisible();
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    await expect(hostPage.getByText("Crew Manifest")).toBeVisible({
      timeout: 30000,
    });

    // 4. Identify Roles
    const allPages = [hostPage, ...players.map((p) => p.page)];
    const allNames = ["Host", ...players.map((p) => p.name)];

    let cultLeaderPage: Page | null = null;
    let cultLeaderName = "";
    const pirates: { page: Page; name: string }[] = [];

    for (let i = 0; i < allPages.length; i++) {
      const role = await identifyRole(allPages[i]);
      if (role === "CULT_LEADER") {
        cultLeaderPage = allPages[i];
        cultLeaderName = allNames[i];
      } else if (role === "PIRATE") {
        pirates.push({ page: allPages[i], name: allNames[i] });
      }
    }

    if (!cultLeaderPage) throw new Error("No Cult Leader found");
    if (pirates.length < 2)
      throw new Error(`Need at least 2 Pirates, found ${pirates.length}`);

    // 5. Convert one Pirate
    const targetPirate = pirates[0];
    const observerPirate = pirates[1];

    await cultLeaderPage
      .getByRole("button", { name: "Conversion to Cult" })
      .click();

    // Accept ritual
    for (const page of allPages) {
      if (page !== cultLeaderPage) {
        await page.getByRole("button", { name: "Accept" }).click();
      }
    }

    // Perform conversion
    await expect(
      cultLeaderPage.getByRole("heading", { name: "Choose a Convert" }),
    ).toBeVisible({ timeout: 15000 });

    // Select target pirate - scope to conversion modal
    const conversionModal1 = cultLeaderPage
      .locator("div")
      .filter({ hasText: "Choose a Convert" })
      .filter({ has: cultLeaderPage.locator("h2") });
    await conversionModal1
      .locator("label")
      .filter({ hasText: targetPirate.name })
      .click();

    // Answer quiz (everyone answers A)
    for (const p of players) {
      if (p.page !== cultLeaderPage) {
        await p.page.getByRole("button", { name: /^A\./ }).click();
      }
    }
    // Host also answers if not cult leader
    if (hostPage !== cultLeaderPage) {
      await hostPage.getByRole("button", { name: /^A\./ }).click();
    }

    // Wait for results
    await expect(cultLeaderPage.getByText("CONVERSION SUCCESSFUL")).toBeVisible(
      { timeout: 70000 },
    );

    // Return to game
    for (const page of allPages) {
      await page.getByText("Return to Ship", { exact: true }).click();
    }

    // Wait for everyone to be back
    for (const page of allPages) {
      await expect(page).toHaveURL(/\/game/);
    }

    // 6. Verify Roles

    // A. Converted Pirate should see "Cultist" and "Your Leader"
    // A. Converted Pirate should see "Cultist" and "Your Leader"
    // A. Converted Pirate should see "Cultist" and "Your Leader"
    await withRoleRevealed(targetPirate.page, async () => {
      await expect(
        targetPirate.page.getByRole("heading", { name: "Cultist" }),
      ).toBeVisible();
      await expect(
        targetPirate.page.getByRole("heading", { name: "Your Leader" }),
      ).toBeVisible();
      const yourLeaderSection = targetPirate.page
        .locator("div")
        .filter({ hasText: "Your Leader" })
        .last();
      await expect(yourLeaderSection.getByText(cultLeaderName)).toBeVisible();
    });

    // B. Observer Pirate should still see Converted Pirate in Crew
    await withRoleRevealed(observerPirate.page, async () => {
      await expect(observerPirate.page.getByText("Pirate Crew")).toBeVisible();
      const pirateCrewSection = observerPirate.page
        .locator("div")
        .filter({ hasText: "Pirate Crew" })
        .last();
      await expect(
        pirateCrewSection.getByText(targetPirate.name),
      ).toBeVisible();
    });
  });

  test("Cabin Search shows original role and Converted badge for converted player", async ({
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
    await expect(hostPage.getByText("Crew Manifest")).toBeVisible({
      timeout: 15000,
    });

    // Get the room code
    const codeElement = hostPage.locator("p.font-mono");
    await expect(codeElement).toBeVisible();
    const code = await codeElement.innerText();

    // 2. 5 Players join (Total 6 players for 2 Pirates)
    const players = [];
    for (let i = 0; i < 5; i++) {
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
      await expect(page.getByText("Crew Manifest")).toBeVisible({
        timeout: 15000,
      });
      players.push({ context, page, name: playerName });
    }

    // 3. Host starts game
    await expect(hostPage.getByText("Crew Manifest (6/11)")).toBeVisible();
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    await expect(hostPage.getByText("Crew Manifest")).toBeVisible({
      timeout: 30000,
    });

    // 4. Identify Roles
    const allPages = [hostPage, ...players.map((p) => p.page)];
    const allNames = ["Host", ...players.map((p) => p.name)];

    let cultLeaderPage: Page | null = null;
    const sailors: { page: Page; name: string }[] = [];

    for (let i = 0; i < allPages.length; i++) {
      const role = await identifyRole(allPages[i]);
      if (role === "CULT_LEADER") {
        cultLeaderPage = allPages[i];
      } else if (role === "SAILOR") {
        sailors.push({ page: allPages[i], name: allNames[i] });
      }
    }

    if (!cultLeaderPage) throw new Error("No Cult Leader found");
    if (sailors.length < 1)
      throw new Error(`Need at least 1 Sailor, found ${sailors.length}`);

    const targetSailor = sailors[0];
    // Find a sailor who is NOT the target to perform the cabin search
    const searcherSailor =
      sailors.length > 1
        ? sailors[1]
        : (() => {
            throw new Error("Need at least 2 Sailors to run this test");
          })();

    // 5. Convert the target sailor
    await cultLeaderPage
      .getByRole("button", { name: "Conversion to Cult" })
      .click();

    // Accept ritual
    for (const page of allPages) {
      if (page !== cultLeaderPage) {
        await page.getByRole("button", { name: "Accept" }).click();
      }
    }

    // Perform conversion
    await expect(cultLeaderPage.getByText("Ritual in Progress")).toBeVisible({
      timeout: 30000,
    });
    await expect(
      cultLeaderPage.getByRole("heading", { name: "Choose a Convert" }),
    ).toBeVisible({ timeout: 15000 });

    // Select target sailor - scope to conversion modal
    const conversionModal2 = cultLeaderPage
      .locator("div")
      .filter({ hasText: "Choose a Convert" })
      .filter({ has: cultLeaderPage.locator("h2") });
    await conversionModal2
      .locator("label")
      .filter({ hasText: targetSailor.name })
      .click();

    // Answer quiz (everyone answers A)
    for (const p of players) {
      if (p.page !== cultLeaderPage) {
        await p.page.getByRole("button", { name: /^A\./ }).click();
      }
    }
    // Host also answers if not cult leader
    if (hostPage !== cultLeaderPage) {
      await hostPage.getByRole("button", { name: /^A\./ }).click();
    }

    // Wait for results
    await expect(cultLeaderPage.getByText("CONVERSION SUCCESSFUL")).toBeVisible(
      { timeout: 70000 },
    );

    // Return to game
    for (const page of allPages) {
      await page.getByText("Return to Ship", { exact: true }).click();
    }

    // Wait for everyone to be back
    for (const page of allPages) {
      await expect(page.getByText("Crew Status")).toBeVisible();
    }

    // 6. Perform Cabin Search on the converted sailor
    await searcherSailor.page
      .getByRole("button", { name: "Cabin Search", exact: true })
      .click();
    await expect(
      searcherSailor.page.getByRole("heading", {
        name: "Cabin Search",
        level: 1,
      }),
    ).toBeVisible();

    // Select the converted sailor - scope to cabin search modal
    const cabinSearchModal = searcherSailor.page
      .locator("div")
      .filter({ hasText: "Cabin Search" })
      .filter({ has: searcherSailor.page.locator("h1") });
    await cabinSearchModal
      .locator("label")
      .filter({ hasText: targetSailor.name })
      .click();
    await searcherSailor.page
      .getByRole("button", { name: "Confirm Search" })
      .click();

    // Target sailor accepts the search
    await expect(
      targetSailor.page.getByText("wants to search your cabin"),
    ).toBeVisible({ timeout: 10000 });
    await targetSailor.page.getByRole("button", { name: "Accept" }).click();

    // 7. Verify the cabin search result shows original Sailor role AND Converted badge
    // Ensure we stay on the cabin-search page
    await expect(
      searcherSailor.page.getByRole("heading", {
        name: "Cabin Search",
        level: 1,
      }),
    ).toBeVisible();

    // Wait for the result overlay to appear - find by the reveal button
    const revealBtn = searcherSailor.page
      .locator(".fixed")
      .getByRole("button", { name: "Tap 5 times to reveal" });
    await expect(revealBtn).toBeVisible({ timeout: 15000 });

    // Click 5 times to reveal
    for (let i = 0; i < 5; i++) {
      await revealBtn.click();
    }

    // Should show original role (Sailor) and Converted to Cult badge
    const resultOverlay = searcherSailor.page.locator(".fixed");
    await expect(resultOverlay.getByText("Sailor")).toBeVisible({
      timeout: 3000,
    });
    await expect(resultOverlay.getByText("Converted to Cult")).toBeVisible();

    // Click the hide button to hide
    const hideBtn = resultOverlay.getByRole("button", {
      name: "Tap once to hide",
    });
    await hideBtn.click();

    // Cleanup
    await hostContext.close();
    for (const p of players) {
      await p.context.close();
    }
  });
});
