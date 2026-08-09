import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ChatPollPayload } from "@activity-match/shared";
import { Icon, PrimaryButton } from "@activity-match/ui";
import { ArchivedChatBanner } from "@/components/chat/ArchivedChatBanner";
import { ArchivedChatFooter } from "@/components/chat/ArchivedChatFooter";
import { ChatAttachmentSheet } from "@/components/chat/ChatAttachmentSheet";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { CreatePollSheet } from "@/components/chat/CreatePollSheet";
import { PinnedActivityCard } from "@/components/chat/PinnedActivityCard";
import { ChatMessageList } from "@/components/ChatMessageList";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { groupChatMessages, type ChatMessage } from "@/lib/chatMessages";
import { applyPollVote } from "@/lib/pollVotes";

export function ActivityChatPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [text, setText] = useState("");
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [attachmentSheetOpen, setAttachmentSheetOpen] = useState(false);
  const [pollSheetOpen, setPollSheetOpen] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [checkinError, setCheckinError] = useState<string | null>(null);
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

  const { data: participants = [] } = useQuery({
    queryKey: ["chat-participants", id],
    queryFn: () => api.getChatParticipants(id),
    enabled: Boolean(id) && canAccess === true,
  });

  const { data: messages = [], error: messagesError } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => api.getMessages(id),
    enabled: Boolean(id) && canAccess === true,
    refetchInterval: 5000,
  });

  const { data: checkinStatus } = useQuery({
    queryKey: ["attendance-checkin", id],
    queryFn: async () => {
      await api.ensureAttendanceCheckin(id);
      return api.getAttendanceCheckinStatus(id);
    },
    enabled: Boolean(id) && canAccess === true && activity?.status === "published" && Boolean(activity?.starts_at),
    refetchInterval: 15_000,
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
      queryClient.invalidateQueries({ queryKey: ["chats-unread"] });
      queryClient.invalidateQueries({ queryKey: ["my-chats"] });
    },
  });

  const votePoll = useMutation({
    mutationFn: ({ messageId, optionId }: { messageId: string; optionId: string }) =>
      api.voteChatPoll(messageId, optionId),
    onMutate: async ({ messageId, optionId }) => {
      setVoteError(null);
      setVotingPollId(messageId);
      await queryClient.cancelQueries({ queryKey: ["messages", id] });
      const previous = queryClient.getQueryData<ChatMessage[]>(["messages", id]);
      if (previous && currentUserId) {
        queryClient.setQueryData<ChatMessage[]>(
          ["messages", id],
          previous.map((message) =>
            message.id === messageId && message.type === "poll"
              ? {
                  ...message,
                  payload: applyPollVote(
                    message.payload as unknown as ChatPollPayload,
                    optionId,
                    currentUserId,
                  ) as unknown as Record<string, unknown>,
                }
              : message,
          ),
        );
      }
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["messages", id], context.previous);
      }
      setVoteError(error instanceof Error ? error.message : "Could not record your vote");
    },
    onSettled: () => setVotingPollId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", id] });
    },
  });

  const createPoll = useMutation({
    mutationFn: (payload: { question: string; options: string[]; allowMultiple: boolean }) =>
      api.createChatPoll(id, payload),
    onSuccess: () => {
      setPollSheetOpen(false);
      queryClient.invalidateQueries({ queryKey: ["messages", id] });
      queryClient.invalidateQueries({ queryKey: ["my-chats"] });
    },
  });

  const confirmCheckin = useMutation({
    mutationFn: (attending: boolean) => api.confirmActivityCheckin(id, attending),
    onMutate: () => setCheckinError(null),
    onSuccess: (_data, attending) => {
      queryClient.invalidateQueries({ queryKey: ["attendance-checkin", id] });
      queryClient.invalidateQueries({ queryKey: ["messages", id] });
      queryClient.invalidateQueries({ queryKey: ["chat-participants", id] });
      queryClient.invalidateQueries({ queryKey: ["activity", id] });
      if (!attending) {
        navigate(`/activities/${id}`);
      }
    },
    onError: (error) => {
      setCheckinError(error instanceof Error ? error.message : "Could not update your check-in");
    },
  });

  useEffect(() => {
    if (!id || canAccess !== true) return;
    void api.markConversationRead(id).then(() => {
      queryClient.invalidateQueries({ queryKey: ["chats-unread"] });
      queryClient.invalidateQueries({ queryKey: ["my-chats"] });
    });
  }, [id, canAccess, messages.length, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayItems.length, messages.length]);

  if (accessLoading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-surface">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="h-dvh bg-surface flex flex-col">
        <header className="px-margin-mobile py-3 border-b border-outline-variant/30">
          <button type="button" onClick={() => navigate(-1)} aria-label="Go back">
            <Icon name="arrow_back" />
          </button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-margin-mobile space-y-4">
          <Icon name="lock" className="text-4xl text-on-surface-variant" />
          <h2 className="text-headline-md font-bold">Chat not available yet</h2>
          <p className="text-body-md text-on-surface-variant max-w-sm">
            {activity?.viewer_role === "requester"
              ? "Your join request is pending. Chat opens once the host accepts you."
              : "You can only join the chat after you are accepted to this activity."}
          </p>
          <PrimaryButton onClick={() => navigate(`/activities/${id}`)}>View activity</PrimaryButton>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="h-dvh flex items-center justify-center bg-surface">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  const isReadOnly = activity.status === "completed";

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden">
      <ChatHeader
        activity={activity}
        participants={participants}
        isReadOnly={isReadOnly}
        onBack={() => navigate("/chats")}
        onMore={() => navigate(`/activities/${id}`)}
      />

      {isReadOnly && <ArchivedChatBanner />}

      {!isReadOnly && <PinnedActivityCard activity={activity} participants={participants} variant="active" />}
      {isReadOnly && <PinnedActivityCard activity={activity} participants={participants} variant="archived" />}

      <main
        className={`flex-1 overflow-y-auto px-margin-mobile py-4 min-h-0 ${
          isReadOnly ? "bg-surface-container-lowest opacity-90 pb-28" : "bg-surface pb-24"
        }`}
      >
        {messagesError && (
          <p className="text-error text-body-md mb-4" role="alert">
            {(messagesError as Error).message}
          </p>
        )}
        {voteError && (
          <p className="text-error text-body-md mb-4" role="alert">
            {voteError}
          </p>
        )}
        {checkinError && (
          <p className="text-error text-body-md mb-4" role="alert">
            {checkinError}
          </p>
        )}
        {!messages.length && !messagesError && (
          <p className="text-body-md text-on-surface-variant text-center py-12">
            No messages yet. Say hello to the group.
          </p>
        )}
        <ChatMessageList
          items={displayItems}
          participants={participants}
          currentUserId={currentUserId}
          readOnly={isReadOnly}
          muted={isReadOnly}
          votingPollId={votingPollId}
          onVotePoll={(messageId, optionId) => votePoll.mutate({ messageId, optionId })}
          checkinStatus={checkinStatus}
          checkinLoading={confirmCheckin.isPending}
          onConfirmCheckin={() => confirmCheckin.mutate(true)}
          onDeclineCheckin={() => confirmCheckin.mutate(false)}
        />
        <div ref={messagesEndRef} />
      </main>

      {isReadOnly ? (
        <ArchivedChatFooter
          onRepeat={() =>
            navigate("/create/describe", {
              state: { repeatFromActivityId: id, title: activity.title },
            })
          }
        />
      ) : (
        <ChatComposer
          value={text}
          onChange={setText}
          onSend={() => text.trim() && send.mutate(text.trim())}
          onAttachClick={() => setAttachmentSheetOpen(true)}
          disabled={send.isPending}
        />
      )}

      <ChatAttachmentSheet
        open={attachmentSheetOpen}
        onClose={() => setAttachmentSheetOpen(false)}
        onCreatePoll={() => setPollSheetOpen(true)}
      />
      <CreatePollSheet
        open={pollSheetOpen}
        loading={createPoll.isPending}
        onClose={() => setPollSheetOpen(false)}
        onSubmit={(payload) => {
          void createPoll.mutateAsync(payload);
        }}
      />
    </div>
  );
}
