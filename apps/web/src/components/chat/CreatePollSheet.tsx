import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Icon, PrimaryButton } from "@activity-match/ui";

const MAX_OPTIONS = 6;
const MIN_OPTIONS = 2;

interface CreatePollSheetProps {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: { question: string; options: string[]; allowMultiple: boolean }) => void | Promise<void>;
}

export function CreatePollSheet({ open, loading, onClose, onSubmit }: CreatePollSheetProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setQuestion("");
      setOptions(["", ""]);
      setAllowMultiple(false);
      setError("");
    }
  }, [open]);

  const updateOption = (index: number, value: string) => {
    setOptions((current) => current.map((opt, i) => (i === index ? value : opt)));
  };

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    setOptions((current) => [...current, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length <= MIN_OPTIONS) return;
    setOptions((current) => current.filter((_, i) => i !== index));
  };

  const submit = async () => {
    const trimmedQuestion = question.trim();
    const trimmedOptions = options.map((opt) => opt.trim()).filter(Boolean);

    if (!trimmedQuestion) {
      setError("Add a question for your poll.");
      return;
    }
    if (trimmedOptions.length < MIN_OPTIONS) {
      setError("Add at least two options.");
      return;
    }

    setError("");
    await onSubmit({
      question: trimmedQuestion,
      options: trimmedOptions,
      allowMultiple,
    });
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
            aria-labelledby="create-poll-title"
            className="fixed bottom-0 inset-x-0 z-[101] bg-surface rounded-t-2xl px-margin-mobile pt-4 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.12)] max-h-[85dvh] overflow-y-auto"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="w-10 h-1 rounded-full bg-outline-variant/60 mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h2 id="create-poll-title" className="text-headline-md font-bold text-on-surface">
                Create poll
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="font-label-bold text-label-bold text-on-surface-variant mb-2 block">
                  Question
                </span>
                <input
                  className="w-full rounded-xl border border-outline-variant px-4 py-3 bg-surface-container-lowest text-body-md"
                  placeholder="What time works better?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={200}
                />
              </label>

              <div>
                <span className="font-label-bold text-label-bold text-on-surface-variant mb-2 block">
                  Options
                </span>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        className="flex-1 rounded-xl border border-outline-variant px-4 py-3 bg-surface-container-lowest text-body-md"
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        maxLength={80}
                      />
                      {options.length > MIN_OPTIONS && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          aria-label={`Remove option ${index + 1}`}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high shrink-0"
                        >
                          <Icon name="remove_circle_outline" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {options.length < MAX_OPTIONS && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="mt-2 flex items-center gap-2 text-primary font-label-bold text-label-bold py-2"
                  >
                    <Icon name="add" />
                    Add option
                  </button>
                )}
              </div>

              <label className="flex items-center justify-between rounded-xl border border-outline-variant/40 px-4 py-3 bg-surface-container-low">
                <div>
                  <span className="font-label-bold text-label-bold text-on-surface block">
                    Allow multiple choices
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Participants can pick more than one option
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={allowMultiple}
                  onChange={(e) => setAllowMultiple(e.target.checked)}
                  className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
                />
              </label>

              {error && (
                <p className="text-error text-body-md" role="alert">
                  {error}
                </p>
              )}

              <PrimaryButton fullWidth onClick={submit} disabled={loading}>
                {loading ? "Posting..." : "Post poll"}
              </PrimaryButton>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
