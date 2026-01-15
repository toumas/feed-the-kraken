"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { cn } from "../utils";

// Context
type QuizContextType = {
  selectedAnswerId: string | null;
  onSelect: (id: string) => void;
};

const QuizContext = createContext<QuizContextType | null>(null);

function useQuiz() {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error("useQuiz must be used within Quiz.Root");
  }
  return context;
}

// Components
interface RootProps {
  children: ReactNode;
  selectedAnswerId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

function Root({ children, selectedAnswerId, onSelect, className }: RootProps) {
  return (
    <QuizContext.Provider value={{ selectedAnswerId, onSelect }}>
      <div
        className={cn(
          "bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6",
          className,
        )}
      >
        {children}
      </div>
    </QuizContext.Provider>
  );
}

interface HeaderProps {
  title: string;
  description: string;
}

function Header({ title, description }: HeaderProps) {
  return (
    <div className="text-center space-y-2">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <p className="text-slate-400 text-sm">{description}</p>
    </div>
  );
}

interface QuestionProps {
  text: string;
}

function Question({ text }: QuestionProps) {
  return (
    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
      <p className="text-lg font-medium text-slate-200 text-center">{text}</p>
    </div>
  );
}

interface OptionProps {
  id: string;
  text: string;
  index: number;
}

function Option({ id, text, index }: OptionProps) {
  const { selectedAnswerId, onSelect } = useQuiz();
  const isSelected = selectedAnswerId === id;

  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={cn(
        "w-full p-4 rounded-xl border text-left transition-all",
        isSelected
          ? "bg-cyan-900/40 border-cyan-500 ring-2 ring-cyan-500/50 text-cyan-100"
          : "bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600 text-slate-300",
      )}
    >
      <span className="font-bold mr-2 text-slate-500">
        {String.fromCharCode(65 + index)}.
      </span>
      {text}
    </button>
  );
}

interface OptionsListProps {
  options: { id: string; text: string }[];
}

function OptionsList({ options }: OptionsListProps) {
  // Create a stable key from option IDs to detect actual content changes
  const optionsKey = options.map((o) => o.id).join(",");

  const [shuffledOptions, setShuffledOptions] = useState<
    { id: string; text: string }[]
  >([]);
  const [lastShuffledKey, setLastShuffledKey] = useState<string>("");

  // Only shuffle when option IDs actually change, not on every re-render
  useEffect(() => {
    if (optionsKey !== lastShuffledKey) {
      setShuffledOptions([...options].sort(() => Math.random() - 0.5));
      setLastShuffledKey(optionsKey);
    } else {
      // Update text without reshuffling (for translation changes)
      setShuffledOptions((prev) =>
        prev.map((prevOpt) => {
          const updated = options.find((o) => o.id === prevOpt.id);
          return updated ? { ...prevOpt, text: updated.text } : prevOpt;
        }),
      );
    }
  }, [optionsKey, options, lastShuffledKey]);

  if (shuffledOptions.length === 0) return null;

  return (
    <div className="space-y-3">
      {shuffledOptions.map((option, idx) => (
        <Option key={option.id} id={option.id} text={option.text} index={idx} />
      ))}
    </div>
  );
}

export const Quiz = {
  Root,
  Header,
  Question,
  OptionsList,
};
