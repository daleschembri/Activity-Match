import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Icon, PrimaryButton } from "@activity-match/ui";
import { UserAvatar } from "@/components/UserAvatar";
import { api } from "@/lib/api";
import { formatActivityDate } from "@/lib/attendance";

function formatDuration(minutes: number | null): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function PastActivityDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const { data: activity, isLoading } = useQuery({
    queryKey: ["past-activity", id],
    queryFn: () => api.getPastActivity(id),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center px-margin-mobile text-center">
        <div className="space-y-4">
          <p className="text-on-surface-variant">This completed activity could not be found.</p>
          <PrimaryButton onClick={() => navigate("/plans")}>Back to plans</PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-on-background flex flex-col pb-8">
      <header className="sticky top-0 z-10 bg-surface flex items-center justify-between px-margin-mobile py-2 border-b border-surface-container-high">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-container-high text-primary"
        >
          <Icon name="arrow_back" />
        </button>
        <h1 className="text-headline-md font-bold truncate max-w-[200px]">{activity.title}</h1>
        <div className="w-11" />
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-margin-mobile py-6 flex flex-col gap-8">
        <section className="bg-surface-container-lowest rounded-xl p-6 border border-surface-variant shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-start mb-4">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-surface-tint/10 text-primary font-label-bold text-label-sm">
                <Icon name="check_circle" className="text-base mr-1" filled />
                Completed
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-surface-variant text-on-surface-variant font-label-sm">
                {activity.category.name}
              </span>
            </div>
            <span className="text-on-surface-variant text-label-sm">
              {formatActivityDate(activity.starts_at)}
            </span>
          </div>

          <h2 className="text-headline-xl font-extrabold mb-2">{activity.title}</h2>
          {activity.location && (
            <p className="text-body-lg text-on-surface-variant flex items-center gap-2 mb-4">
              <Icon name="location_on" />
              {activity.location.name}
            </p>
          )}

          {activity.cover_image_ref && (
            <div className="h-[200px] rounded-lg overflow-hidden mb-4">
              <img src={activity.cover_image_ref} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low p-4 rounded-lg flex flex-col items-center text-center">
              <Icon name="timer" className="text-primary mb-1" filled />
              <span className="text-headline-md font-bold">{formatDuration(activity.duration_minutes)}</span>
              <span className="text-label-sm text-on-surface-variant">Duration</span>
            </div>
            <div className="bg-surface-container-low p-4 rounded-lg flex flex-col items-center text-center">
              <Icon name="group" className="text-primary mb-1" filled />
              <span className="text-headline-md font-bold">{activity.attendees.length}</span>
              <span className="text-label-sm text-on-surface-variant">Attendees</span>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h3 className="text-headline-md font-bold px-1">Attendees</h3>
          <div className="bg-surface-container-lowest rounded-xl border border-surface-variant overflow-hidden">
            <ul className="divide-y divide-surface-variant">
              {activity.attendees.map((attendee) => (
                <li key={attendee.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <UserAvatar name={attendee.display_name} avatarRef={attendee.avatar_ref} />
                    <span className="font-label-bold">
                      {attendee.display_name}
                      {attendee.is_host ? " (Organizer)" : ""}
                    </span>
                  </div>
                  {attendee.is_host && <Icon name="verified" className="text-primary" filled />}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          {activity.chat_read_only && (
            <PrimaryButton
              variant="outline"
              fullWidth
              className="rounded-xl"
              onClick={() => navigate(`/activities/${id}/chat`)}
            >
              <span className="inline-flex items-center gap-2">
                <Icon name="forum" />
                View Chat (Read-only)
              </span>
            </PrimaryButton>
          )}
          <PrimaryButton
            fullWidth
            className="rounded-xl"
            onClick={() =>
              navigate("/create/describe", {
                state: { repeatFromActivityId: id, title: activity.title },
              })
            }
          >
            <span className="inline-flex items-center gap-2">
              <Icon name="replay" filled />
              Repeat with this group
            </span>
          </PrimaryButton>
        </section>
      </main>
    </div>
  );
}
