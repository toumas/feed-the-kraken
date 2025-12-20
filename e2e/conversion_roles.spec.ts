import { expect, type Page, test } from "@playwright/test";
import { identifyRole, checkRoleVisible, withRoleRevealed } from "./helpers";

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
    await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 15000 });

    // Get the room code
    const codeElement = hostPage.locator("p.font-mono");
    await expect(codeElement).toBeVisible();
    const code = await codeElement.innerText();
    console.log(`Lobby created with code: ${code}`);

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
      await expect(page).toHaveURL(/\/lobby/, { timeout: 15000 });
      players.push({ context, page, name: playerName });
    }

    // 3. Host starts game
    await expect(hostPage.getByText("Crew Manifest (6/11)")).toBeVisible();
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    await expect(hostPage).toHaveURL(/\/game/, { timeout: 30000 });

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

    console.log(`Cult Leader: ${cultLeaderName}`);
    console.log(`Pirates: ${pirates.map((p) => p.name).join(", ")}`);

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
    await expect(cultLeaderPage).toHaveURL(/.*\/conversion/, {
      timeout: 30000,
    });
    await expect(
      cultLeaderPage.getByRole("heading", { name: "Choose a Convert" }),
    ).toBeVisible({ timeout: 15000 });

    // Select target pirate
    const targetLabel = cultLeaderPage
      .locator("label")
      .filter({ hasText: targetPirate.name });
    await targetLabel.click();

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
      await page.getByRole("link", { name: "Return to Ship" }).click();
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
      await expect(targetPirate.page.getByText("Cultist")).toBeVisible();
      await expect(targetPirate.page.getByText("Your Leader")).toBeVisible();
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
});
