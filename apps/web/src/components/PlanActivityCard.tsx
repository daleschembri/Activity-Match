import type { ActivitySummary } from "@activity-match/shared";
import { ActivityCard } from "@activity-match/ui";
import { isActivityEnded } from "@/lib/attendance";

type HostedPlan = ActivitySummary & { also_participating: boolean };

interface PlanActivityCardProps {
  activity: ActivitySummary | HostedPlan;
  tab: "host" | "joined" | "completed";
  completedRole?: "host" | "joined" | "both";
  onOpen: () => void;
}

export function PlanActivityCard({ activity, tab, completedRole, onOpen }: PlanActivityCardProps) {
  const alsoParticipating = tab === "host" && "also_participating" in activity && activity.also_participating;
  const isCompleted = activity.status === "completed";
  const endedUnmarked =
    tab === "host" &&
    !isCompleted &&
    isActivityEnded(activity.starts_at, activity.duration_minutes);

  const showHostingBadge = tab === "host" || completedRole === "host" || completedRole === "both";
  const showJoinedBadge = tab === "joined" || completedRole === "joined" || completedRole === "both";
  const joinedBadgeMuted = completedRole === "both";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 px-1">
        {showHostingBadge && (
          <span className="text-label-sm font-label-bold text-on-primary bg-primary px-2.5 py-1 rounded-full">
            Hosting
          </span>
        )}
        {showJoinedBadge && (
          <span
            className={`text-label-sm font-label-bold px-2.5 py-1 rounded-full ${
              joinedBadgeMuted
                ? "text-primary bg-primary/10 border border-primary/20"
                : "text-on-primary bg-primary"
            }`}
          >
            Joined
          </span>
        )}
        {isCompleted && (
          <span className="text-label-sm font-label-bold text-on-surface-variant bg-surface-variant px-2.5 py-1 rounded-full">
            Completed
          </span>
        )}
        {endedUnmarked && (
          <span className="text-label-sm font-label-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
            Mark attendance
          </span>
        )}
        {alsoParticipating && (
          <span className="text-label-sm font-label-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
            Also participating
          </span>
        )}
      </div>
      <ActivityCard activity={activity} onOpen={onOpen} />
    </div>
  );
}
