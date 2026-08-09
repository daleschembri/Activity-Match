import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ActivitySummary } from "@activity-match/shared";
import { FilterChip, Icon, PrimaryButton, ScreenShell } from "@activity-match/ui";
import { PlanActivityCard } from "@/components/PlanActivityCard";
import { Stagger, StaggerItem } from "@/components/motion/primitives";
import { api } from "@/lib/api";
import { isActivityEnded } from "@/lib/attendance";

type PlansTab = "host" | "joined" | "completed";

type CompletedPlan = {
  activity: ActivitySummary & { also_participating?: boolean };
  role: "host" | "joined" | "both";
};

export function MyPlansPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<PlansTab>("host");
  const { data, isLoading } = useQuery({ queryKey: ["my-plans"], queryFn: () => api.getMyPlans() });
  const { data: joinRequests = [] } = useQuery({
    queryKey: ["join-requests"],
    queryFn: () => api.getJoinRequests(),
  });

  useEffect(() => {
    void api.processActivityLifecycle().then(() => {
      void queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["my-plans"] });
    });
  }, [queryClient]);

  const hosting = data?.hosted ?? [];
  const joined = data?.joined ?? [];

  const activeHosting = useMemo(
    () => hosting.filter((activity) => activity.status !== "completed"),
    [hosting],
  );
  const activeJoined = useMemo(
    () => joined.filter((activity) => activity.status !== "completed"),
    [joined],
  );
  const completed = useMemo(() => {
    const byId = new Map<string, CompletedPlan>();

    for (const activity of hosting) {
      if (activity.status !== "completed") continue;
      byId.set(activity.id, { activity, role: "host" });
    }
    for (const activity of joined) {
      if (activity.status !== "completed") continue;
      const existing = byId.get(activity.id);
      if (existing) {
        existing.role = "both";
      } else {
        byId.set(activity.id, { activity, role: "joined" });
      }
    }

    return Array.from(byId.values()).sort((a, b) => {
      const aTime = a.activity.starts_at ? new Date(a.activity.starts_at).getTime() : 0;
      const bTime = b.activity.starts_at ? new Date(b.activity.starts_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [hosting, joined]);

  const visible =
    tab === "host" ? activeHosting : tab === "joined" ? activeJoined : completed.map((item) => item.activity);
  const pendingRequestCount = joinRequests.length;
  const hasAnyPlans = hosting.length > 0 || joined.length > 0;

  const openActivity = (activity: (typeof visible)[number]) => {
    if (tab === "completed" || activity.status === "completed") {
      navigate(`/activities/${activity.id}/past`);
      return;
    }
    if (tab === "host" && isActivityEnded(activity.starts_at, activity.duration_minutes)) {
      navigate(`/activities/${activity.id}/attendance`);
      return;
    }
    if (tab === "joined" && isActivityEnded(activity.starts_at, activity.duration_minutes)) {
      navigate(`/activities/${activity.id}/feedback`);
      return;
    }
    navigate(`/activities/${activity.id}`);
  };

  const completedRoleById = useMemo(
    () => new Map(completed.map((item) => [item.activity.id, item.role])),
    [completed],
  );

  return (
    <ScreenShell
      title="My Plans"
      reserveBottomNav
      headerRight={
        activeHosting.length > 0 ? (
          <button
            type="button"
            onClick={() => navigate("/host/requests")}
            className="relative flex items-center gap-1.5 text-primary font-label-bold text-label-sm px-2 py-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
            aria-label="Manage join requests"
          >
            <Icon name="inbox" className="text-[20px]" />
            <span>Join requests</span>
            {pendingRequestCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-on-primary text-[11px] font-bold flex items-center justify-center">
                {pendingRequestCount}
              </span>
            )}
          </button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <motion.div
          className="flex gap-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <FilterChip
            label={`Hosting (${activeHosting.length})`}
            selected={tab === "host"}
            onClick={() => setTab("host")}
          />
          <FilterChip
            label={`Joined (${activeJoined.length})`}
            selected={tab === "joined"}
            onClick={() => setTab("joined")}
          />
          {completed.length > 0 && (
            <FilterChip
              label={`Completed (${completed.length})`}
              selected={tab === "completed"}
              onClick={() => setTab("completed")}
            />
          )}
        </motion.div>

        {isLoading && <p className="text-on-surface-variant">Loading plans...</p>}

        {!isLoading && !hasAnyPlans && (
          <motion.div
            className="text-center py-12 space-y-4"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <p className="text-body-md text-on-surface-variant">No plans yet.</p>
            <PrimaryButton onClick={() => navigate("/")}>Discover activities</PrimaryButton>
          </motion.div>
        )}

        {!isLoading && hasAnyPlans && visible.length === 0 && (
          <motion.p
            className="text-body-md text-on-surface-variant text-center py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key={tab}
          >
            {tab === "host"
              ? "You are not hosting any activities yet."
              : tab === "joined"
                ? "You have not joined any activities yet."
                : "No completed activities yet."}
          </motion.p>
        )}

        <AnimatePresence mode="popLayout">
          <Stagger key={tab} className="space-y-3">
            {visible.map((activity) => (
              <StaggerItem key={activity.id}>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  layout
                >
                  <PlanActivityCard
                    activity={activity}
                    tab={tab === "completed" ? "completed" : tab}
                    completedRole={completedRoleById.get(activity.id)}
                    onOpen={() => openActivity(activity)}
                  />
                </motion.div>
              </StaggerItem>
            ))}
          </Stagger>
        </AnimatePresence>
      </div>
    </ScreenShell>
  );
}
