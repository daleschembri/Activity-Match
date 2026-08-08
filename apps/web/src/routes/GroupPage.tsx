import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ActivityCard, Icon, PrimaryButton, ScreenShell } from "@activity-match/ui";
import { api } from "@/lib/api";

export function GroupPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: group } = useQuery({
    queryKey: ["group", id],
    queryFn: () => api.getGroup(id),
    enabled: Boolean(id),
  });

  if (!group) return <ScreenShell title="Group"><p>Loading...</p></ScreenShell>;

  return (
    <ScreenShell
      title={group.name}
      headerRight={<button type="button" onClick={() => navigate(-1)}><Icon name="arrow_back" /></button>}
    >
      <div className="space-y-6">
        <p className="text-body-md text-on-surface-variant">{group.description}</p>
        <div className="flex flex-wrap gap-2 text-label-sm">
          <span className="bg-surface-container px-3 py-1 rounded-full capitalize">{group.frequency}</span>
          <span className="bg-surface-container px-3 py-1 rounded-full">{group.member_count} members</span>
          <span className="bg-surface-container px-3 py-1 rounded-full capitalize">{group.attendance_mode} attendance</span>
        </div>
        <section>
          <h2 className="text-label-bold mb-3">Upcoming sessions</h2>
          <div className="space-y-3">
            {group.upcoming_sessions.map((s) => (
              <ActivityCard key={s.id} activity={s} onOpen={() => navigate(`/activities/${s.id}`)} />
            ))}
          </div>
        </section>
        <PrimaryButton fullWidth onClick={() => navigate(`/activities/${group.upcoming_sessions[0]?.id}/chat`)}>
          Open group chat
        </PrimaryButton>
      </div>
    </ScreenShell>
  );
}
