import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { FilterChip, Icon, PrimaryButton, ScreenShell } from "@activity-match/ui";
import { Stagger, StaggerItem } from "@/components/motion/primitives";
import { api } from "@/lib/api";

type ChatTab = "host" | "participant";

export function ChatsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ChatTab>("host");
  const { data: chats = [], isLoading } = useQuery({
    queryKey: ["my-chats"],
    queryFn: () => api.getMyChats(),
  });

  const hosting = useMemo(() => chats.filter((c) => c.chat_role === "host"), [chats]);
  const joined = useMemo(() => chats.filter((c) => c.chat_role === "participant"), [chats]);
  const visible = tab === "host" ? hosting : joined;

  return (
    <ScreenShell title="Chats" reserveBottomNav>
      <div className="space-y-4">
        <motion.div
          className="flex gap-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <FilterChip
            label={`Hosting (${hosting.length})`}
            selected={tab === "host"}
            onClick={() => setTab("host")}
          />
          <FilterChip
            label={`Joined (${joined.length})`}
            selected={tab === "participant"}
            onClick={() => setTab("participant")}
          />
        </motion.div>

        {isLoading && (
          <motion.p
            className="text-on-surface-variant"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Loading chats...
          </motion.p>
        )}

        {!isLoading && chats.length === 0 && (
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

        {!isLoading && chats.length > 0 && visible.length === 0 && (
          <motion.p
            className="text-body-md text-on-surface-variant text-center py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key={tab}
          >
            {tab === "host" ? "You are not hosting any activities yet." : "You have not joined any activities yet."}
          </motion.p>
        )}

        <AnimatePresence mode="popLayout">
          <Stagger key={tab} className="space-y-3">
            {visible.map((chat) => {
              const when = chat.starts_at
                ? new Date(chat.starts_at).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Flexible timing";

              return (
                <StaggerItem key={chat.id}>
                  <motion.button
                    type="button"
                    onClick={() => navigate(`/activities/${chat.id}/chat`)}
                    className="w-full text-left bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4 flex items-center gap-3"
                    whileHover={{ scale: 1.01, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    layout
                  >
                    <div className="w-11 h-11 rounded-full bg-primary-container/15 text-primary flex items-center justify-center shrink-0">
                      <Icon name="chat" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-headline-md font-bold truncate">{chat.title}</h2>
                      <p className="text-body-md text-on-surface-variant truncate">{when}</p>
                      {chat.area_label && (
                        <p className="text-label-sm text-on-surface-variant truncate">{chat.area_label}</p>
                      )}
                    </div>
                    <Icon name="chevron_right" className="text-on-surface-variant shrink-0" />
                  </motion.button>
                </StaggerItem>
              );
            })}
          </Stagger>
        </AnimatePresence>
      </div>
    </ScreenShell>
  );
}
