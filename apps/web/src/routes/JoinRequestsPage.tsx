import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon, PrimaryButton, ScreenShell } from "@activity-match/ui";
import { api } from "@/lib/api";

export function JoinRequestsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: requests = [] } = useQuery({ queryKey: ["join-requests"], queryFn: () => api.getJoinRequests() });

  const respond = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "accept" | "decline" | "waitlist" }) =>
      api.respondToJoinRequest(id, decision),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["join-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["my-chats"] });
    },
  });

  return (
    <ScreenShell title="Join Requests" headerRight={<button type="button" onClick={() => navigate(-1)}><Icon name="close" /></button>}>
      <div className="space-y-4">
        {requests.length === 0 && <p className="text-on-surface-variant">No pending requests.</p>}
        {requests.map((req) => (
          <article key={req.id} className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center font-bold">
                {req.user.display_name[0]}
              </div>
              <div>
                <h2 className="font-bold">{req.user.display_name}</h2>
                <p className="text-label-sm text-on-surface-variant">Wants to join</p>
              </div>
            </div>
            {req.introduction && <p className="text-body-md mb-4">{req.introduction}</p>}
            <div className="flex gap-2">
              <PrimaryButton variant="outline" fullWidth onClick={() => respond.mutate({ id: req.id, decision: "decline" })}>Decline</PrimaryButton>
              <PrimaryButton variant="secondary" fullWidth onClick={() => respond.mutate({ id: req.id, decision: "waitlist" })}>Waitlist</PrimaryButton>
              <PrimaryButton fullWidth onClick={() => respond.mutate({ id: req.id, decision: "accept" })}>Accept</PrimaryButton>
            </div>
          </article>
        ))}
      </div>
    </ScreenShell>
  );
}
