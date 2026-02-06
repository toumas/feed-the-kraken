"use client";

import { MessageSquare, Send, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmationModal } from "./ConfirmationModal";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { t } = useTranslation("common");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus("submitting");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, email }),
      });

      if (!response.ok) throw new Error("Failed to send feedback");

      setStatus("success");
      // Reset form
      setMessage("");
      setEmail("");

      // Auto-close after success
      setTimeout(() => {
        onClose();
        setStatus("idle");
      }, 2000);
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  };

  const handleDismiss = () => {
    if (status === "submitting") return;
    onClose();
    // Reset status if it was success/error when closing
    if (status !== "idle") {
      setTimeout(() => setStatus("idle"), 300);
    }
  };

  return (
    <ConfirmationModal.Root isOpen={isOpen} onDismiss={handleDismiss}>
      <ConfirmationModal.Header
        title={t("feedback.title")}
        icon={<MessageSquare className="w-6 h-6 text-cyan-500" />}
      />
      <ConfirmationModal.Body>
        {status === "success" ? (
          <div className="flex flex-col items-center justify-center py-4 text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-4">
              <Send className="w-8 h-8" />
            </div>
            <p className="text-lg font-semibold text-green-400">
              {t("feedback.success")}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="message"
                className="text-sm font-medium text-slate-400"
              >
                {t("feedback.message")}
              </label>
              <textarea
                id="message"
                required
                className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all resize-none"
                placeholder={t("feedback.messagePlaceholder")}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={status === "submitting"}
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="text-sm font-medium text-slate-400"
              >
                {t("feedback.email")}
              </label>
              <input
                id="email"
                type="email"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                placeholder={t("feedback.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "submitting"}
              />
            </div>

            {status === "error" && (
              <p className="text-sm text-red-500 animate-in fade-in duration-300">
                {t("feedback.error")}
              </p>
            )}

            <ConfirmationModal.Actions className="mt-6">
              <ConfirmationModal.Button
                variant="secondary"
                onClick={handleDismiss}
                disabled={status === "submitting"}
              >
                {t("feedback.cancel")}
              </ConfirmationModal.Button>
              <ConfirmationModal.Button
                type="submit"
                variant="primary"
                disabled={status === "submitting" || !message.trim()}
                className="flex items-center justify-center gap-2"
              >
                {status === "submitting" ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {t("feedback.submit")}
                  </>
                )}
              </ConfirmationModal.Button>
            </ConfirmationModal.Actions>
          </form>
        )}
      </ConfirmationModal.Body>
    </ConfirmationModal.Root>
  );
}
