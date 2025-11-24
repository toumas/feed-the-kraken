import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface GameHeaderProps {
  title: string;
  icon?: ReactNode;
}

export function GameHeader({ title, icon }: GameHeaderProps) {
  return (
    <header className="p-6 flex items-center justify-between border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
      <Link
        href="/"
        className="text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-6 h-6" />
      </Link>
      <div className="flex items-center">
        {icon && <div className="mr-2 text-cyan-500">{icon}</div>}
        <h1 className="text-lg font-bold tracking-wider text-slate-100 uppercase">
          {title}
        </h1>
      </div>
      <div className="w-6" /> {/* Spacer for centering */}
    </header>
  );
}
