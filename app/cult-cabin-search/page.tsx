"use client";

import { AlertCircle, CheckCircle, Clock, Eye, X, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "../components/Avatar";
import { FeedbackCard } from "../components/FeedbackCard";
import { Quiz } from "../components/Quiz";
import { useGame } from "../context/GameContext";
import { QUIZ_QUESTIONS } from "../data/quiz";
import type { Role } from "../types";

export default function CultCabinSearchPage() {
  const router = useRouter();
  const {
    lobby,
    myPlayerId,
    myRole,
    claimCabinSearchRole,
    cancelCabinSearch,
    submitCabinSearchAction,
    error,
    setError,
  } = useGame();

  const [timeLeft, setTimeLeft] = useState(15); // 15 seconds
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  // Redirect if no lobby
  useEffect(() => {
    if (!lobby) {
      router.push("/");
    }
  }, [lobby, router]);

  const cabinSearchStatus = lobby?.cabinSearchStatus;
  const isCultLeader = myRole === "CULT_LEADER";
  const myClaim = cabinSearchStatus?.claims?.[myPlayerId];

  // Timer Logic
  useEffect(() => {
    if (cabinSearchStatus?.state === "ACTIVE" && cabinSearchStatus.startTime) {
      const startTime = cabinSearchStatus.startTime;
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, Math.ceil((15000 - elapsed) / 1000));
        setTimeLeft(remaining);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [cabinSearchStatus?.state, cabinSearchStatus?.startTime]);

  // Redirect if cabin search is not active (cancelled or invalid state)
  useEffect(() => {
    if (
      lobby &&
      (!cabinSearchStatus || cabinSearchStatus.state === "CANCELLED")
    ) {
      router.push("/game");
    }
  }, [lobby, cabinSearchStatus, router]);

  if (!lobby || !cabinSearchStatus) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  // --- SETUP PHASE: Role Selection ---
  if (cabinSearchStatus.state === "SETUP") {
    const claims = cabinSearchStatus.claims;
    const captainClaimed = Object.values(claims).includes("CAPTAIN");
    const navigatorClaimed = Object.values(claims).includes("NAVIGATOR");
    const lieutenantClaimed = Object.values(claims).includes("LIEUTENANT");

    const activePlayers = lobby.players.filter(
      (p) => !p.isEliminated && p.isOnline,
    );
    const allClaimed = activePlayers.every((p) => claims[p.id]);

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <Eye className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl font-bold text-white">Cult Cabin Search</h1>
          </div>

          <p className="text-slate-300">
            Identify your role on the ship. Captain, Navigator, and Lieutenant
            will be revealed to the Cult Leader.
          </p>

          {/* Player List with Status */}
          {myClaim && (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {activePlayers.map((p) => {
                const claim = claims[p.id];
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar url={p.photoUrl} size="sm" />
                      <span className="text-slate-200 font-medium">
                        {p.name}
                      </span>
                    </div>
                    {claim ? (
                      <span className="text-green-400 text-sm font-bold flex items-center gap-1">
                        {claim}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-sm font-bold flex items-center gap-1">
                        Pending...
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Role Selection for Current Player */}
          {!myClaim && (
            <div className="pt-4 border-t border-slate-800">
              <h2 className="text-lg font-bold text-white text-center mb-4">
                Select Your Role
              </h2>
              {error && (
                <div className="p-3 bg-red-950/90 border border-red-500/50 text-red-200 rounded-lg flex items-start animate-in slide-in-from-top-2 mb-4">
                  <AlertCircle className="w-5 h-5 mr-2 shrink-0 text-red-500 mt-0.5" />
                  <p className="text-sm">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    type="button"
                    className="ml-auto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="space-y-3">
                <RoleButton
                  label="Captain"
                  isSelected={false}
                  isDisabled={false}
                  onSelect={() => {
                    if (captainClaimed) {
                      setError("This role has already been claimed.");
                      return;
                    }
                    claimCabinSearchRole("CAPTAIN");
                  }}
                  claimedBy={
                    captainClaimed
                      ? lobby.players.find((p) => claims[p.id] === "CAPTAIN")
                          ?.name
                      : undefined
                  }
                />
                <RoleButton
                  label="Navigator"
                  isSelected={false}
                  isDisabled={false}
                  onSelect={() => {
                    if (navigatorClaimed) {
                      setError("This role has already been claimed.");
                      return;
                    }
                    claimCabinSearchRole("NAVIGATOR");
                  }}
                  claimedBy={
                    navigatorClaimed
                      ? lobby.players.find((p) => claims[p.id] === "NAVIGATOR")
                          ?.name
                      : undefined
                  }
                />
                <RoleButton
                  label="Lieutenant"
                  isSelected={false}
                  isDisabled={false}
                  onSelect={() => {
                    if (lieutenantClaimed) {
                      setError("This role has already been claimed.");
                      return;
                    }
                    claimCabinSearchRole("LIEUTENANT");
                  }}
                  claimedBy={
                    lieutenantClaimed
                      ? lobby.players.find((p) => claims[p.id] === "LIEUTENANT")
                          ?.name
                      : undefined
                  }
                />
                <RoleButton
                  label="Crew Member"
                  isSelected={false}
                  isDisabled={false}
                  onSelect={() => claimCabinSearchRole("CREW")}
                />
              </div>
            </div>
          )}

          {/* Waiting state after selection */}
          {myClaim && !allClaimed && (
            <div className="flex flex-col gap-3 pt-4 border-t border-slate-800">
              <p className="text-center text-slate-500 italic">
                Waiting for others...
              </p>
            </div>
          )}

          {/* Cancel Button */}
          <button
            type="button"
            onClick={() => {
              cancelCabinSearch();
              router.push("/game");
            }}
            className="w-full py-3 bg-red-900/30 hover:bg-red-900/50 text-red-200 rounded-xl font-bold transition-colors border border-red-900/50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // --- ACTIVE PHASE: Timer + Quiz for Crew / Reveal for Cult Leader ---
  if (cabinSearchStatus.state === "ACTIVE") {
    const claims = cabinSearchStatus.claims;

    const captain = lobby.players.find((p) => claims[p.id] === "CAPTAIN");
    const navigator = lobby.players.find((p) => claims[p.id] === "NAVIGATOR");
    const lieutenant = lobby.players.find((p) => claims[p.id] === "LIEUTENANT");

    if (isCultLeader) {
      // Cult Leader sees the revealed roles
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-6 h-6" />
                Cult Cabin Search
              </h1>
              <div className="flex items-center gap-2 text-2xl font-mono font-bold text-white bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
                <Clock className="w-5 h-5 text-slate-400" />
                <span
                  className={timeLeft <= 60 ? "text-red-500 animate-pulse" : ""}
                >
                  {Math.floor(timeLeft / 60)}:
                  {String(timeLeft % 60).padStart(2, "0")}
                </span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-lg font-bold text-white">Revealed Roles</h2>
                <p className="text-slate-400 text-sm">
                  The following players have identified themselves:
                </p>
              </div>

              <div className="space-y-4">
                {captain && (
                  <RevealedPlayerCard
                    player={captain}
                    roleName="Captain"
                    actualRole={lobby.assignments?.[captain.id] || null}
                  />
                )}
                {navigator && (
                  <RevealedPlayerCard
                    player={navigator}
                    roleName="Navigator"
                    actualRole={lobby.assignments?.[navigator.id] || null}
                  />
                )}
                {lieutenant && (
                  <RevealedPlayerCard
                    player={lieutenant}
                    roleName="Lieutenant"
                    actualRole={lobby.assignments?.[lieutenant.id] || null}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // All other players (Crew, Captain, Navigator, Lieutenant) see quiz
    const questionIndex = cabinSearchStatus.playerQuestions?.[myPlayerId];
    // If no question assigned yet (should happen immediately but TS check), fallback or load
    if (questionIndex === undefined) return null;

    const question = QUIZ_QUESTIONS[questionIndex];

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-cyan-500 uppercase tracking-wider">
              {myClaim === "CREW" ? "Crew Quiz" : "Cabin Inspection"}
            </h1>
            <div className="flex items-center gap-2 text-2xl font-mono font-bold text-white bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
              <Clock className="w-5 h-5 text-slate-400" />
              <span
                className={timeLeft <= 10 ? "text-red-500 animate-pulse" : ""}
              >
                {Math.floor(timeLeft / 60)}:
                {String(timeLeft % 60).padStart(2, "0")}
              </span>
            </div>
          </div>

          <Quiz.Root
            selectedAnswerId={selectedAnswer}
            onSelect={(optionId) => {
              setSelectedAnswer(optionId);
              submitCabinSearchAction(optionId);
            }}
          >
            <Quiz.Header
              title="Prove Your Worth"
              description="Answer correctly to please the Kraken."
            />
            <Quiz.Question text={question.question} />
            <Quiz.OptionsList options={question.options} />
          </Quiz.Root>
        </div>
      </div>
    );
  }

  // --- COMPLETED PHASE: Feedback ---
  if (cabinSearchStatus.state === "COMPLETED") {
    const isCorrect =
      cabinSearchStatus.result?.correctAnswers.includes(myPlayerId) || false;

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-1000">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-black text-white uppercase tracking-wider">
              Ritual Complete
            </h1>
          </div>
          {myClaim !== "CREW" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
              <Eye className="w-16 h-16 text-amber-500 mx-auto" />
              <h2 className="text-xl font-bold text-white">Role Revealed</h2>
              <p className="text-slate-400">
                The Cult Leader has seen your identity.
              </p>
            </div>
          )}

          {isCultLeader === false && (
            <FeedbackCard.Root variant={isCorrect ? "success" : "error"}>
              <FeedbackCard.Icon icon={isCorrect ? CheckCircle : XCircle} />
              <FeedbackCard.Title>
                {isCorrect ? "Correct Answer!" : "Wrong Answer"}
              </FeedbackCard.Title>
              <FeedbackCard.Description>
                {isCorrect
                  ? "You have proven your worth to the sea."
                  : "The Kraken is displeased with your ignorance."}
              </FeedbackCard.Description>
            </FeedbackCard.Root>
          )}

          <Link
            href="/game"
            className="block w-full py-4 bg-slate-900 hover:bg-slate-800 text-center text-slate-400 hover:text-white rounded-xl font-bold transition-all border border-slate-800 hover:border-slate-700"
          >
            Return to Ship
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

function RoleButton({
  label,
  isSelected,
  isDisabled,
  onSelect,
  claimedBy,
}: {
  label: string;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: () => void;
  claimedBy?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isDisabled}
      className={`w-full p-4 rounded-xl border text-left transition-all ${
        isSelected
          ? "bg-amber-900/40 border-amber-500 ring-2 ring-amber-500/50 text-amber-100"
          : isDisabled
            ? "bg-slate-800/30 border-slate-700 text-slate-500 cursor-not-allowed"
            : "bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600 text-slate-300"
      }`}
    >
      <div className="font-bold">{label}</div>
      {claimedBy && (
        <div className="text-xs text-slate-500 mt-1">
          Claimed by {claimedBy}
        </div>
      )}
    </button>
  );
}

function RevealedPlayerCard({
  player,
  roleName,
  actualRole,
}: {
  player: { name: string; photoUrl: string | null };
  roleName: string;
  actualRole: Role | null;
}) {
  const getRoleColor = (role: Role | null) => {
    switch (role) {
      case "PIRATE":
        return "text-red-400";
      case "CULT_LEADER":
        return "text-amber-500";
      case "CULTIST":
        return "text-purple-400";
      default:
        return "text-cyan-400";
    }
  };

  const getRoleLabel = (role: Role | null) => {
    if (!role) return "Unknown";
    return role.replace("_", " ");
  };

  return (
    <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
      <Avatar url={player.photoUrl} size="md" />
      <div className="flex-1">
        <p className="text-sm font-bold text-slate-200">{player.name}</p>
        <p className="text-xs text-slate-500">{roleName}</p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-bold ${getRoleColor(actualRole)}`}>
          {getRoleLabel(actualRole)}
        </p>
      </div>
    </div>
  );
}
