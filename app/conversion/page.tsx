"use client";

import { CheckCircle, Clock, Eye, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState } from "react";
import { Avatar } from "../components/Avatar";
import { PlayerSelectionList } from "../components/PlayerSelectionList";
import { useGame } from "../context/GameContext";
import { QUIZ_QUESTIONS } from "../data/quiz";

export default function ConversionPage() {
  const router = useRouter();
  const { lobby, myPlayerId, myRole, submitConversionAction } = useGame();
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
        <p className="text-slate-400">Loading ritual...</p>
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
              Ritual Complete
            </h1>
            <p className="text-slate-400">The spirits have spoken.</p>
          </div>

          {/* Quiz Feedback for Non-Leaders */}
          {!isCultLeader && (
            <div
              className={`p-6 rounded-2xl border ${
                isCorrect
                  ? "bg-green-900/20 border-green-500/50"
                  : "bg-red-900/20 border-red-500/50"
              } text-center space-y-4`}
            >
              {isCorrect ? (
                <>
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                  <h2 className="text-xl font-bold text-green-400">
                    Correct Answer!
                  </h2>
                  <p className="text-green-200/80">
                    You have proven your worth to the sea.
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="w-12 h-12 text-red-500 mx-auto" />
                  <h2 className="text-xl font-bold text-red-400">
                    Wrong Answer
                  </h2>
                  <p className="text-red-200/80">
                    The Kraken is displeased with your ignorance.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Conversion Result */}
          {isConverted ? (
            <div className="p-8 bg-amber-950/30 border border-amber-500/50 rounded-2xl text-center space-y-6">
              <Eye className="w-16 h-16 text-amber-500 mx-auto" />
              <h2 className="text-2xl font-black text-amber-500">
                YOU HAVE BEEN CONVERTED!
              </h2>
              <p className="text-amber-200">
                You are now a Cultist. Serve the Cult Leader.
              </p>
              {cultLeader && (
                <div className="bg-slate-900/50 p-4 rounded-xl border border-amber-900/30">
                  <p className="text-xs text-amber-500/60 uppercase font-bold mb-2">
                    Your Leader
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
                CONVERSION SUCCESSFUL
              </h2>
              <div className="flex flex-col items-center gap-2">
                <Avatar url={convertedPlayer.photoUrl} size="lg" />
                <span className="text-lg font-bold text-amber-100">
                  {convertedPlayer.name}
                </span>
              </div>
              <p className="text-amber-200">
                Has joined your ranks as a Cultist.
              </p>
            </div>
          ) : null}

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

  // --- ACTIVE ROUND VIEW ---
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        {/* Header & Timer */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
            <Eye className="w-6 h-6" />
            Ritual in Progress
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
              <h2 className="text-lg font-bold text-white">Choose a Convert</h2>
              <p className="text-slate-400 text-sm">
                Select a player to bring into the fold.
              </p>
            </div>

            {isSubmitted && selectedPlayerId ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in fade-in">
                <div className="p-6 bg-amber-900/20 border border-amber-500/30 rounded-2xl flex flex-col items-center gap-4 w-full max-w-xs">
                  <p className="text-amber-500 font-bold uppercase tracking-wider text-sm">
                    Target Selected
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
                    Change Selection
                  </button>
                </div>
                <p className="text-slate-500 text-sm animate-pulse">
                  Waiting for ritual to complete...
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
                  <PlayerSelectionList.Content disabledLabel="Already in Cult" />
                </PlayerSelectionList.Root>
              </div>
            )}
          </div>
        ) : (
          // --- QUIZ VIEW ---
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold text-white">Prove Your Worth</h2>
              <p className="text-slate-400 text-sm">
                Answer correctly to please the Kraken.
              </p>
            </div>

            {round.playerQuestions[myPlayerId] !== undefined && (
              <div className="space-y-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <p className="text-lg font-medium text-slate-200 text-center">
                    {QUIZ_QUESTIONS[round.playerQuestions[myPlayerId]].question}
                  </p>
                </div>
                {/* The timer logic should be in a useEffect hook, not directly in JSX */}
                {/* Assuming this is meant to be part of a useEffect or similar logic */}
                {/* This code snippet is syntactically incorrect if placed directly here */}
                {/* I will place it as a comment to preserve the user's intent without breaking syntax */}
                {/*
             const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            if (!isSubmitted && isCultLeader && selectedPlayerId) {
              submitConversionAction("PICK_PLAYER", selectedPlayerId);
              setIsSubmitted(true);
            }
            if (!isSubmitted && !isCultLeader && selectedAnswerId) {
              submitConversionAction("ANSWER_QUIZ", undefined, selectedAnswerId);
              setIsSubmitted(true);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
                */}

                <div className="space-y-3">
                  <QuizOptions
                    questionIndex={round.playerQuestions[myPlayerId]}
                    selectedAnswerId={selectedAnswerId}
                    onSelect={(optionId) => {
                      setSelectedAnswerId(optionId);
                      submitConversionAction(
                        "ANSWER_QUIZ",
                        undefined,
                        optionId,
                      );
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function QuizOptions({
  questionIndex,
  selectedAnswerId,
  onSelect,
}: {
  questionIndex: number;
  selectedAnswerId: string | null;
  onSelect: (optionId: string) => void;
}) {
  const [shuffledOptions, setShuffledOptions] = useState<
    { id: string; text: string }[]
  >([]);

  useEffect(() => {
    const options = QUIZ_QUESTIONS[questionIndex].options;
    // Shuffle options
    setShuffledOptions([...options].sort(() => Math.random() - 0.5));
  }, [questionIndex]);

  if (shuffledOptions.length === 0) return null;

  return (
    <>
      {shuffledOptions.map((option, idx) => (
        <button
          type="button"
          key={option.id}
          onClick={() => onSelect(option.id)}
          className={`w-full p-4 rounded-xl border text-left transition-all ${
            selectedAnswerId === option.id
              ? "bg-cyan-900/40 border-cyan-500 ring-2 ring-cyan-500/50 text-cyan-100"
              : "bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600 text-slate-300"
          }`}
        >
          <span className="font-bold mr-2 text-slate-500">
            {String.fromCharCode(65 + idx)}.
          </span>
          {option.text}
        </button>
      ))}
    </>
  );
}
