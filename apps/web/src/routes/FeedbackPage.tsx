import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PrimaryButton, ScreenShell } from "@activity-match/ui";
import { api } from "@/lib/api";

export function FeedbackPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const submit = async () => {
    await api.submitFeedback(id, rating, comment);
    navigate("/plans");
  };

  return (
    <ScreenShell title="Post-Activity Feedback">
      <div className="space-y-6">
        <p className="text-body-md text-on-surface-variant">How was the activity? Your feedback helps hosts improve future sessions.</p>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`w-12 h-12 rounded-full text-label-bold ${rating >= n ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container"}`}
              onClick={() => setRating(n)}
              aria-label={`Rate ${n} out of 5`}
            >
              {n}
            </button>
          ))}
        </div>
        <textarea
          className="w-full min-h-[100px] rounded-xl border border-outline-variant p-4"
          placeholder="Optional comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <PrimaryButton fullWidth onClick={submit}>Submit feedback</PrimaryButton>
      </div>
    </ScreenShell>
  );
}
