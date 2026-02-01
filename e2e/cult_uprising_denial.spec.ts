import { expect, type Page, test } from "@playwright/test";
import { completeIdentifyPage, identifyRole } from "./helpers";

test.describe("Cult Uprising Denial - Parallel E2E", () => {
  test.setTimeout(300000); // 5 minutes timeout

  test("Cult actions result in NO EFFECT after Cult Leader jumps overboard", async ({
    browser,
  }) => {
    // 1. Host creates lobby
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const photoBase64 =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

    await hostPage.addInitScript((photo) => {
      localStorage.setItem("kraken_player_name", "Host");
      localStorage.setItem("kraken_player_photo", photo);
    }, photoBase64);

    await hostPage.goto("/");
    await hostPage.getByRole("button", { name: "Create Voyage" }).click();
    await completeIdentifyPage(hostPage);

    // Get the room code
    const codeElement = hostPage.locator("p.font-mono");
    await expect(codeElement).toBeVisible();
    const code = await codeElement.innerText();
    expect(code).toHaveLength(6);

    // 2. 4 Players join in parallel
    const players = await Promise.all(
      Array.from({ length: 4 }).map(async (_, i) => {
        const pContext = await browser.newContext();
        const pPage = await pContext.newPage();
        const playerName = `Player ${i + 1}`;

        await pPage.addInitScript(
          ({ name, photo }) => {
            localStorage.setItem("kraken_player_name", name);
            localStorage.setItem("kraken_player_photo", photo);
          },
          { name: playerName, photo: photoBase64 },
        );

        await pPage.goto("/");
        await pPage.getByRole("button", { name: "Join Crew" }).click();
        await pPage.getByPlaceholder("XP7K9L").fill(code);
        await completeIdentifyPage(pPage);
        await expect(pPage).toHaveURL(/\/lobby/, { timeout: 30000 });
        return { context: pContext, page: pPage, name: playerName };
      }),
    );

    // 3. Host starts game
    await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();

    const allSessions = [
      { page: hostPage, name: "Host" },
      ...players.map((p) => ({ page: p.page, name: p.name })),
    ];

    // Wait for all to reach game and dismiss Captain modal if present
    await Promise.all(
      allSessions.map(async (session) => {
        await expect(session.page).toHaveURL(/\/game/, { timeout: 30000 });
        const captainModalBtn = session.page.getByRole("button", {
          name: "To the Voyage!",
        });
        await captainModalBtn.click({ timeout: 15000 }).catch(() => {});
      }),
    );

    // 4. Identify Roles for everyone
    const initialRoles: Record<string, string> = {};
    let cultLeaderSession: { page: Page; name: string } | null = null;

    console.log("Identifying roles...");
    for (const session of allSessions) {
      const role = await identifyRole(session.page);
      console.log(`Session ${session.name} identified as ${role}`);
      if (!role || role === "UNKNOWN") {
        throw new Error(`Role not found for ${session.name}`);
      }
      initialRoles[session.name] = role;
      if (role === "CULT_LEADER") {
        cultLeaderSession = session;
      }
    }

    if (!cultLeaderSession) {
      throw new Error("Could not find a Cult Leader in a 5-player game.");
    }
    const clName = cultLeaderSession.name;
    console.log(`Cult Leader identified: ${clName}`);

    // Capture fixed references to avoid TS lints about nullability
    const clPage = cultLeaderSession.page;

    // 5. Cult Leader performs Denial of Command
    const denialBtn = clPage.getByRole("button", {
      name: "Yes, I Deny Command",
    });
    await clPage.getByRole("button", { name: "Denial of Command" }).click();
    await denialBtn.click();

    // Wait for the denial view to be dismissed
    await expect(denialBtn).toBeHidden({ timeout: 10000 });

    // Increase timeout for elimination text to appear (state sync via PartyKit)
    // Use exact: true to avoid matching "eliminated" in the denial description paragraph
    await expect(clPage.getByText("Eliminated", { exact: true })).toBeVisible({
      timeout: 15000,
    });

    // 6. Another player starts Conversion (Ritual)
    const initiatorSession = allSessions.find((s) => s.name !== clName);
    if (!initiatorSession) throw new Error("No initiator found");

    const initPage = initiatorSession.page;
    await initPage
      .getByRole("button", { name: "Conversion to Cult" })
      .waitFor({ state: "visible" });
    await initPage.getByRole("button", { name: "Conversion to Cult" }).click();

    // Everyone living accepts in parallel
    await Promise.all(
      allSessions.map(async (session) => {
        if (session.name !== clName && session.name !== initiatorSession.name) {
          const acceptBtn = session.page.getByRole("button", {
            name: "Accept",
          });
          await acceptBtn.waitFor({ state: "visible", timeout: 15000 });
          await acceptBtn.click();
        }
      }),
    );

    // Wait for conversion completion (timeout handled by machine)
    await initPage.waitForTimeout(32000);

    // Return to ship for everyone living
    await Promise.all(
      allSessions.map(async (session) => {
        if (session.name !== clName) {
          const returnBtn = session.page.getByRole("button", {
            name: "Return to Ship",
            exact: true,
          });
          if (await returnBtn.isVisible()) {
            await returnBtn.click();
          }
        }
      }),
    );

    // 7. ASSERT: Verify No Roles Changed (for living players)
    for (const session of allSessions) {
      if (session.name === clName) {
        // Eliminated player dashboard doesn't show role reveal
        await expect(
          session.page.getByText("Eliminated", { exact: true }),
        ).toBeVisible();
        continue;
      }
      const currentRole = await identifyRole(session.page);
      expect(currentRole).toBe(initialRoles[session.name]);
    }

    // 8. Another player starts Guns Stash
    const gunInitiator = allSessions.find((s) => s.name !== clName);
    if (!gunInitiator) throw new Error("No gun initiator found");

    const gunInitPage = gunInitiator.page;
    await gunInitPage
      .getByRole("button", { name: "Cult's Guns Stash" })
      .waitFor({ state: "visible" });
    await gunInitPage
      .getByRole("button", { name: "Cult's Guns Stash" })
      .click();

    // Everyone living readies up
    await Promise.all(
      allSessions.map(async (session) => {
        if (session.name !== clName) {
          const readyBtn = session.page.getByRole("button", {
            name: "I'm Ready",
          });
          if (await readyBtn.isVisible()) {
            await readyBtn.click();
          }
        }
      }),
    );

    // Wait for distribution to complete
    await gunInitPage.waitForTimeout(32000);

    // 9. ASSERT: Verify No Guns were distributed
    for (const session of allSessions) {
      if (session.name !== clName) {
        // Everyone living should see the result screen (verify via Return button)
        await expect(
          session.page.getByRole("button", { name: "Return to Ship" }),
        ).toBeVisible({ timeout: 15000 });
      }
      await expect(session.page.locator(".gun-badge")).not.toBeVisible();
    }

    // Cleanup
    await hostContext.close();
    await Promise.all(players.map((p) => p.context.close()));
  });
});
