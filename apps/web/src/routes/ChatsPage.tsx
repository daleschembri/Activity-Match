import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Icon, PrimaryButton } from "@activity-match/ui";
import { ChatListRow } from "@/components/chat/ChatListRow";
import { Stagger, StaggerItem } from "@/components/motion/primitives";
import { splitChatsBySection } from "@/lib/chatList";
import { api } from "@/lib/api";

export function ChatsPage() {
  const navigate = useNavigate();
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => api.getProfile() });
  const { data: chats = [], isLoading, error } = useQuery({
    queryKey: ["my-chats"],
    queryFn: () => api.getMyChats(),
    refetchInterval: 15_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const { happeningSoon, past } = useMemo(() => splitChatsBySection(chats), [chats]);

  return (
    <div className="h-dvh overflow-hidden bg-background text-on-surface flex flex-col">
      <header className="bg-surface sticky top-0 z-40 flex justify-between items-center px-margin-mobile py-2 shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            aria-label="Profile"
            className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden shrink-0"
          >
            {profile?.avatar_ref ? (
              <img src={profile.avatar_ref} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                <Icon name="person" />
              </div>
            )}
          </button>
          <h1 className="text-headline-lg-mobile font-extrabold text-primary">Chats</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate("/notifications")}
          aria-label="Notifications"
          className="w-12 h-12 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high rounded-full active:scale-95"
        >
          <Icon name="notifications" className="text-2xl" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-margin-mobile pt-4 pb-24 min-h-0">
        {error && (
          <p className="text-error text-body-md mb-4" role="alert">
            {(error as Error).message}
          </p>
        )}

        {isLoading && (
          <motion.p
            className="text-on-surface-variant"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Loading chats...
          </motion.p>
        )}

        {!isLoading && !error && chats.length === 0 && (
          <motion.div
            className="text-center py-12 space-y-4"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            <Icon name="chat_bubble_outline" className="text-4xl text-on-surface-variant mx-auto" />
            <p className="text-body-md text-on-surface-variant max-w-sm mx-auto">
              No chats yet. You can chat once you are accepted to an activity, or when you host one.
            </p>
            <PrimaryButton onClick={() => navigate("/")}>Discover activities</PrimaryButton>
          </motion.div>
        )}

        {!isLoading && happeningSoon.length > 0 && (
          <section className="mb-8">
            <h2 className="text-headline-md font-bold text-on-surface mb-4">Happening soon</h2>
            <Stagger className="space-y-3">
              {happeningSoon.map((chat) => (
                <StaggerItem key={chat.id}>
                  <ChatListRow chat={chat} onClick={() => navigate(`/activities/${chat.id}/chat`)} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        )}

        {!isLoading && past.length > 0 && (
          <section className="mb-8 opacity-90">
            <h2 className="text-headline-md font-bold text-on-surface-variant mb-4">Past</h2>
            <Stagger className="space-y-3">
              {past.map((chat) => (
                <StaggerItem key={chat.id}>
                  <ChatListRow chat={chat} onClick={() => navigate(`/activities/${chat.id}/chat`)} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        )}
      </main>
    </div>
  );
}
