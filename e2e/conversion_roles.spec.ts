import { expect, type Page, test } from "@playwright/test";

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
    await expect(hostPage).toHaveURL(/\/game/, { timeout: 15000 });

    // 4. Identify Roles
    const allPages = [hostPage, ...players.map((p) => p.page)];
    const allNames = ["Host", ...players.map((p) => p.name)];

    let cultLeaderPage: Page | null = null;
    let cultLeaderName = "";
    const pirates: { page: Page; name: string }[] = [];

    const getRole = async (page: Page) => {
      const revealBtn = page
        .locator("button")
        .filter({ hasText: "Role Hidden" });
      await revealBtn.waitFor({ state: "attached" });

      // Move mouse to button and press down
      const box = await revealBtn.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
      }

      // Wait for any role text to appear
      await expect(
        page
          .getByRole("heading", { name: "Cult Leader", exact: true })
          .or(page.getByRole("heading", { name: "Pirate", exact: true }))
          .or(page.getByRole("heading", { name: "Loyal Sailor", exact: true })),
      ).toBeVisible({ timeout: 5000 });

      let role = "UNKNOWN";
      if (
        await page
          .getByRole("heading", { name: "Cult Leader", exact: true })
          .isVisible()
      )
        role = "CULT_LEADER";
      else if (
        await page
          .getByRole("heading", { name: "Pirate", exact: true })
          .isVisible()
      )
        role = "PIRATE";
      else if (
        await page
          .getByRole("heading", { name: "Loyal Sailor", exact: true })
          .isVisible()
      )
        role = "SAILOR";

      await page.mouse.up();
      return role;
    };

    for (let i = 0; i < allPages.length; i++) {
      const role = await getRole(allPages[i]);
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
    await expect(cultLeaderPage).toHaveURL(/.*\/conversion/);
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
    const revealBtnTarget = targetPirate.page
      .locator("button")
      .filter({ hasText: "Role Hidden" });
    const boxTarget = await revealBtnTarget.boundingBox();
    if (boxTarget) {
      await targetPirate.page.mouse.move(
        boxTarget.x + boxTarget.width / 2,
        boxTarget.y + boxTarget.height / 2,
      );
      await targetPirate.page.mouse.down();
    }
    await expect(targetPirate.page.getByText("Cultist")).toBeVisible();
    await expect(targetPirate.page.getByText("Your Leader")).toBeVisible();
    await expect(targetPirate.page.getByText(cultLeaderName)).toBeVisible();
    await targetPirate.page.mouse.up();

    // B. Observer Pirate should still see Converted Pirate in Crew
    const revealBtnObserver = observerPirate.page
      .locator("button")
      .filter({ hasText: "Role Hidden" });
    const boxObserver = await revealBtnObserver.boundingBox();
    if (boxObserver) {
      await observerPirate.page.mouse.move(
        boxObserver.x + boxObserver.width / 2,
        boxObserver.y + boxObserver.height / 2,
      );
      await observerPirate.page.mouse.down();
    }
    await expect(observerPirate.page.getByText("Pirate Crew")).toBeVisible();
    await expect(
      observerPirate.page.getByText(targetPirate.name),
    ).toBeVisible();
    await observerPirate.page.mouse.up();
  });
});
