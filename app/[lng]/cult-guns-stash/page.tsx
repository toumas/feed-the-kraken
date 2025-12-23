"use client";

import {
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Ghost,
  Minus,
  Plus,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "../../components/Avatar";
import { FeedbackCard } from "../../components/FeedbackCard";
import { Quiz } from "../../components/Quiz";
import { useGame } from "../../context/GameContext";
import { useT } from "../../i18n/client";
import { QUIZ_QUESTIONS } from "../../data/quiz";

export default function CultGunsStashPage() {
  const router = useRouter();
  const {
    lobby,
    myPlayerId,
    myRole,
    confirmGunsStashReady,
    submitGunsStashDistribution,
    submitGunsStashAction,
    cancelGunsStash,
    isGunsStashDismissed,
  } = useGame();
  const { t } = useT("common");

  const [timeLeft, setTimeLeft] = useState(15);
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      setError(null);
    };
  }, []);

  // Redirect if no lobby
  useEffect(() => {
    if (!lobby) {
      router.push("/");
    }
  }, [lobby, router]);

  const gunsStashStatus = lobby?.gunsStashStatus;
  const isCultLeader = myRole === "CULT_LEADER";

  // Redirect if no active guns stash (unless completed)
  // Also redirect if CANCELLED (handled by GameView modal)
  useEffect(() => {
    if (
      !gunsStashStatus ||
      (!isGunsStashDismissed && gunsStashStatus.state === "CANCELLED")
    ) {
      router.push("/game");
    }
  }, [gunsStashStatus, isGunsStashDismissed, router]);

  // Auto-submit distribution whenever it changes (only if there are actual assignments)
  useEffect(() => {
    const totalGuns = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (totalGuns > 0) {
      submitGunsStashDistribution(distribution);
    }
  }, [distribution, submitGunsStashDistribution]);

  // Timer Logic
  useEffect(() => {
    if (
      gunsStashStatus?.state === "DISTRIBUTION" &&
      gunsStashStatus.startTime
    ) {
      const startTime = gunsStashStatus.startTime;
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, Math.ceil((15000 - elapsed) / 1000));
        setTimeLeft(remaining);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gunsStashStatus?.state, gunsStashStatus?.startTime]);

  if (!gunsStashStatus) return null;

  // --- WAITING FOR PLAYERS PHASE ---
  if (gunsStashStatus.state === "WAITING_FOR_PLAYERS") {
    const isReady = gunsStashStatus.readyPlayers.includes(myPlayerId);
    // Calculate progress for Cult Leader
    const activePlayers =
      lobby?.players.filter((p) => !p.isEliminated && p.isOnline) || [];

    // Sort active players to show myself first, then others
    const sortedPlayers = [...activePlayers].sort((a, b) => {
      if (a.id === myPlayerId) return -1;
      if (b.id === myPlayerId) return 1;
      return a.name.localeCompare(b.name);
    });

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-1000">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 space-y-6 rounded-2xl">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <Eye className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl font-bold text-white">
              {t("cultGunsStash.title")}
            </h1>
          </div>

          {/* Player List with Status */}
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {sortedPlayers.map((p) => {
              const ready = gunsStashStatus.readyPlayers.includes(p.id);
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <Avatar url={p.photoUrl} size="sm" />
                    <span className="text-slate-200 font-medium">{p.name}</span>
                  </div>
                  {ready ? (
                    <span className="text-green-400 text-sm font-bold flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      {t("roleSelection.ready")}
                    </span>
                  ) : (
                    <span className="text-slate-500 text-sm font-bold flex items-center gap-1">
                      {t("roleSelection.pending")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="p-3 bg-red-950/90 border border-red-500/50 text-red-200 rounded-lg flex items-start animate-in slide-in-from-top-2">
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

          <div className="flex gap-3">
            {/* Cancel Button */}
            <button
              type="button"
              onClick={cancelGunsStash}
              className="px-6 py-4 bg-red-900/30 hover:bg-red-900/50 text-red-200 rounded-xl font-bold transition-colors border border-red-900/50"
            >
              {t("actions.cancel")}
            </button>
            <button
              type="button"
              onClick={() => {
                if (isReady) {
                  setError("You are already ready.");
                  return;
                }
                confirmGunsStashReady();
              }}
              className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2
                   ${
                     isReady
                       ? "bg-green-900/50 text-green-400 border border-green-800"
                       : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20"
                   }`}
            >
              {isReady ? (
                <>
                  <CheckCircle className="w-6 h-6" />
                  <span>{t("cultGunsStash.waiting")}</span>
                </>
              ) : (
                <span>{t("cultGunsStash.imReady")}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- DISTRIBUTION PHASE ---
  if (gunsStashStatus.state === "DISTRIBUTION") {
    if (!isCultLeader) {
      const questionIndex = gunsStashStatus.playerQuestions?.[myPlayerId];
      if (questionIndex === undefined) return null;

      const question = QUIZ_QUESTIONS[questionIndex];

      return (
        <div className="flex flex-col min-h-screen bg-slate-950 items-center justify-center p-6">
          <div className="max-w-md w-full space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-6 h-6" />
                {t("cultGunsStash.title")}
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
                submitGunsStashAction(optionId);
              }}
            >
              <Quiz.Header
                title={t("conversion.proveWorth")}
                description={t("conversion.proveWorthDesc")}
              />
              <Quiz.Question text={t(question.question)} />
              <Quiz.OptionsList
                options={question.options.map((opt) => ({
                  ...opt,
                  text: t(opt.text),
                }))}
              />
            </Quiz.Root>
          </div>
        </div>
      );
    }

    // Cult Leader View
    const activePlayers =
      lobby?.players.filter((p) => !p.isEliminated && p.isOnline) || [];
    const usedGuns = Object.values(distribution).reduce(
      (sum, count) => sum + count,
      0,
    );
    const valid = usedGuns === 3;

    return (
      <div className="flex flex-col min-h-screen bg-slate-950 items-center justify-center p-6">
        <div className="max-w-md w-full mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-6 h-6" />
              {t("cultGunsStash.title")}
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

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex justify-between items-center px-2">
              <p className="text-sm text-slate-400">
                {t("cultGunsStash.distributeTitle")}
              </p>
              <span
                className={`font-mono font-bold ${valid ? "text-green-400" : "text-slate-400"}`}
              >
                {t("cultGunsStash.usedCount", { count: usedGuns })}
              </span>
            </div>

            <div className="space-y-2">
              {activePlayers.map((player) => {
                const count = distribution[player.id] || 0;
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-xl border ${count > 0 ? "bg-amber-950/30 border-amber-800" : "bg-slate-800/50 border-slate-700"}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        url={player.photoUrl}
                        size="sm"
                        className="w-10 h-10"
                      />
                      <span className="font-medium">{player.name}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const newCount = Math.max(0, count - 1);
                          setDistribution((prev) => ({
                            ...prev,
                            [player.id]: newCount,
                          }));
                        }}
                        disabled={count === 0}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-300 disabled:opacity-30 active:bg-slate-700"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <span className="w-4 text-center font-bold text-lg">
                        {count}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          if (usedGuns < 3) {
                            setDistribution((prev) => ({
                              ...prev,
                              [player.id]: count + 1,
                            }));
                          }
                        }}
                        disabled={usedGuns >= 3}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-700 text-white disabled:opacity-30 disabled:bg-slate-800 active:bg-amber-600"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 text-center border-t border-slate-800">
              <p className="text-sm font-bold text-slate-500">
                {3 - usedGuns === 0
                  ? t("cultGunsStash.distComplete")
                  : t("cultGunsStash.distMore", { count: 3 - usedGuns })}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- COMPLETED PHASE ---
  if (gunsStashStatus.state === "COMPLETED") {
    const myGuns = gunsStashStatus.distribution?.[myPlayerId] || 0;
    const isCorrect =
      gunsStashStatus.results?.correctAnswers.includes(myPlayerId) || false;

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-1000">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-black text-white uppercase tracking-wider">
              {t("conversion.ritualComplete")}
            </h1>
          </div>

          {/* Info Card: Guns Received */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
            {myGuns > 0 ? (
              <>
                <div className="text-4xl mb-4">🔫</div>
                <h2 className="text-xl font-bold text-white">
                  {t("cultGunsStash.receivedCount", { count: myGuns })}
                </h2>
                <p className="text-slate-400">{t("cultGunsStash.useWisely")}</p>
              </>
            ) : (
              <>
                <Ghost className="w-16 h-16 text-slate-600 mx-auto" />
                <h2 className="text-xl font-bold text-white">
                  {t("cultGunsStash.emptyHands")}
                </h2>
                <p className="text-slate-400">{t("cultGunsStash.noGuns")}</p>
              </>
            )}
          </div>

          {/* Quiz Result for Non-Leaders */}
          {!isCultLeader && (
            <FeedbackCard.Root variant={isCorrect ? "success" : "error"}>
              <FeedbackCard.Icon icon={isCorrect ? CheckCircle : XCircle} />
              <FeedbackCard.Title>
                {isCorrect
                  ? t("conversion.correctAnswer")
                  : t("conversion.wrongAnswer")}
              </FeedbackCard.Title>
              <FeedbackCard.Description>
                {isCorrect
                  ? t("conversion.correctDesc")
                  : t("conversion.wrongDesc")}
              </FeedbackCard.Description>
            </FeedbackCard.Root>
          )}

          <Link
            href="/game"
            className="block w-full py-4 bg-slate-900 hover:bg-slate-800 text-center text-slate-400 hover:text-white rounded-xl font-bold transition-all border border-slate-800 hover:border-slate-700"
          >
            {t("conversion.returnToShip")}
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
