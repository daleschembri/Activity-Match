import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon, PrimaryButton, ScreenShell } from "@activity-match/ui";
import type { JoinRequest } from "@activity-match/shared";
import { api } from "@/lib/api";

type RequestTab = "pending" | "waitlisted";

function formatRequestWhen(createdAt: string): string {
  return new Date(createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function RequestCard({
  req,
  tab,
  onRespond,
  loading,
}: {
  req: JoinRequest;
  tab: RequestTab;
  onRespond: (id: string, decision: "accept" | "decline" | "waitlist") => void;
  loading: boolean;
}) {
  const showWaitlistAction = tab === "pending" && req.activity?.is_full;

  return (
    <article className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/20">
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
          {tab === "waitlisted" && req.waitlist_position != null && (
            <p className="text-label-sm text-secondary mt-1">Waitlist position #{req.waitlist_position}</p>
          )}
        </div>
      </div>

      <div className="bg-surface-container rounded-xl p-4 mb-4">
        <p className="text-label-bold text-label-bold text-on-surface-variant mb-2">Message</p>
        <p className="text-body-md text-on-surface whitespace-pre-wrap">{req.introduction}</p>
      </div>

      <div className="flex gap-2">
        <PrimaryButton
          variant="outline"
          fullWidth
          disabled={loading}
          onClick={() => onRespond(req.id, "decline")}
        >
          Decline
        </PrimaryButton>
        {showWaitlistAction && (
          <PrimaryButton
            variant="secondary"
            fullWidth
            disabled={loading}
            onClick={() => onRespond(req.id, "waitlist")}
          >
            Waitlist
          </PrimaryButton>
        )}
        <PrimaryButton fullWidth disabled={loading} onClick={() => onRespond(req.id, "accept")}>
          Accept
        </PrimaryButton>
      </div>
    </article>
  );
}

export function JoinRequestsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "waitlisted" ? "waitlisted" : "pending";
  const [tab, setTab] = useState<RequestTab>(initialTab);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["join-requests", tab],
    queryFn: () => api.getJoinRequests(tab),
  });

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

  const emptyCopy =
    tab === "pending" ? "No pending requests." : "No one on the waitlist yet.";

  return (
    <ScreenShell title="Join Requests" headerRight={<button type="button" onClick={() => navigate(-1)}><Icon name="close" /></button>}>
      <div className="flex gap-6 border-b-2 border-surface-container-high mb-6">
        {(["pending", "waitlisted"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`pb-2 border-b-2 font-label-bold text-label-bold transition-colors capitalize ${
              tab === value
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {value === "waitlisted" ? "Waitlist" : "Pending"}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {isLoading && <p className="text-on-surface-variant">Loading requests...</p>}
        {!isLoading && requests.length === 0 && <p className="text-on-surface-variant">{emptyCopy}</p>}
        {requests.map((req) => (
          <RequestCard
            key={req.id}
            req={req}
            tab={tab}
            loading={respond.isPending}
            onRespond={(id, decision) => respond.mutate({ id, decision })}
          />
        ))}
      </div>
    </ScreenShell>
  );
}
