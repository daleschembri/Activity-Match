import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { BottomNav, FilterChip, PrimaryButton, ScreenShell } from "@activity-match/ui";
import { PlanActivityCard } from "@/components/PlanActivityCard";
import { Stagger, StaggerItem } from "@/components/motion/primitives";
import { api } from "@/lib/api";
import { mainNavCurrentPath, mainNavItems } from "@/lib/mainNav";

type PlansTab = "host" | "joined";

export function MyPlansPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<PlansTab>("host");
  const { data, isLoading } = useQuery({ queryKey: ["my-plans"], queryFn: () => api.getMyPlans() });

  const hosting = data?.hosted ?? [];
  const joined = data?.joined ?? [];
  const visible = tab === "host" ? hosting : joined;

  return (
    <ScreenShell
      title="My Plans"
      footer={
        <BottomNav
          items={[...mainNavItems]}
          currentPath={mainNavCurrentPath(location.pathname)}
          onNavigate={navigate}
        />
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
            label={`Hosting (${hosting.length})`}
            selected={tab === "host"}
            onClick={() => setTab("host")}
          />
          <FilterChip
            label={`Joined (${joined.length})`}
            selected={tab === "joined"}
            onClick={() => setTab("joined")}
          />
        </motion.div>

        {isLoading && <p className="text-on-surface-variant">Loading plans...</p>}

        {!isLoading && hosting.length === 0 && joined.length === 0 && (
          <motion.div
            className="text-center py-12 space-y-4"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <p className="text-body-md text-on-surface-variant">No plans yet.</p>
            <PrimaryButton onClick={() => navigate("/")}>Discover activities</PrimaryButton>
          </motion.div>
        )}

        {!isLoading && (hosting.length > 0 || joined.length > 0) && visible.length === 0 && (
          <motion.p
            className="text-body-md text-on-surface-variant text-center py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key={tab}
          >
            {tab === "host" ? "You are not hosting any activities yet." : "You have not joined any activities yet."}
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
                    tab={tab}
                    onOpen={() => navigate(`/activities/${activity.id}`)}
                  />
                </motion.div>
              </StaggerItem>
            ))}
          </Stagger>
        </AnimatePresence>

        {tab === "host" && hosting.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <PrimaryButton variant="outline" fullWidth onClick={() => navigate("/host/requests")}>
              Manage join requests
            </PrimaryButton>
          </motion.div>
        )}
      </div>
    </ScreenShell>
  );
}
