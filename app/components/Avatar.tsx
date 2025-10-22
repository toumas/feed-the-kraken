import { Users } from "lucide-react";
import Image from "next/image";
import { cn } from "../utils";

interface AvatarProps {
  url?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Avatar({ url, size = "md", className }: AvatarProps) {
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-32 h-32",
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0",
        sizeClasses[size],
        className,
      )}
    >
      {url ? (
        <Image
          src={url}
          alt="Avatar"
          width={128}
          height={128}
          className="w-full h-full object-cover flip-horizontal"
        />
      ) : (
        <Users
          className={cn(
            "text-slate-600",
            size === "sm" ? "w-5 h-5" : "w-1/2 h-1/2",
          )}
        />
      )}
    </div>
  );
}
