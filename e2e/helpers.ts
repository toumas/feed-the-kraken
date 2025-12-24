import type { Page } from "@playwright/test";

/**
 * Presses and holds the "Role Hidden" button to reveal the player's role,
 * then checks if the specified text is visible.
 */
export const checkRoleVisible = async (
  page: Page,
  roleText: string = "Cult Leader",
) => {
  const revealBtn = page.locator("button").filter({ hasText: "Role Hidden" });
  try {
    await revealBtn.waitFor({ state: "attached", timeout: 2000 });
  } catch {
    return false;
  }

  await revealBtn.dispatchEvent("mousedown");
  const isVisible = await revealBtn
    .getByText(roleText, { exact: true })
    .isVisible();
  await revealBtn.dispatchEvent("mouseup");

  return isVisible;
};

/**
 * General helper to hold the reveal button and execute a callback while it's held.
 */
export const withRoleRevealed = async <T>(
  page: Page,
  callback: () => Promise<T>,
): Promise<T | null> => {
  const revealBtn = page.locator("button").filter({ hasText: "Role Hidden" });
  try {
    await revealBtn.waitFor({ state: "attached", timeout: 2000 });
  } catch {
    return null;
  }

  await revealBtn.dispatchEvent("mousedown");
  const result = await callback();
  await revealBtn.dispatchEvent("mouseup");
  return result;
};

/**
 * High-level helper to identify the role of a player.
 */
export const identifyRole = async (page: Page) => {
  const revealBtn = page.locator("button").filter({ hasText: "Role Hidden" });
  return await withRoleRevealed(page, async () => {
    if (
      await revealBtn
        .getByRole("heading", { name: "Cult Leader", exact: true })
        .isVisible()
    )
      return "CULT_LEADER";
    if (
      await revealBtn
        .getByRole("heading", { name: "Pirate", exact: true })
        .isVisible()
    )
      return "PIRATE";
    if (
      await revealBtn
        .getByRole("heading", { name: "Loyal Sailor", exact: true })
        .isVisible()
    )
      return "SAILOR";
    if (await revealBtn.getByText("Cultist", { exact: true }).isVisible())
      return "CULTIST";
    return "UNKNOWN";
  });
};
