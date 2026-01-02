import { expect, type Page } from "@playwright/test";

/**
 * Completes the Identify page flow by clicking Save Profile.
 * This helper assumes localStorage has already been set with player name and photo via addInitScript.
 * Users always go through the Identify page before entering the lobby.
 */
export const completeIdentifyPage = async (page: Page) => {
  // Wait for identify page
  await expect(page).toHaveURL(/\/identify/, { timeout: 15000 });

  // The ProfileEditor will pre-fill from localStorage if name/photo exist
  // Just click Save Profile button
  await page.getByRole("button", { name: /save profile|tallenna/i }).click();
};

/**
 * Clicks the role reveal button 5 times to reveal the player's role,
 * then checks if the specified text is visible, then clicks once to hide.
 */
export const checkRoleVisible = async (
  page: Page,
  roleText: string = "Cult Leader",
) => {
  // Find the reveal button using getByRole with exact name
  const revealBtn = page.getByRole("button", { name: "Tap 5 times to reveal" });
  try {
    await revealBtn.waitFor({ state: "visible", timeout: 5000 });
  } catch {
    return false;
  }

  // Click 5 times (no delay needed)
  for (let i = 0; i < 5; i++) {
    await revealBtn.click();
  }

  // Wait for the reveal animation
  await page.waitForTimeout(300);

  const isVisible = await page.getByText(roleText, { exact: true }).isVisible();

  // Click the hide button
  const hideBtn = page.getByRole("button", { name: "Tap once to hide" });
  await hideBtn.click();

  return isVisible;
};

/**
 * General helper to click the reveal button 5 times to reveal
 * and execute a callback while it's revealed, then click once to hide.
 */
export const withRoleRevealed = async <T>(
  page: Page,
  callback: () => Promise<T>,
): Promise<T | null> => {
  // Find the reveal button using getByRole with exact name
  const revealBtn = page.getByRole("button", { name: "Tap 5 times to reveal" });
  try {
    await revealBtn.waitFor({ state: "visible", timeout: 5000 });
  } catch {
    return null;
  }

  // Click 5 times (no delay needed)
  for (let i = 0; i < 5; i++) {
    await revealBtn.click();
  }

  // Wait for the reveal animation
  await page.waitForTimeout(300);

  const result = await callback();

  // Click the hide button
  const hideBtn = page.getByRole("button", { name: "Tap once to hide" });
  await hideBtn.click();

  return result;
};

/**
 * High-level helper to identify the role of a player.
 */
export const identifyRole = async (page: Page) => {
  return await withRoleRevealed(page, async () => {
    if (
      await page
        .getByRole("heading", { name: "Cult Leader", exact: true })
        .isVisible()
    )
      return "CULT_LEADER";
    if (
      await page
        .getByRole("heading", { name: "Pirate", exact: true })
        .isVisible()
    )
      return "PIRATE";
    if (
      await page
        .getByRole("heading", { name: "Loyal Sailor", exact: true })
        .isVisible()
    )
      return "SAILOR";
    if (await page.getByText("Cultist", { exact: true }).isVisible())
      return "CULTIST";
    return "UNKNOWN";
  });
};
