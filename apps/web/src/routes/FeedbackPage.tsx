import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { FeedbackSentiment } from "@activity-match/shared";
import { Icon, PrimaryButton } from "@activity-match/ui";
import { api } from "@/lib/api";

export function FeedbackPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [sentiment, setSentiment] = useState<FeedbackSentiment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: activity, isLoading } = useQuery({
    queryKey: ["activity", id],
    queryFn: () => api.getActivity(id),
    enabled: Boolean(id),
  });

  const submit = async (value: FeedbackSentiment) => {
    setSentiment(value);
    setSubmitting(true);
    try {
      await api.submitFeedback(id, value);
      navigate("/plans");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not send feedback");
      setSubmitting(false);
    }
  };

  const skip = () => navigate("/plans");

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  if (!activity || activity.viewer_role === "host") {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-margin-mobile text-center gap-4">
        <p className="text-on-surface-variant">Feedback is for participants after an activity ends.</p>
        <PrimaryButton variant="outline" onClick={() => navigate("/plans")}>
          Back to plans
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-on-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background flex items-center justify-between px-margin-mobile py-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Close"
          className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-container-high"
        >
          <Icon name="close" />
        </button>
        <span className="text-label-bold text-on-surface-variant">Feedback</span>
        <div className="w-11" />
      </header>

      <main className="flex-1 px-margin-mobile pt-6 pb-32 max-w-md mx-auto w-full flex flex-col items-center text-center">
        <h1 className="text-headline-lg-mobile font-extrabold mb-2">How was it?</h1>
        <p className="text-body-md text-on-surface-variant mb-10">{activity.title}</p>

        <div className="flex gap-6 mb-10">
          <button
            type="button"
            disabled={submitting}
            onClick={() => submit("up")}
            className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all min-w-[130px] ${
              sentiment === "up"
                ? "border-primary bg-primary/10 shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
                : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low"
            }`}
            aria-label="Thumbs up"
          >
            <Icon name="thumb_up" className="text-5xl text-primary" filled={sentiment === "up"} />
            <span className="font-label-bold text-on-surface">Good</span>
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => submit("down")}
            className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all min-w-[130px] ${
              sentiment === "down"
                ? "border-outline bg-surface-container shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
                : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low"
            }`}
            aria-label="Thumbs down"
          >
            <Icon name="thumb_down" className="text-5xl text-on-surface-variant" filled={sentiment === "down"} />
            <span className="font-label-bold text-on-surface">Not great</span>
          </button>
        </div>

        <p className="text-body-md text-on-surface-variant max-w-xs">
          Your feedback helps us improve future activities. Only we see this.
        </p>
      </main>

      <div className="fixed bottom-0 inset-x-0 bg-background border-t border-surface-variant p-margin-mobile pb-[max(20px,env(safe-area-inset-bottom))] z-20">
        <div className="max-w-md mx-auto">
          <PrimaryButton variant="outline" fullWidth onClick={skip}>
            Skip
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
