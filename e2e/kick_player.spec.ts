import { expect, test } from "@playwright/test";

test.describe("Kick Player Flow", () => {
  test("Host kicks player and player can rejoin", async ({ browser }) => {
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

    // Host saves profile and goes to lobby
    await expect(
      hostPage.getByRole("heading", { name: /Identify Yourself/i }),
    ).toBeVisible();
    await hostPage.getByRole("button", { name: "Save Profile" }).click();
    await expect(hostPage.getByText("Crew Manifest")).toBeVisible();

    // Get the room code
    const codeElement = hostPage.locator("p.font-mono");
    await expect(codeElement).toBeVisible();
    const code = await codeElement.innerText();

    // 2. Player joins the lobby
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await playerPage.addInitScript(() => {
      localStorage.setItem("kraken_player_name", "TestPlayer");
      localStorage.setItem(
        "kraken_player_photo",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      );
    });
    await playerPage.goto("/");
    await playerPage.getByRole("button", { name: "Join Crew" }).click();
    await playerPage.getByPlaceholder("XP7K9L").fill(code);
    await playerPage.getByRole("button", { name: "Board Ship" }).click();
    await expect(
      playerPage.getByRole("heading", { name: /Identify Yourself/i }),
    ).toBeVisible();
    await playerPage.getByRole("button", { name: "Save Profile" }).click();
    await expect(playerPage.getByText("Crew Manifest")).toBeVisible();

    // Verify player is visible in lobby
    await expect(playerPage.getByText("TestPlayer(You)")).toBeVisible();
    await expect(hostPage.getByText("TestPlayer")).toBeVisible();
    await expect(hostPage.getByText("Crew Manifest (2/11)")).toBeVisible();

    // 3. Host kicks the player
    // Find the kick button (X) next to TestPlayer's name
    const playerCard = hostPage
      .locator("div")
      .filter({ hasText: "TestPlayer" })
      .first();
    const kickButton = playerCard.getByTitle("Remove player");
    await expect(kickButton).toBeVisible();
    await kickButton.click();

    // 4. Verify player is removed from host's view
    await expect(hostPage.getByText("Crew Manifest (1/11)")).toBeVisible();
    await expect(hostPage.getByText("TestPlayer")).not.toBeVisible();

    // 5. Player should be redirected to home with kick message
    await expect(
      playerPage.getByRole("heading", { name: "Feed The Kraken" }),
    ).toBeVisible();
    await expect(
      playerPage.getByText("You were removed from the lobby by the host."),
    ).toBeVisible();

    // 6. Player rejoins the lobby
    await playerPage.getByRole("button", { name: "Join Crew" }).click();
    await playerPage.getByPlaceholder("XP7K9L").fill(code);
    await playerPage.getByRole("button", { name: "Board Ship" }).click();
    await expect(
      playerPage.getByRole("heading", { name: /Identify Yourself/i }),
    ).toBeVisible();
    await playerPage.getByRole("button", { name: "Save Profile" }).click();
    await expect(playerPage.getByText("Crew Manifest")).toBeVisible();

    // 7. Verify player is back in the lobby
    await expect(playerPage.getByText("TestPlayer(You)")).toBeVisible();
    await expect(hostPage.getByText("TestPlayer")).toBeVisible();
    await expect(hostPage.getByText("Crew Manifest (2/11)")).toBeVisible();

    // Cleanup
    await hostContext.close();
    await playerContext.close();
  });
});
