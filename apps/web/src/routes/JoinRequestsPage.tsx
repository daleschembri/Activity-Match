import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon, PrimaryButton, ScreenShell } from "@activity-match/ui";
import { api } from "@/lib/api";

function formatRequestWhen(createdAt: string): string {
  return new Date(createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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
      void queryClient.invalidateQueries({ queryKey: ["chats-unread"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  return (
    <ScreenShell title="Join Requests" headerRight={<button type="button" onClick={() => navigate(-1)}><Icon name="close" /></button>}>
      <div className="space-y-4">
        {requests.length === 0 && <p className="text-on-surface-variant">No pending requests.</p>}
        {requests.map((req) => (
          <article key={req.id} className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/20">
            <div className="flex items-start gap-3 mb-3">
              {req.user.avatar_ref ? (
                <img src={req.user.avatar_ref} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center font-bold shrink-0">
                  {req.user.display_name[0]}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="font-bold">{req.user.display_name}</h2>
                <p className="text-label-sm text-on-surface-variant">
                  {req.activity?.title ?? "Activity"} · {formatRequestWhen(req.created_at)}
                </p>
              </div>
            </div>

            <div className="bg-surface-container rounded-xl p-4 mb-4">
              <p className="text-label-bold text-label-bold text-on-surface-variant mb-2">Message</p>
              <p className="text-body-md text-on-surface whitespace-pre-wrap">{req.introduction}</p>
            </div>

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
