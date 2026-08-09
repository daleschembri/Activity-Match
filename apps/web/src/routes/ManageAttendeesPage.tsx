import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon, PrimaryButton, ScreenShell } from "@activity-match/ui";
import { UserAvatar } from "@/components/UserAvatar";
import { api } from "@/lib/api";

export function ManageAttendeesPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { data: activity, isLoading } = useQuery({
    queryKey: ["activity", id],
    queryFn: () => api.getActivity(id),
    enabled: Boolean(id),
  });

  const attendees = useMemo(() => {
    if (!activity) return [];
    const hostId = activity.host.id;
    return (activity.participants ?? []).filter((p) => p.id !== hostId);
  }, [activity]);

  const remove = async (userId: string, name: string) => {
    if (!window.confirm(`Remove ${name} from this activity? They will be notified.`)) return;
    setRemovingId(userId);
    try {
      await api.removeParticipant(id, userId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["activity", id] }),
        queryClient.invalidateQueries({ queryKey: ["my-plans"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not remove attendee");
    } finally {
      setRemovingId(null);
    }
  };

  if (isLoading) {
    return (
      <ScreenShell title="Manage attendees">
        <p className="text-on-surface-variant">Loading...</p>
      </ScreenShell>
    );
  }

  if (!activity || activity.viewer_role !== "host") {
    return (
      <ScreenShell title="Manage attendees">
        <p className="text-on-surface-variant">Only the host can manage attendees.</p>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Manage attendees">
      <div className="space-y-6 pb-4">
        <p className="text-body-md text-on-surface-variant">
          Remove someone if they can no longer attend. This updates the attendee list and notifies them.
        </p>

        {attendees.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Icon name="group" className="text-4xl text-on-surface-variant mx-auto opacity-60" />
            <p className="text-body-md text-on-surface-variant">No confirmed attendees yet.</p>
            <PrimaryButton variant="outline" onClick={() => navigate("/host/requests")}>
              Review join requests
            </PrimaryButton>
          </div>
        ) : (
          <ul className="divide-y divide-surface-variant rounded-xl border border-surface-variant overflow-hidden bg-surface-container-lowest">
            {attendees.map((attendee) => (
              <li key={attendee.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar name={attendee.display_name} avatarRef={attendee.avatar_ref} />
                  <span className="font-label-bold truncate">{attendee.display_name}</span>
                </div>
                <button
                  type="button"
                  className="text-label-bold text-on-surface-variant border border-outline-variant rounded-full px-4 py-2 hover:bg-surface-container-low disabled:opacity-50 shrink-0"
                  disabled={removingId === attendee.id}
                  onClick={() => remove(attendee.id, attendee.display_name)}
                >
                  {removingId === attendee.id ? "Removing..." : "Remove"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ScreenShell>
  );
}
