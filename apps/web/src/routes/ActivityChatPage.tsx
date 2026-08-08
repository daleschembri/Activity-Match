import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PrimaryButton, ScreenShell, SystemMessage, Icon } from "@activity-match/ui";
import { api } from "@/lib/api";

export function ActivityChatPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");

  const { data: canAccess, isLoading: accessLoading } = useQuery({
    queryKey: ["chat-access", id],
    queryFn: () => api.canAccessActivityChat(id),
    enabled: Boolean(id),
  });

  const { data: activity } = useQuery({
    queryKey: ["activity", id],
    queryFn: () => api.getActivity(id),
    enabled: Boolean(id),
  });

  const { data: messages = [], error: messagesError } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => api.getMessages(id),
    enabled: Boolean(id) && canAccess === true,
    refetchInterval: 5000,
  });

  const send = useMutation({
    mutationFn: (body: string) => api.sendMessage(id, body),
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["messages", id] });
    },
  });

  if (accessLoading) {
    return (
      <ScreenShell title="Activity Chat">
        <p className="text-on-surface-variant">Loading...</p>
      </ScreenShell>
    );
  }

  if (!canAccess) {
    return (
      <ScreenShell
        title="Activity Chat"
        headerRight={
          <button type="button" onClick={() => navigate(-1)} aria-label="Go back">
            <Icon name="arrow_back" />
          </button>
        }
      >
        <div className="text-center py-12 space-y-4">
          <Icon name="lock" className="text-4xl text-on-surface-variant mx-auto" />
          <h2 className="text-headline-md font-bold">Chat not available yet</h2>
          <p className="text-body-md text-on-surface-variant max-w-sm mx-auto">
            {activity?.viewer_role === "requester"
              ? "Your join request is pending. Chat opens once the host accepts you."
              : "You can only join the chat after you are accepted to this activity."}
          </p>
          <PrimaryButton onClick={() => navigate(`/activities/${id}`)}>View activity</PrimaryButton>
        </div>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title={activity?.title ?? "Activity Chat"}
      headerRight={
        <button type="button" onClick={() => navigate("/chats")} aria-label="Back to chats">
          <Icon name="arrow_back" />
        </button>
      }
      footer={
        <div className="p-margin-mobile border-t border-outline-variant/30 flex gap-2">
          <input
            className="flex-1 rounded-xl border border-outline-variant px-4 py-3 min-h-[48px]"
            placeholder="Message participants..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && text && send.mutate(text)}
          />
          <PrimaryButton onClick={() => text && send.mutate(text)} aria-label="Send message">
            <Icon name="send" />
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-2">
        {messagesError && (
          <p className="text-error text-body-md" role="alert">
            {(messagesError as Error).message}
          </p>
        )}
        {messages.map((m) =>
          m.type === "system" ? (
            <SystemMessage key={m.id} type={(m.payload.system_type as string) ?? "info"} body={m.body} />
          ) : (
            <div key={m.id} className={`flex ${m.sender_user_id ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%] rounded-xl px-4 py-2 bg-surface-container-lowest border border-outline-variant/20">
                <p className="text-body-md">{m.body}</p>
              </div>
            </div>
          ),
        )}
      </div>
    </ScreenShell>
  );
}
