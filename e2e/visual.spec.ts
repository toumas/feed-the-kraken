import { expect, test } from "@playwright/test";
import { completeIdentifyPage, withRoleRevealed } from "./helpers";

/**
 * Visual Regression Tests
 *
 * These tests capture screenshots of key application views and compare them
 * against baseline snapshots to detect unintended visual changes.
 *
 * Run: npm run test:visual
 * Update baselines: npm run test:visual:update
 */

test.describe("Visual Regression Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Set up a test profile to avoid identify redirects
    await page.addInitScript(() => {
      localStorage.setItem("kraken_player_name", "Test Sailor");
      localStorage.setItem(
        "kraken_player_photo",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      );
    });
  });

  test("Home Page", async ({ page }) => {
    await page.goto("/");

    // Wait for page to fully load
    await expect(
      page.getByRole("button", { name: "Create Voyage" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Join Crew" })).toBeVisible();

    await expect(page).toHaveScreenshot("home-page.png", {
      fullPage: true,
    });
  });

  test("Join Page", async ({ page }) => {
    await page.goto("/join");

    // Wait for form elements to load
    await expect(page.getByPlaceholder("XP7K9L")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Board Ship" }),
    ).toBeVisible();

    await expect(page).toHaveScreenshot("join-page.png", {
      fullPage: true,
    });
  });

  test("Identify Page", async ({ page }) => {
    // Clear profile to show identify page
    await page.addInitScript(() => {
      localStorage.removeItem("kraken_player_name");
      localStorage.removeItem("kraken_player_photo");
    });
    await page.goto("/identify");

    // Wait for profile editor to load
    await expect(
      page.getByPlaceholder("Enter your pirate name..."),
    ).toBeVisible();

    await expect(page).toHaveScreenshot("identify-page.png", {
      fullPage: true,
    });
  });

  test("Lobby Page - Connecting", async ({ page }) => {
    await page.goto("/lobby");

    // Wait for connecting state to show
    await expect(page.getByText("Connecting to lobby...")).toBeVisible();

    await expect(page).toHaveScreenshot("lobby-connecting.png", {
      fullPage: true,
    });
  });

  test("Lobby Page - Host View", async ({ browser }) => {
    // Create a new context for the host
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

    // Wait for lobby to load
    await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 15000 });
    await expect(hostPage.getByText("Captain(You)")).toBeVisible();
    await expect(hostPage.locator("p.font-mono")).toBeVisible(); // Ship code

    await expect(hostPage).toHaveScreenshot("lobby-host.png", {
      fullPage: true,
    });

    await hostContext.close();
  });

  test("Lobby Page - With Players", async ({ browser }) => {
    // Create host
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
    await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 15000 });

    // Get the room code
    const codeElement = hostPage.locator("p.font-mono");
    await expect(codeElement).toBeVisible();
    const code = await codeElement.innerText();

    // Join 2 players
    for (let i = 0; i < 2; i++) {
      const playerContext = await browser.newContext();
      const playerPage = await playerContext.newPage();
      const playerName = `Sailor ${i + 1}`;

      await playerPage.addInitScript((name) => {
        localStorage.setItem("kraken_player_name", name);
        localStorage.setItem(
          "kraken_player_photo",
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        );
      }, playerName);

      await playerPage.goto("/");
      await playerPage.getByRole("button", { name: "Join Crew" }).click();
      await playerPage.getByPlaceholder("XP7K9L").fill(code);
      await playerPage.getByRole("button", { name: "Board Ship" }).click();
      await completeIdentifyPage(playerPage);
      await expect(playerPage).toHaveURL(/\/lobby/, { timeout: 15000 });

      // Don't close context yet - keep players connected
    }

    // Wait for players to appear on host's lobby
    await expect(hostPage.getByText("Crew Manifest (3/11)")).toBeVisible();

    await expect(hostPage).toHaveScreenshot("lobby-with-players.png", {
      fullPage: true,
    });

    await hostContext.close();
  });

  test("Game Page - Loading", async ({ page }) => {
    await page.goto("/game");

    // Wait for loading state to show
    await expect(page.getByText("Loading game...")).toBeVisible();

    await expect(page).toHaveScreenshot("game-loading.png", {
      fullPage: true,
    });
  });

  // Loading states for game feature pages
  test("Flogging Page - Loading", async ({ page }) => {
    await page.goto("/flogging");
    await expect(page.getByText("Loading game...")).toBeVisible();
    await expect(page).toHaveScreenshot("flogging-loading.png", {
      fullPage: true,
    });
  });

  test("Denial Page - Loading", async ({ page }) => {
    await page.goto("/denial");
    await expect(page.getByText("Loading game...")).toBeVisible();
    await expect(page).toHaveScreenshot("denial-loading.png", {
      fullPage: true,
    });
  });

  test("Cabin Search Page - Loading", async ({ page }) => {
    await page.goto("/cabin-search");
    await expect(page.getByText("Loading game...")).toBeVisible();
    await expect(page).toHaveScreenshot("cabin-search-loading.png", {
      fullPage: true,
    });
  });

  test("Conversion Page - Loading", async ({ page }) => {
    await page.goto("/conversion");
    await expect(page.getByText("Loading game...")).toBeVisible();
    await expect(page).toHaveScreenshot("conversion-loading.png", {
      fullPage: true,
    });
  });

  test("Cult Cabin Search Page - Loading", async ({ page }) => {
    await page.goto("/cult-cabin-search");
    await expect(page.getByText("Loading game...")).toBeVisible();
    await expect(page).toHaveScreenshot("cult-cabin-search-loading.png", {
      fullPage: true,
    });
  });

  // Note: Cult Guns Stash page redirects to /game without a loading state when not in an active stash
});

/**
 * Action Flow Visual Tests
 *
 * These tests capture screenshots of action pages within an active game context.
 * They use Debug Bots for faster test setup.
 */
test.describe("Action Flow Visual Tests", () => {
  test("Flogging Page - Player Selection", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();

    await hostPage.addInitScript(() => {
      localStorage.setItem("kraken_player_name", "Captain");
      localStorage.setItem(
        "kraken_player_photo",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      );
    });

    // Create lobby and add bots
    await hostPage.goto("/");
    await hostPage.getByRole("button", { name: "Create Voyage" }).click();
    await completeIdentifyPage(hostPage);
    await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 15000 });

    // Add 4 bots to reach minimum players
    for (let i = 0; i < 4; i++) {
      await hostPage.getByRole("button", { name: "Debug Bot" }).click();
    }
    await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();

    // Start game
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    await expect(hostPage).toHaveURL(/\/game/);

    // Navigate to flogging page
    await hostPage.getByRole("link", { name: /Flogging/ }).click();
    await expect(hostPage).toHaveURL(/\/flogging/);

    // Wait for player list to load
    await expect(
      hostPage.getByRole("button", { name: "Flog Player" }),
    ).toBeVisible();

    await expect(hostPage).toHaveScreenshot("flogging-player-selection.png", {
      fullPage: true,
      // Mask player names which may vary
      maxDiffPixelRatio: 0.02,
    });

    await hostContext.close();
  });

  test("Cabin Search Page - Player Selection", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();

    await hostPage.addInitScript(() => {
      localStorage.setItem("kraken_player_name", "Captain");
      localStorage.setItem(
        "kraken_player_photo",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      );
    });

    // Create lobby and add bots
    await hostPage.goto("/");
    await hostPage.getByRole("button", { name: "Create Voyage" }).click();
    await completeIdentifyPage(hostPage);
    await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 15000 });

    // Add 4 bots to reach minimum players
    for (let i = 0; i < 4; i++) {
      await hostPage.getByRole("button", { name: "Debug Bot" }).click();
    }
    await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();

    // Start game
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    await expect(hostPage).toHaveURL(/\/game/);

    // Navigate to cabin search page
    await hostPage.getByRole("link", { name: "Cabin Search" }).click();
    await expect(hostPage).toHaveURL(/\/cabin-search/);

    // Wait for player list to load
    await expect(
      hostPage.getByRole("button", { name: "Confirm Search" }),
    ).toBeVisible();

    await expect(hostPage).toHaveScreenshot(
      "cabin-search-player-selection.png",
      {
        fullPage: true,
        // Mask player names which may vary
        maxDiffPixelRatio: 0.02,
      },
    );

    await hostContext.close();
  });

  test("Denial Page - Confirmation", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();

    await hostPage.addInitScript(() => {
      localStorage.setItem("kraken_player_name", "Captain");
      localStorage.setItem(
        "kraken_player_photo",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      );
    });

    // Create lobby and add bots
    await hostPage.goto("/");
    await hostPage.getByRole("button", { name: "Create Voyage" }).click();
    await completeIdentifyPage(hostPage);
    await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 15000 });

    // Add 4 bots to reach minimum players
    for (let i = 0; i < 4; i++) {
      await hostPage.getByRole("button", { name: "Debug Bot" }).click();
    }
    await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();

    // Start game
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    await expect(hostPage).toHaveURL(/\/game/);

    // Navigate to denial page
    await hostPage.getByRole("link", { name: /Denial of Command/ }).click();
    await expect(hostPage).toHaveURL(/\/denial/);

    // Wait for confirmation UI to load
    await expect(
      hostPage.getByRole("button", { name: "Yes, I Deny Command" }),
    ).toBeVisible();

    await expect(hostPage).toHaveScreenshot("denial-confirmation.png", {
      fullPage: true,
    });

    await hostContext.close();
  });

  test("Game Page - Action Buttons", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();

    await hostPage.addInitScript(() => {
      localStorage.setItem("kraken_player_name", "Captain");
      localStorage.setItem(
        "kraken_player_photo",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      );
    });

    // Create lobby and add bots
    await hostPage.goto("/");
    await hostPage.getByRole("button", { name: "Create Voyage" }).click();
    await completeIdentifyPage(hostPage);
    await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 15000 });

    // Add 4 bots to reach minimum players
    for (let i = 0; i < 4; i++) {
      await hostPage.getByRole("button", { name: "Debug Bot" }).click();
    }
    await expect(hostPage.getByText("Crew Manifest (5/11)")).toBeVisible();

    // Start game
    await hostPage.getByRole("button", { name: "Start Voyage" }).click();
    await expect(hostPage).toHaveURL(/\/game/);

    // Wait for game page with action buttons
    await expect(
      hostPage.getByRole("link", { name: /Flogging/ }),
    ).toBeVisible();

    await expect(hostPage).toHaveScreenshot("game-action-buttons.png", {
      fullPage: true,
      // Mask the role which varies between runs
      mask: [hostPage.locator("h2.text-4xl")],
      maxDiffPixelRatio: 0.02,
    });

    await hostContext.close();
  });
});
