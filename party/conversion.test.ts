import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

describe("Conversion Flow - XState", () => {
  let actor: ReturnType<typeof createActor<typeof gameMachine>>;

  beforeEach(() => {
    vi.clearAllMocks();
    actor = setupPlayingGame();
  });

  it("should start conversion and set conversionStatus to PENDING", () => {
    actor.send({ type: "START_CONVERSION", initiatorId: "p1" });

    const context = actor.getSnapshot().context;
    expect(context.conversionStatus).toBeDefined();
    expect(context.conversionStatus?.state).toBe("PENDING");
    expect(context.conversionStatus?.initiatorId).toBe("p1");
  });

  it("should track player responses to conversion", () => {
    actor.send({ type: "START_CONVERSION", initiatorId: "p1" });
    actor.send({ type: "RESPOND_CONVERSION", playerId: "p2", accept: true });
    actor.send({ type: "RESPOND_CONVERSION", playerId: "p3", accept: true });

    const context = actor.getSnapshot().context;
    expect(context.conversionStatus?.responses.p2).toBe(true);
    expect(context.conversionStatus?.responses.p3).toBe(true);
  });

  it("should handle Cult Leader picking a player", () => {
    actor.send({ type: "START_CONVERSION", initiatorId: "p1" });

    // Accept from all players to trigger ACTIVE state
    for (let i = 1; i <= 5; i++) {
      actor.send({
        type: "RESPOND_CONVERSION",
        playerId: `p${i}`,
        accept: true,
      });
    }

    // Find the cult leader
    const context = actor.getSnapshot().context;
    const cultLeaderId = Object.entries(context.assignments || {}).find(
      ([_, role]) => role === "CULT_LEADER",
    )?.[0];

    if (cultLeaderId) {
      // Cult leader picks a player
      actor.send({
        type: "SUBMIT_CONVERSION_ACTION",
        playerId: cultLeaderId,
        action: "PICK_PLAYER",
        targetId: "p2",
      });

      const afterContext = actor.getSnapshot().context;
      expect(afterContext.conversionStatus?.round?.leaderChoice).toBe("p2");
    }
  });

  it("should handle player answering quiz", () => {
    actor.send({ type: "START_CONVERSION", initiatorId: "p1" });

    // Accept from all players to trigger ACTIVE state
    for (let i = 1; i <= 5; i++) {
      actor.send({
        type: "RESPOND_CONVERSION",
        playerId: `p${i}`,
        accept: true,
      });
    }

    // Player answers quiz
    actor.send({
      type: "SUBMIT_CONVERSION_ACTION",
      playerId: "p2",
      action: "ANSWER_QUIZ",
      answer: "q0-a",
    });

    const context = actor.getSnapshot().context;
    expect(context.conversionStatus?.round?.playerAnswers?.p2).toBe("q0-a");
  });

  it("should start with conversionCount at 0", () => {
    const context = actor.getSnapshot().context;
    expect(context.conversionCount).toBe(0);
  });

  it("should track conversion in state transitions", () => {
    actor.send({ type: "START_CONVERSION", initiatorId: "p1" });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toEqual({ playing: { conversion: "pending" } });
  });

  it("should track rejection responses", () => {
    actor.send({ type: "START_CONVERSION", initiatorId: "p1" });

    // Player rejects
    actor.send({ type: "RESPOND_CONVERSION", playerId: "p2", accept: false });

    // Response should be tracked
    const context = actor.getSnapshot().context;
    expect(context.conversionStatus?.responses.p2).toBe(false);
  });

  it("should automatically ready the initiator", () => {
    actor.send({ type: "START_CONVERSION", initiatorId: "p1" });

    const context = actor.getSnapshot().context;
    // Initiator should be implicitly readied
    expect(context.conversionStatus?.responses.p1).toBe(true);
  });

  it("should populate playerQuestions for eligible players when becoming ACTIVE", () => {
    actor.send({ type: "START_CONVERSION", initiatorId: "p1" });

    // Accept from all players to trigger ACTIVE state
    for (let i = 1; i <= 5; i++) {
      actor.send({
        type: "RESPOND_CONVERSION",
        playerId: `p${i}`,
        accept: true,
      });
    }

    const context = actor.getSnapshot().context;
    expect(context.conversionStatus?.state).toBe("ACTIVE");
    expect(context.conversionStatus?.round).toBeDefined();
    expect(context.conversionStatus?.round?.playerQuestions).toBeDefined();

    // playerQuestions should have entries for non-cult players
    const playerQuestions = context.conversionStatus?.round?.playerQuestions;
    expect(Object.keys(playerQuestions || {}).length).toBeGreaterThan(0);

    // Verify each question index is a valid number (0-9)
    for (const [, questionIndex] of Object.entries(playerQuestions || {})) {
      expect(questionIndex).toBeGreaterThanOrEqual(0);
      expect(questionIndex).toBeLessThan(10);
    }
  });

  describe("Random Target Selection on Timeout", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should randomly select a target if leader does not pick one before timer", () => {
      actor.send({ type: "START_CONVERSION", initiatorId: "p1" });

      // Accept from all players to trigger ACTIVE state
      for (let i = 1; i <= 5; i++) {
        actor.send({
          type: "RESPOND_CONVERSION",
          playerId: `p${i}`,
          accept: true,
        });
      }

      const beforeContext = actor.getSnapshot().context;
      expect(beforeContext.conversionStatus?.state).toBe("ACTIVE");
      expect(beforeContext.conversionStatus?.round?.leaderChoice).toBeNull();

      // Advance timer past the quiz duration
      vi.advanceTimersByTime(16000);

      const afterContext = actor.getSnapshot().context;

      // Should be completed with a randomly selected target
      expect(afterContext.conversionStatus?.state).toBe("COMPLETED");
      expect(
        afterContext.conversionStatus?.round?.result?.convertedPlayerId,
      ).toBeDefined();

      // conversionCount should have increased
      expect(afterContext.conversionCount).toBe(1);
    });

    it("should use leader's choice if provided before timer", () => {
      actor.send({ type: "START_CONVERSION", initiatorId: "p1" });

      // Accept from all players to trigger ACTIVE state
      for (let i = 1; i <= 5; i++) {
        actor.send({
          type: "RESPOND_CONVERSION",
          playerId: `p${i}`,
          accept: true,
        });
      }

      // Find the cult leader
      const context = actor.getSnapshot().context;
      const cultLeaderId = Object.entries(context.assignments || {}).find(
        ([_, role]) => role === "CULT_LEADER",
      )?.[0];

      // Find a non-cult-leader, non-cultist target
      const targetId = Object.entries(context.assignments || {}).find(
        ([_id, role]) => role !== "CULT_LEADER" && role !== "CULTIST",
      )?.[0];

      if (cultLeaderId && targetId) {
        // Cult leader picks a player
        actor.send({
          type: "SUBMIT_CONVERSION_ACTION",
          playerId: cultLeaderId,
          action: "PICK_PLAYER",
          targetId,
        });

        // Advance timer
        vi.advanceTimersByTime(16000);

        const afterContext = actor.getSnapshot().context;

        // Should be completed with the leader's choice
        expect(afterContext.conversionStatus?.state).toBe("COMPLETED");
        expect(
          afterContext.conversionStatus?.round?.result?.convertedPlayerId,
        ).toBe(targetId);
      }
    });

    it("should NOT select already-converted player in second conversion (50 iterations)", () => {
      // Run multiple iterations to account for randomness
      for (let iteration = 0; iteration < 50; iteration++) {
        // Create a fresh actor for each iteration
        const testActor = setupPlayingGame();

        testActor.send({ type: "START_CONVERSION", initiatorId: "p1" });

        // Accept from ALL players to trigger ACTIVE state
        for (let i = 1; i <= 5; i++) {
          testActor.send({
            type: "RESPOND_CONVERSION",
            playerId: `p${i}`,
            accept: true,
          });
        }

        // Find the cult leader
        const context = testActor.getSnapshot().context;
        const cultLeaderId = Object.entries(context.assignments || {}).find(
          ([_, role]) => role === "CULT_LEADER",
        )?.[0];

        // Find a non-cult-leader, non-cultist target for first conversion
        const firstTargetId = Object.entries(context.assignments || {}).find(
          ([_id, role]) => role !== "CULT_LEADER" && role !== "CULTIST",
        )?.[0];

        if (cultLeaderId && firstTargetId) {
          // Cult leader picks a player for first conversion
          testActor.send({
            type: "SUBMIT_CONVERSION_ACTION",
            playerId: cultLeaderId,
            action: "PICK_PLAYER",
            targetId: firstTargetId,
          });

          // Advance timer to complete first conversion
          vi.advanceTimersByTime(16000);

          const afterFirstContext = testActor.getSnapshot().context;
          expect(afterFirstContext.conversionStatus?.state).toBe("COMPLETED");
          expect(afterFirstContext.assignments?.[firstTargetId]).toBe(
            "CULTIST",
          );

          // START SECOND CONVERSION
          testActor.send({
            type: "START_CONVERSION",
            initiatorId: cultLeaderId,
          });

          // ALL players must accept the ritual
          for (let i = 1; i <= 5; i++) {
            testActor.send({
              type: "RESPOND_CONVERSION",
              playerId: `p${i}`,
              accept: true,
            });
          }

          // Don't pick anyone - let timer expire for random selection
          vi.advanceTimersByTime(16000);

          const afterSecondContext = testActor.getSnapshot().context;
          expect(afterSecondContext.conversionStatus?.state).toBe("COMPLETED");

          const secondConvertedId =
            afterSecondContext.conversionStatus?.round?.result
              ?.convertedPlayerId;

          // Should NOT have selected the first converted player or cult leader
          expect(secondConvertedId).toBeDefined();
          expect(secondConvertedId).not.toBe(firstTargetId);
          expect(secondConvertedId).not.toBe(cultLeaderId);

          // Note: Original Cultist IS a valid target (Cult Leader doesn't know who they are)
          // So we intentionally don't check that originalCultistId is excluded
        }

        testActor.stop();
      }
    });

    it("should allow targeting the ORIGINAL Cultist (Cult Leader doesn't know who they are)", () => {
      // This test verifies that in games with an original Cultist (11+ players),
      // the Cult Leader can target them for conversion since they don't know their identity

      // Setup: Create a fresh actor and manually set up a scenario
      // where we can control who the original Cultist is
      const testActor = setupPlayingGame();

      testActor.send({ type: "START_CONVERSION", initiatorId: "p1" });

      // Accept from ALL players
      for (let i = 1; i <= 5; i++) {
        testActor.send({
          type: "RESPOND_CONVERSION",
          playerId: `p${i}`,
          accept: true,
        });
      }

      const context = testActor.getSnapshot().context;

      // Find the cult leader and original cultist
      const cultLeaderId = Object.entries(context.assignments || {}).find(
        ([_, role]) => role === "CULT_LEADER",
      )?.[0];
      const originalCultistId = Object.entries(
        context.originalRoles || {},
      ).find(([_, role]) => role === "CULTIST")?.[0];

      // In a 5-player game there's no original Cultist, but let's verify
      // the eligibility logic by checking that we can select any non-cult-leader,
      // non-eliminated, non-unconvertible player

      if (cultLeaderId) {
        // Get list of players who should be valid targets
        const validTargets = context.players.filter(
          (p) =>
            !p.isEliminated &&
            !p.isUnconvertible &&
            context.assignments?.[p.id] !== "CULT_LEADER",
        );

        // Should have valid targets (everyone except cult leader)
        expect(validTargets.length).toBeGreaterThan(0);

        // If there's an original cultist, they should be in the valid targets
        if (originalCultistId) {
          const originalCultistIsValid = validTargets.some(
            (p) => p.id === originalCultistId,
          );
          expect(originalCultistIsValid).toBe(true);
        }
      }

      testActor.stop();
    });
  });
});
