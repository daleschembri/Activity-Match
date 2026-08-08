import type { ActivitySummary } from "@activity-match/shared";
import { ActivityCard } from "@activity-match/ui";

type HostedPlan = ActivitySummary & { also_participating: boolean };

interface PlanActivityCardProps {
  activity: ActivitySummary | HostedPlan;
  tab: "host" | "joined";
  onOpen: () => void;
}

export function PlanActivityCard({ activity, tab, onOpen }: PlanActivityCardProps) {
  const alsoParticipating = tab === "host" && "also_participating" in activity && activity.also_participating;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 px-1">
        <span className="text-label-sm font-label-bold text-on-primary bg-primary px-2.5 py-1 rounded-full">
          {tab === "host" ? "Hosting" : "Joined"}
        </span>
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
