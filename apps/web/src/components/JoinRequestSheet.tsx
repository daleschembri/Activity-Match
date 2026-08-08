import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Icon, PrimaryButton } from "@activity-match/ui";

const MAX_LENGTH = 300;

interface JoinRequestSheetProps {
  open: boolean;
  activityTitle: string;
  hostName: string;
  isWaitlist?: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (introduction: string) => void | Promise<void>;
}

export function JoinRequestSheet({
  open,
  activityTitle,
  hostName,
  isWaitlist = false,
  loading = false,
  onClose,
  onSubmit,
}: JoinRequestSheetProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setMessage("");
      setError("");
    }
  }, [open]);

  const submit = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      setError("Write a short message so the host knows why you want to join.");
      return;
    }
    setError("");
    await onSubmit(trimmed);
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-[100] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-request-title"
            className="fixed inset-x-0 bottom-0 z-[110] bg-surface rounded-t-[24px] shadow-[0_-8px_32px_rgba(0,0,0,0.12)] px-margin-mobile pt-5 pb-8 safe-area-pb max-h-[85dvh] overflow-y-auto"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
          >
            <div className="w-10 h-1 rounded-full bg-outline-variant/40 mx-auto mb-5" />
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 id="join-request-title" className="text-headline-md font-bold text-on-surface">
                  {isWaitlist ? "Join the waitlist" : "Request to join"}
                </h2>
                <p className="text-body-md text-on-surface-variant mt-1">
                  {activityTitle} · hosted by {hostName}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-2 -mr-2 rounded-full hover:bg-surface-container-high transition-colors"
              >
                <Icon name="close" />
              </button>
            </div>

            <label className="block space-y-2">
              <span className="text-label-bold text-on-surface">Message to the host</span>
              <span className="block text-label-sm text-on-surface-variant">
                Introduce yourself and say why you&apos;d like to join. The host will see this with your request.
              </span>
              <textarea
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value.slice(0, MAX_LENGTH));
                  if (error) setError("");
                }}
                rows={5}
                maxLength={MAX_LENGTH}
                autoFocus
                placeholder="Hi! I'm new to the area and would love to join — I play at intermediate level."
                className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              <div className="flex justify-between items-center text-label-sm">
                <span className="text-error">{error}</span>
                <span className="text-on-surface-variant">
                  {message.length}/{MAX_LENGTH}
                </span>
              </div>
            </label>

            <div className="flex gap-3 mt-6">
              <PrimaryButton variant="outline" fullWidth onClick={onClose} disabled={loading}>
                Cancel
              </PrimaryButton>
              <PrimaryButton fullWidth onClick={() => void submit()} disabled={loading}>
                {loading ? "Sending..." : isWaitlist ? "Send waitlist request" : "Send request"}
              </PrimaryButton>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
