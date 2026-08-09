import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Icon, PrimaryButton } from "@activity-match/ui";
import { suggestNextDate } from "@/lib/attendance";

interface SavedState {
  attendedCount?: number;
  totalCount?: number;
  title?: string;
  startsAt?: string | null;
}

export function AttendanceSavedPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as SavedState;

  const attendedCount = state.attendedCount ?? 0;
  const totalCount = state.totalCount ?? 0;
  const title = state.title ?? "this activity";
  const suggestedDate = suggestNextDate(state.startsAt ?? null);

  return (
    <div className="min-h-dvh bg-background text-on-background flex flex-col items-center justify-center p-margin-mobile">
      <main className="w-full max-w-md flex flex-col gap-8">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shadow-[0_12px_20px_rgba(0,0,0,0.06)]">
            <Icon name="check_circle" className="text-3xl" filled />
          </div>
          <h1 className="text-headline-lg-mobile font-extrabold">Attendance Saved</h1>
          <p className="text-body-lg text-on-surface-variant">
            {attendedCount} of {totalCount} marked as attended
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-6 border border-surface-variant shadow-[0_8px_16px_rgba(0,0,0,0.04)] flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0">
              <Icon name="event_repeat" className="text-primary text-2xl" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-headline-md font-bold">Want to do this again?</h2>
              <p className="text-body-md text-on-surface-variant">{title}</p>
              {suggestedDate && (
                <div className="inline-flex items-center gap-1 mt-1">
                  <Icon name="calendar_today" className="text-label-sm text-outline" />
                  <span className="text-label-sm text-outline">Suggested: {suggestedDate}</span>
                </div>
              )}
            </div>
          </div>
          <PrimaryButton
            fullWidth
            onClick={() =>
              navigate("/create/describe", {
                state: { repeatFromActivityId: id, title },
              })
            }
          >
            Set up the next one
          </PrimaryButton>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            className="text-label-bold text-outline hover:text-on-surface py-2 px-4"
            onClick={() => navigate("/plans")}
          >
            Not right now
          </button>
        </div>
      </main>
    </div>
  );
}
