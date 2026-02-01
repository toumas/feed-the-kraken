import { expect, test } from "@playwright/test";
import { completeIdentifyPage } from "./helpers";

test.describe("Denial of Command Elimination", () => {
  test("eliminated player can Return to Shore", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();

    await hostPage.addInitScript(() => {
      localStorage.setItem("kraken_player_name", "Captain");
      localStorage.setItem(
        "kraken_player_photo",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      );
    });

    await hostPage.goto("/");
    await hostPage.getByRole("button", { name: "Create Voyage" }).click();
    await completeIdentifyPage(hostPage);

    // Add bots to start game
    for (let i = 0; i < 4; i++) {
      await hostPage.getByRole("button", { name: "Debug Bot" }).click();
    }
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();

    // Handle Captain Announcement Modal
    await expect(hostPage.getByText("First Captain Appointed!")).toBeVisible({
      timeout: 15000,
    });
    await hostPage
      .getByRole("button", { name: /to the voyage|matkaan/i })
      .click();
    await expect(hostPage.getByText("First Captain Appointed!")).toBeHidden();

    // Perform Denial
    await hostPage.getByRole("button", { name: "Denial of Command" }).click();
    await hostPage.getByRole("button", { name: "Yes, I Deny Command" }).click();

    // Wait for the denial confirmation modal to close
    await expect(
      hostPage.getByRole("button", { name: "Yes, I Deny Command" }),
    ).toBeHidden({ timeout: 10000 });

    // After denial, the player should be eliminated and see the dashboard
    // with their player card showing "Eliminated" status
    await expect(hostPage.getByText("Crew Status")).toBeVisible({
      timeout: 15000,
    });

    // Reload to verify state is persisted (elimination is saved on server)
    await hostPage.reload();

    // Verify dashboard is still visible after reload (eliminated players see the same dashboard)
    await expect(hostPage.getByText("Crew Status")).toBeVisible({
      timeout: 15000,
    });

    // For eliminated players, verify they can still see the "End Session?" button
    await hostPage.getByRole("button", { name: "End Session?" }).click();

    // Verify confirmation modal heading is visible
    await expect(
      hostPage.getByRole("heading", { name: "End Session?" }),
    ).toBeVisible();

    // Test Stay first
    await hostPage.getByRole("button", { name: "Stay" }).click();
    await expect(
      hostPage.getByRole("heading", { name: "End Session?" }),
    ).toBeHidden();

    // Now actually leave via End Session
    await hostPage.getByRole("button", { name: "End Session?" }).click();
    await hostPage.getByRole("button", { name: "Leave" }).click();

    // Should be back at Home Page
    await expect(
      hostPage.getByRole("button", { name: "Create Voyage" }),
    ).toBeVisible();

    await hostContext.close();
  });
});
