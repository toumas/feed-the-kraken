"use client";

import { CheckCircle, Clock, Eye, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState } from "react";
import { Avatar } from "../../components/Avatar";
import { FeedbackCard } from "../../components/FeedbackCard";
import { PlayerSelectionList } from "../../components/PlayerSelectionList";
import { Quiz } from "../../components/Quiz";
import { useGame } from "../../context/GameContext";
import { QUIZ_QUESTIONS } from "../../data/quiz";
import { useT } from "../../i18n/client";

export default function ConversionPage() {
  const router = useRouter();
  const { lobby, myPlayerId, myRole, submitConversionAction } = useGame();
  const { t } = useT("common");
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Redirect if no lobby
  useEffect(() => {
    if (!lobby) {
      router.push("/");
    }
  }, [lobby, router]);

  const conversionStatus = lobby?.conversionStatus;
  const round = conversionStatus?.round;
  const isCultLeader = myRole === "CULT_LEADER";

  // Timer Logic
  useEffect(() => {
    if (conversionStatus?.state === "ACTIVE" && round) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - round.startTime;
        const remaining = Math.max(
          0,
          Math.ceil((round.duration - elapsed) / 1000),
        );
        setTimeLeft(remaining);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(0);
    }
  }, [conversionStatus?.state, round]);

  const handleSubmit = useEffectEvent(() => {
    if (isSubmitted) return;
    setIsSubmitted(true);

    if (isCultLeader) {
      submitConversionAction("PICK_PLAYER", selectedPlayerId || undefined);
    }
    if (!isSubmitted && !isCultLeader) {
      submitConversionAction(
        "ANSWER_QUIZ",
        undefined,
        selectedAnswerId !== null ? selectedAnswerId : "",
      );
    }
  });

  // Auto-submit when timer ends if not submitted
  useEffect(() => {
    if (
      timeLeft === 0 &&
      !isSubmitted &&
      conversionStatus?.state === "ACTIVE"
    ) {
      handleSubmit();
    }
  }, [timeLeft, isSubmitted, conversionStatus?.state, handleSubmit]);

  if (!lobby || !conversionStatus || !round) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">{t("game.loading")}</p>
      </div>
    );
  }

  // --- RESULTS VIEW ---
  if (conversionStatus.state === "COMPLETED" && round.result) {
    const { convertedPlayerId, correctAnswers } = round.result;
    const isConverted = convertedPlayerId === myPlayerId;
    const isCorrect = correctAnswers.includes(myPlayerId);
    const convertedPlayer = lobby.players.find(
      (p) => p.id === convertedPlayerId,
    );
    const cultLeader = lobby.players.find(
      (p) => lobby.assignments?.[p.id] === "CULT_LEADER",
    );

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-1000">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-black text-white uppercase tracking-wider">
              {t("conversion.ritualComplete")}
            </h1>
            <p className="text-slate-400">{t("conversion.spiritsSpoken")}</p>
          </div>

          {/* Quiz Feedback for Non-Leaders */}
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

          {/* Conversion Result */}
          {isConverted ? (
            <div className="p-8 bg-amber-950/30 border border-amber-500/50 rounded-2xl text-center space-y-6">
              <Eye className="w-16 h-16 text-amber-500 mx-auto" />
              <h2 className="text-2xl font-black text-amber-500">
                {t("conversion.youConverted")}
              </h2>
              <p className="text-amber-200">{t("conversion.nowCultist")}</p>
              {cultLeader && (
                <div className="bg-slate-900/50 p-4 rounded-xl border border-amber-900/30">
                  <p className="text-xs text-amber-500/60 uppercase font-bold mb-2">
                    {t("conversion.yourLeader")}
                  </p>
                  <div className="flex flex-col items-center gap-2">
                    <Avatar url={cultLeader.photoUrl} size="lg" />
                    <span className="text-lg font-bold text-amber-100">
                      {cultLeader.name}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : isCultLeader && convertedPlayer ? (
            <div className="p-8 bg-amber-950/30 border border-amber-500/50 rounded-2xl text-center space-y-6">
              <CheckCircle className="w-16 h-16 text-amber-500 mx-auto" />
              <h2 className="text-2xl font-black text-amber-500">
                {t("conversion.conversionSuccessful")}
              </h2>
              <div className="flex flex-col items-center gap-2">
                <Avatar url={convertedPlayer.photoUrl} size="lg" />
                <span className="text-lg font-bold text-amber-100">
                  {convertedPlayer.name}
                </span>
              </div>
              <p className="text-amber-200">{t("conversion.joinedRanks")}</p>
            </div>
          ) : null}

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

  // --- ACTIVE ROUND VIEW ---
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        {/* Header & Timer */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
            <Eye className="w-6 h-6" />
            {t("conversion.ritualInProgress")}
          </h1>
          <div className="flex items-center gap-2 text-2xl font-mono font-bold text-white bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
            <Clock className="w-5 h-5 text-slate-400" />
            <span className={timeLeft <= 5 ? "text-red-500 animate-pulse" : ""}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {isCultLeader ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 h-[600px] flex flex-col">
            <div className="text-center space-y-2 shrink-0">
              <h2 className="text-lg font-bold text-white">
                {t("conversion.chooseConvert")}
              </h2>
            </div>

            {isSubmitted && selectedPlayerId ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in fade-in">
                <div className="p-6 bg-amber-900/20 border border-amber-500/30 rounded-2xl flex flex-col items-center gap-4 w-full max-w-xs">
                  <p className="text-amber-500 font-bold uppercase tracking-wider text-sm">
                    {t("conversion.targetSelected")}
                  </p>
                  <Avatar
                    url={
                      lobby.players.find((p) => p.id === selectedPlayerId)
                        ?.photoUrl || null
                    }
                    size="lg"
                  />
                  <span className="text-xl font-bold text-white">
                    {lobby.players.find((p) => p.id === selectedPlayerId)?.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSubmitted(false);
                      setSelectedPlayerId(null);
                    }}
                    className="text-xs text-slate-400 hover:text-white underline"
                  >
                    {t("conversion.changeSelection")}
                  </button>
                </div>
                <p className="text-slate-500 text-sm animate-pulse">
                  {t("conversion.waitingForRitual")}
                </p>
              </div>
            ) : (
              <div className="flex-1 min-h-0">
                <PlayerSelectionList.Root
                  players={lobby.players.map((p) => ({
                    ...p,
                    isUnconvertible:
                      p.isUnconvertible ||
                      lobby.assignments?.[p.id] === "CULTIST" ||
                      lobby.assignments?.[p.id] === "CULT_LEADER",
                  }))}
                  myPlayerId={myPlayerId}
                  onSelect={(targetId) => {
                    setSelectedPlayerId(targetId);
                    if (targetId) {
                      submitConversionAction("PICK_PLAYER", targetId);
                    }
                  }}
                >
                  <PlayerSelectionList.Content
                    disabledLabel={t("conversion.unconvertible")}
                    isPlayerDisabled={(p) => p.isUnconvertible}
                  />
                </PlayerSelectionList.Root>
              </div>
            )}
          </div>
        ) : (
          // --- QUIZ VIEW ---
          <Quiz.Root
            selectedAnswerId={selectedAnswerId}
            onSelect={(optionId) => {
              setSelectedAnswerId(optionId);
              submitConversionAction("ANSWER_QUIZ", undefined, optionId);
            }}
          >
            <Quiz.Header
              title={t("conversion.proveWorth")}
              description={t("conversion.proveWorthDesc")}
            />

            {round.playerQuestions[myPlayerId] !== undefined && (
              <div className="space-y-4">
                <Quiz.Question
                  text={t(
                    QUIZ_QUESTIONS[round.playerQuestions[myPlayerId]].question,
                  )}
                />
                <Quiz.OptionsList
                  options={QUIZ_QUESTIONS[
                    round.playerQuestions[myPlayerId]
                  ].options.map((opt) => ({
                    ...opt,
                    text: t(opt.text),
                  }))}
                />
              </div>
            )}
          </Quiz.Root>
        )}
      </div>
    </div>
  );
}
