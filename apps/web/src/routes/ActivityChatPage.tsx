import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PrimaryButton, ScreenShell, Icon } from "@activity-match/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { groupChatMessages } from "@/lib/chatMessages";
import { ChatMessageList } from "@/components/ChatMessageList";

export function ActivityChatPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = session?.user?.id ?? null;

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

  const displayItems = useMemo(
    () => groupChatMessages(messages, currentUserId),
    [messages, currentUserId],
  );

  const send = useMutation({
    mutationFn: (body: string) => api.sendMessage(id, body),
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["messages", id] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayItems.length, messages.length]);

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
            className="flex-1 rounded-xl border border-outline-variant px-4 py-3 min-h-[48px] bg-surface-container-lowest"
            placeholder="Message participants..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && text.trim() && send.mutate(text.trim())}
          />
          <PrimaryButton
            onClick={() => text.trim() && send.mutate(text.trim())}
            disabled={!text.trim() || send.isPending}
            aria-label="Send message"
          >
            <Icon name="send" />
          </PrimaryButton>
        </div>
      }
    >
      <div className="min-h-full flex flex-col justify-end">
        {messagesError && (
          <p className="text-error text-body-md mb-4" role="alert">
            {(messagesError as Error).message}
          </p>
        )}
        {!messages.length && !messagesError && (
          <p className="text-body-md text-on-surface-variant text-center py-12">
            No messages yet. Say hello to the group.
          </p>
        )}
        <ChatMessageList items={displayItems} />
        <div ref={messagesEndRef} />
      </div>
    </ScreenShell>
  );
}
