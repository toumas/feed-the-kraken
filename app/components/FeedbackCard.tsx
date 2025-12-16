"use client";

import type { LucideIcon } from "lucide-react";
import { createContext, type ReactNode, useContext } from "react";

type FeedbackVariant = "success" | "error";

interface FeedbackContextType {
  variant: FeedbackVariant;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(
  undefined,
);

function useFeedbackContext() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error(
      "FeedbackCard subcomponents must be used within a FeedbackCard.Root",
    );
  }
  return context;
}

interface RootProps {
  children: ReactNode;
  variant: FeedbackVariant;
  className?: string;
}

function Root({ children, variant, className = "" }: RootProps) {
  const baseStyles = "p-6 rounded-2xl border text-center space-y-4";
  const variantStyles =
    variant === "success"
      ? "bg-green-900/20 border-green-500/50"
      : "bg-red-900/20 border-red-500/50";

  return (
    <FeedbackContext.Provider value={{ variant }}>
      <div className={`${baseStyles} ${variantStyles} ${className}`}>
        {children}
      </div>
    </FeedbackContext.Provider>
  );
}

interface IconProps {
  icon: LucideIcon;
  className?: string;
}

function Icon({ icon: Icon, className = "" }: IconProps) {
  const { variant } = useFeedbackContext();
  const variantStyles =
    variant === "success" ? "text-green-500" : "text-red-500";

  return <Icon className={`w-12 h-12 mx-auto ${variantStyles} ${className}`} />;
}

interface TitleProps {
  children: ReactNode;
  className?: string;
}

function Title({ children, className = "" }: TitleProps) {
  const { variant } = useFeedbackContext();
  const variantStyles =
    variant === "success" ? "text-green-400" : "text-red-400";

  return (
    <h2 className={`text-xl font-bold ${variantStyles} ${className}`}>
      {children}
    </h2>
  );
}

interface DescriptionProps {
  children: ReactNode;
  className?: string;
}

function Description({ children, className = "" }: DescriptionProps) {
  const { variant } = useFeedbackContext();
  const variantStyles =
    variant === "success" ? "text-green-200/80" : "text-red-200/80";

  return <p className={`${variantStyles} ${className}`}>{children}</p>;
}

export const FeedbackCard = {
  Root,
  Icon,
  Title,
  Description,
};
