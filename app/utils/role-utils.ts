import type { Role } from "../types";

export function getRolesForPlayerCount(count: number): Role[] {
  const roles: Role[] = [];

  // Always 1 Cult Leader
  roles.push("CULT_LEADER");

  let sailors = 0;
  let pirates = 0;
  let cultists = 0;

  switch (count) {
    case 5:
      // 5 players: 3 Sailors, 1 Pirate OR 2 Sailors, 2 Pirates
      if (Math.random() < 0.5) {
        sailors = 3;
        pirates = 1;
      } else {
        sailors = 2;
        pirates = 2;
      }
      break;
    case 6:
      sailors = 3;
      pirates = 2;
      break;
    case 7:
      sailors = 4;
      pirates = 2;
      break;
    case 8:
      sailors = 4;
      pirates = 3;
      break;
    case 9:
      sailors = 5;
      pirates = 3;
      break;
    case 10:
      sailors = 5;
      pirates = 4;
      break;
    case 11:
      sailors = 5;
      pirates = 4;
      cultists = 1;
      break;
    case 3:
      sailors = 0;
      pirates = 2;
      break;
    default:
      sailors = count - 1;
      break;
  }

  for (let i = 0; i < sailors; i++) roles.push("SAILOR");
  for (let i = 0; i < pirates; i++) roles.push("PIRATE");
  for (let i = 0; i < cultists; i++) roles.push("CULTIST");

  return roles;
}

/**
 * Returns the set of unique roles possible for a given player count.
 */
export function getPossibleRolesForPlayerCount(count: number): Role[] {
  const roles = getRolesForPlayerCount(count);
  return Array.from(new Set(roles));
}

/**
 * Validates if the selected roles form a valid team composition for the given player count.
 * Based on Feed the Kraken board game rules.
 */
export function isValidComposition(
  roles: Role[],
  playerCount: number,
): boolean {
  const counts = roles.reduce(
    (acc, role) => {
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    },
    {} as Record<Role, number>,
  );

  const sailorCount = counts.SAILOR || 0;
  const pirateCount = counts.PIRATE || 0;
  const cultLeaderCount = counts.CULT_LEADER || 0;
  const cultistCount = counts.CULTIST || 0;

  // Cult Leader is ALWAYS exactly 1
  if (cultLeaderCount !== 1) return false;

  switch (playerCount) {
    case 5:
      // (3 Sailors, 1 Pirate) OR (2 Sailors, 2 Pirates)
      return (
        (sailorCount === 3 && pirateCount === 1) ||
        (sailorCount === 2 && pirateCount === 2)
      );
    case 6:
      return sailorCount === 3 && pirateCount === 2;
    case 7:
      return sailorCount === 4 && pirateCount === 2;
    case 8:
      return sailorCount === 4 && pirateCount === 3;
    case 9:
      return sailorCount === 5 && pirateCount === 3;
    case 10:
      return sailorCount === 5 && pirateCount === 4;
    case 11:
      return sailorCount === 5 && pirateCount === 4 && cultistCount === 1;
    default:
      return roles.length === playerCount;
  }
}
export function getRoleColor(role: Role | null): string {
  switch (role) {
    case "PIRATE":
      return "text-red-500";
    case "CULT_LEADER":
      return "text-amber-500";
    case "CULTIST":
      return "text-green-500";
    case "SAILOR":
      return "text-cyan-500";
    default:
      return "text-cyan-500";
  }
}

/**
 * Sorts players with the current player first, then alphabetically by name.
 */
export function sortPlayersWithSelfFirst<T extends { id: string; name: string }>(
  players: T[],
  myPlayerId: string,
): T[] {
  return [...players].sort((a, b) => {
    if (a.id === myPlayerId) return -1;
    if (b.id === myPlayerId) return 1;
    return a.name.localeCompare(b.name);
  });
}
