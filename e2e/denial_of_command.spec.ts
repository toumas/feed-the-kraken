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

    // Perform Denial
    await hostPage.getByRole("button", { name: "Denial of Command" }).click();
    await hostPage.getByRole("button", { name: "Yes, I Deny Command" }).click();

    // Reload to ensure state is synchronized and we are in Eliminated view
    await hostPage.reload();

    // Click Return to Shore
    await hostPage.getByRole("button", { name: "Return to Shore" }).click();

    // Verify confirmation modal
    await expect(hostPage.getByText("End Session?")).toBeVisible();

    // Test Stay first
    await hostPage.getByRole("button", { name: "Stay" }).click();
    await expect(hostPage.getByText("End Session?")).not.toBeVisible();

    // Now actually leave
    await hostPage.getByRole("button", { name: "Return to Shore" }).click();
    await hostPage.getByRole("button", { name: "Leave" }).click();

    // Should be back at Home Page
    await expect(
      hostPage.getByRole("button", { name: "Create Voyage" }),
    ).toBeVisible();

    await hostContext.close();
  });
});
