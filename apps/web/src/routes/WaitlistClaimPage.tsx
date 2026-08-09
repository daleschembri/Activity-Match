import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Icon, PrimaryButton } from "@activity-match/ui";
import { api } from "@/lib/api";

function formatClaimWhen(startsAt: string | null, durationMinutes: number | null): string {
  if (!startsAt) return "Flexible timing";
  const start = new Date(startsAt);
  const datePart = start.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const timePart = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (!durationMinutes) return `${datePart} · ${timePart}`;
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const endPart = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart} – ${endPart}`;
}

function formatCountdown(secondsLeft: number): string {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

/** Matches stitch/action-deck/waitlist-claim */
export function WaitlistClaimPage() {
  const { requestId = "" } = useParams();
  const navigate = useNavigate();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const { data: offer, isLoading, error } = useQuery({
    queryKey: ["waitlist-offer", requestId],
    queryFn: () => api.getWaitlistOffer(requestId),
    enabled: Boolean(requestId),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!offer?.claim_expires_at) {
      setSecondsLeft(null);
      return;
    }

    const update = () => {
      const remaining = Math.max(0, Math.floor((new Date(offer.claim_expires_at!).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [offer?.claim_expires_at]);

  const claim = useMutation({
    mutationFn: () => api.claimWaitlist(requestId),
    onSuccess: () => {
      if (offer?.activity?.id) {
        navigate(`/activities/${offer.activity.id}/chat`);
      } else {
        navigate("/plans");
      }
    },
  });

  const pass = useMutation({
    mutationFn: () => api.declineWaitlistOffer(requestId),
    onSuccess: () => navigate("/plans"),
  });

  const expired = secondsLeft === 0;
  const hasActiveOffer = Boolean(offer?.claim_expires_at && !expired);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background text-on-surface-variant">
        Loading offer...
      </div>
    );
  }

  if (error || !offer?.activity) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background px-margin-mobile text-center gap-4">
        <Icon name="event_busy" className="text-5xl text-on-surface-variant" />
        <h1 className="font-headline-md text-headline-md">Offer unavailable</h1>
        <p className="text-body-md text-on-surface-variant max-w-sm">
          {(error as Error | undefined)?.message ?? "This waitlist offer is no longer active."}
        </p>
        <PrimaryButton onClick={() => navigate("/plans")}>Back to plans</PrimaryButton>
      </div>
    );
  }

  const activity = offer.activity;

  return (
    <div className="bg-background text-on-background min-h-dvh flex flex-col">
      <main className="flex-grow flex flex-col px-margin-mobile pt-8 pb-10 max-w-md mx-auto w-full relative justify-center">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_center,_rgba(217,119,6,0.05)_0%,_rgba(252,249,246,0)_70%)] opacity-70" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4 shadow-[0_8px_20px_rgba(0,0,0,0.04)]">
            <Icon name="notifications_active" filled className="text-[32px] text-[#D97706]" />
          </div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-2">Spot Available!</h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-[280px]">
            A spot has opened up for your waitlisted activity. Claim it before time runs out.
          </p>
        </div>

        {hasActiveOffer && secondsLeft != null && (
          <div className="relative z-10 flex flex-col items-center mb-8">
            <div className="text-sm font-label-bold text-label-bold uppercase tracking-wider text-on-surface-variant mb-2">
              Time Remaining
            </div>
            <div className="w-48 h-24 rounded-xl bg-surface border-2 border-[#D97706] flex items-center justify-center shadow-[0_12px_24px_rgba(217,119,6,0.08)] animate-pulse">
              <span className="font-headline-xl text-headline-xl text-[#D97706] tabular-nums tracking-tighter">
                {formatCountdown(secondsLeft)}
              </span>
            </div>
          </div>
        )}

        <div className="relative z-10 bg-surface rounded-xl p-4 shadow-[0_8px_20px_rgba(0,0,0,0.04)] border border-surface-container-high w-full mb-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-surface-container overflow-hidden shrink-0">
              {activity.cover_image_ref ? (
                <img src={activity.cover_image_ref} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                  <Icon name="image" />
                </div>
              )}
            </div>
            <div className="flex-grow text-left min-w-0">
              <div className="inline-flex items-center px-2 py-1 rounded-full bg-secondary-fixed text-on-secondary-container font-label-sm text-label-sm mb-1">
                {activity.category_name}
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface line-clamp-2">{activity.title}</h3>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center text-on-surface-variant font-body-md text-body-md">
              <Icon name="calendar_today" className="text-[18px] mr-2" />
              <span>{formatClaimWhen(activity.starts_at, activity.duration_minutes)}</span>
            </div>
            {activity.area_label && (
              <div className="flex items-center text-on-surface-variant font-body-md text-body-md">
                <Icon name="location_on" className="text-[18px] mr-2" />
                <span>{activity.area_label}</span>
              </div>
            )}
          </div>
        </div>

        <div className="relative z-10 mt-auto flex flex-col gap-2 w-full">
          <PrimaryButton
            fullWidth
            disabled={!hasActiveOffer || claim.isPending || activity.is_full}
            onClick={() => claim.mutate()}
          >
            {claim.isPending ? "Claiming..." : "Claim Spot"}
          </PrimaryButton>
          <PrimaryButton
            fullWidth
            variant="outline"
            disabled={pass.isPending}
            onClick={() => pass.mutate()}
          >
            Pass
          </PrimaryButton>
          {claim.isError && (
            <p className="text-body-md text-error text-center">{(claim.error as Error).message}</p>
          )}
          {!hasActiveOffer && (
            <p className="text-body-md text-on-surface-variant text-center">
              {expired ? "This offer has expired." : "Waiting for a spot to open."}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
