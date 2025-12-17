import { AlertCircle, X } from "lucide-react";

interface InlineErrorProps {
  message: string;
  onDismiss: () => void;
}

export function InlineError({ message, onDismiss }: InlineErrorProps) {
  return (
    <div className="p-3 bg-red-950/90 border border-red-500/50 text-red-200 rounded-lg flex items-start animate-in slide-in-from-top-2">
      <AlertCircle className="w-5 h-5 mr-2 shrink-0 text-red-500 mt-0.5" />
      <p className="text-sm">{message}</p>
      <button onClick={onDismiss} type="button" className="ml-auto">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
