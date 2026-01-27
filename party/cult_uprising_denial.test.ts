import { beforeEach, describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import { gameMachine } from "./machine/gameMachine";

// Helper to setup a game with playing state
function setupPlayingGame() {
  const actor = createActor(gameMachine);
  actor.start();

  // Create lobby
  actor.send({
    type: "CREATE_LOBBY",
    playerId: "p1",
    playerName: "P1",
    playerPhoto: null,
    code: "TEST",
  });

  // Add 4 more players for a 5-player game
  for (let i = 2; i <= 5; i++) {
    actor.send({
      type: "JOIN_LOBBY",
      playerId: `p${i}`,
      playerName: `P${i}`,
      playerPhoto: null,
    });
  }

  // Start game
  actor.send({ type: "START_GAME", playerId: "p1" });

  return actor;
}

describe("Cult Uprising Denial - XState", () => {
  let actor: ReturnType<typeof createActor<typeof gameMachine>>;

  beforeEach(() => {
    vi.clearAllMocks();
    actor = setupPlayingGame();
  });

  it("should NOT convert any player if Cult Leader is eliminated", () => {
    vi.useFakeTimers();
    const context = actor.getSnapshot().context;

    // Find the cult leader
    const cultLeaderId = Object.entries(context.assignments || {}).find(
      ([_, role]) => role === "CULT_LEADER",
    )?.[0];

    if (!cultLeaderId) throw new Error("Cult Leader not found");

    // Eliminate Cult Leader via Denial of Command
    actor.send({
      type: "DENIAL_OF_COMMAND",
      playerId: cultLeaderId,
    });

    // Start conversion
    const initiatorId = "p1" === cultLeaderId ? "p2" : "p1";
    actor.send({ type: "START_CONVERSION", initiatorId });

    // All remaining players accept
    const players = actor.getSnapshot().context.players;
    players
      .filter((p) => !p.isEliminated)
      .forEach((p) => {
        actor.send({
          type: "RESPOND_CONVERSION",
          playerId: p.id,
          accept: true,
        });
      });

    // Advance timer to complete conversion
    vi.advanceTimersByTime(31000);

    const finalContext = actor.getSnapshot().context;

    // VERIFY: conversionCount should NOT have increased
    expect(finalContext.conversionCount).toBe(0);

    // More robust check: conversionStatus result should indicate no conversion
    expect(
      finalContext.conversionStatus?.round?.result?.convertedPlayerId,
    ).toBeNull();

    vi.useRealTimers();
  });

  it("should NOT distribute guns randomly if Cult Leader is eliminated", () => {
    vi.useFakeTimers();
    const context = actor.getSnapshot().context;

    // Find the cult leader
    const cultLeaderId = Object.entries(context.assignments || {}).find(
      ([_, role]) => role === "CULT_LEADER",
    )?.[0];

    if (!cultLeaderId) throw new Error("Cult Leader not found");

    // Eliminate Cult Leader
    actor.send({
      type: "DENIAL_OF_COMMAND",
      playerId: cultLeaderId,
    });

    // Start Guns Stash
    const initiatorId = "p1" === cultLeaderId ? "p2" : "p1";
    actor.send({ type: "START_CULT_GUNS_STASH", initiatorId });

    // Ready up all active players
    const activePlayers = actor
      .getSnapshot()
      .context.players.filter((p) => !p.isEliminated);
    activePlayers.forEach((p) => {
      actor.send({ type: "CONFIRM_CULT_GUNS_STASH_READY", playerId: p.id });
    });

    // Advance timer past distribution
    vi.advanceTimersByTime(31000);

    const finalContext = actor.getSnapshot().context;

    // VERIFY: distribution should be empty or Result in 0 guns distributed
    const totalGuns = Object.values(
      finalContext.gunsStashStatus?.distribution || {},
    ).reduce((a, b) => (a as number) + (b as number), 0);
    expect(totalGuns).toBe(0);

    vi.useRealTimers();
  });
});
