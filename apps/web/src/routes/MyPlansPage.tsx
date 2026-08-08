import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ActivityCard, BottomNav, PrimaryButton, ScreenShell } from "@activity-match/ui";
import { api } from "@/lib/api";
import { mainNavCurrentPath, mainNavItems } from "@/lib/mainNav";

export function MyPlansPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = useQuery({ queryKey: ["my-plans"], queryFn: () => api.getMyPlans() });

  return (
    <ScreenShell
      title="My Plans"
      footer={<BottomNav items={[...mainNavItems]} currentPath={mainNavCurrentPath(location.pathname)} onNavigate={navigate} />}
    >
      <div className="space-y-6">
        <section>
          <h2 className="text-label-bold mb-3">Joined</h2>
          <div className="space-y-3">
            {(data?.joined ?? []).map((a) => (
              <ActivityCard key={a.id} activity={a} onOpen={() => navigate(`/activities/${a.id}`)} />
            ))}
            {!data?.joined?.length && <p className="text-on-surface-variant">No joined activities yet.</p>}
          </div>
        </section>
        <section>
          <h2 className="text-label-bold mb-3">Hosting</h2>
          <div className="space-y-3">
            {(data?.hosted ?? []).map((a) => (
              <ActivityCard key={a.id} activity={a} onOpen={() => navigate(`/activities/${a.id}`)} />
            ))}
            {!data?.hosted?.length && <p className="text-on-surface-variant">No hosted activities yet.</p>}
          </div>
        </section>
        <PrimaryButton variant="outline" fullWidth onClick={() => navigate("/host/requests")}>
          Manage join requests
        </PrimaryButton>
      </div>
    </ScreenShell>
  );
}
