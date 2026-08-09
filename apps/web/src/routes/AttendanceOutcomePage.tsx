import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Icon, PrimaryButton } from "@activity-match/ui";
import { api } from "@/lib/api";
import { formatActivityDate } from "@/lib/attendance";

export function AttendanceOutcomePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [responding, setResponding] = useState(false);

  const { data: activity } = useQuery({
    queryKey: ["activity", id],
    queryFn: () => api.getActivity(id),
    enabled: Boolean(id),
  });

  const respond = async (accepted: boolean) => {
    setResponding(true);
    try {
      await api.respondToAttendanceOutcome(id, accepted);
      navigate("/plans");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not save your response");
    } finally {
      setResponding(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background text-on-background flex flex-col">
      <header className="sticky top-0 z-10 bg-surface flex items-center justify-between px-margin-mobile py-2 border-b border-surface-container-high">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-container-high text-primary"
        >
          <Icon name="arrow_back" />
        </button>
        <div className="w-11" />
      </header>

      <main className="flex-1 px-margin-mobile pt-8 pb-32 max-w-2xl mx-auto w-full flex flex-col">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
            <Icon name="event_busy" className="text-3xl" filled />
          </div>
        </div>

        <h2 className="text-headline-lg-mobile font-extrabold text-center mb-8">
          Your attendance record was updated
        </h2>

        <div className="bg-surface-container-lowest rounded-xl p-4 mb-8 border border-surface-container shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0">
              <Icon name="event" className="text-on-surface-variant" />
            </div>
            <div>
              <h3 className="text-headline-md font-bold">{activity?.title ?? "Activity"}</h3>
              <p className="text-body-md text-on-surface-variant mt-1">
                {formatActivityDate(activity?.starts_at ?? null)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <p className="text-body-lg text-on-surface-variant text-center">
            The host for this event has recorded you as not having come along.
          </p>
          <p className="text-body-md text-on-surface-variant text-center px-4">
            This is noted on your attendance record. If that matches what happened, you can confirm below.
            If not, you can ask us to take another look.
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-4">
          <PrimaryButton fullWidth onClick={() => respond(true)} disabled={responding}>
            That&apos;s right
          </PrimaryButton>
          <PrimaryButton variant="outline" fullWidth onClick={() => respond(false)} disabled={responding}>
            This isn&apos;t right
          </PrimaryButton>
          <p className="text-center text-label-sm text-on-surface-variant">
            Disputing this sends it for review.
          </p>
        </div>
      </main>
    </div>
  );
}
