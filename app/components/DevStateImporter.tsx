"use client";

import { Download, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useGame } from "../context/GameContext";
import { cn } from "../utils";

export function DevStateImporter() {
    const [isOpen, setIsOpen] = useState(false);
    const [jsonInput, setJsonInput] = useState("");
    const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const { importDevState } = useGame();

    // Only render in development
    if (process.env.NODE_ENV !== "development") return null;

    const handleImport = () => {
        try {
            if (!jsonInput.trim()) {
                setStatus("error");
                setErrorMessage("Please paste JSON state first");
                return;
            }

            // Basic validation
            JSON.parse(jsonInput);

            importDevState(jsonInput);
            setStatus("success");
            setTimeout(() => {
                setIsOpen(false);
                setStatus("idle");
                setJsonInput("");
            }, 1500);
        } catch (err) {
            setStatus("error");
            setErrorMessage("Invalid JSON format");
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-4 z-40 p-3 bg-amber-600 hover:bg-amber-500 text-white rounded-full shadow-lg transition-transform hover:scale-110 flex items-center gap-2 group"
                title="Import Game State (Dev Only)"
            >
                <Download className="w-5 h-5" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 text-sm font-bold whitespace-nowrap">
                    Import State
                </span>
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-6 max-w-lg w-full relative shadow-2xl space-y-4">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2 text-amber-500">
                            <Download className="w-6 h-6" />
                            <h2 className="text-xl font-bold uppercase tracking-wider">
                                Import Game State
                            </h2>
                        </div>

                        <p className="text-sm text-slate-400">
                            Paste the anonymized game state JSON from the feedback email below to inject it into your local session.
                        </p>

                        <div className="space-y-2">
                            <textarea
                                value={jsonInput}
                                onChange={(e) => {
                                    setJsonInput(e.target.value);
                                    setStatus("idle");
                                }}
                                placeholder='{ "code": "...", "players": [...] }'
                                className="w-full h-64 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all resize-none"
                            />

                            {status === "error" && (
                                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20 animate-in slide-in-from-top-1">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            {status === "success" && (
                                <div className="flex items-center gap-2 text-green-400 text-sm bg-green-400/10 p-3 rounded-lg border border-green-400/20 animate-in slide-in-from-top-1">
                                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                    <span>State imported successfully! Redirecting...</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleImport}
                            disabled={status === "success"}
                            className={cn(
                                "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                                status === "success"
                                    ? "bg-green-600 text-white"
                                    : "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20"
                            )}
                        >
                            <Download className="w-5 h-5" />
                            {status === "success" ? "Imported" : "Import State"}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
