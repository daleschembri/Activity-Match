import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Icon, PrimaryButton } from "@activity-match/ui";
import { BrandHeader } from "@/components/GathereLogo";
import { DiscoverFeedCard } from "@/components/DiscoverFeedCard";
import { JoinRequestSheet } from "@/components/JoinRequestSheet";
import { NotificationSetupBanner } from "@/components/NotificationSetupBanner";
import { UnreadBadge } from "@/components/UnreadBadge";
import { Pressable } from "@/components/motion/primitives";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { flushQueue, queueSwipe } from "@/lib/offline-queue";
import { loadFeedFilters } from "@/lib/feedFilters";
import { springSoft } from "@/lib/motion";

type SwipeAnim = "idle" | "left" | "right" | "up";

export function DiscoverPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const reducedMotion = useReducedMotion();
  const [swipeAnim, setSwipeAnim] = useState<SwipeAnim>("idle");
  const [isCompletingSwipe, setIsCompletingSwipe] = useState(false);
  const [joinSheetOpen, setJoinSheetOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const pendingIntroductionRef = useRef<string | null>(null);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => api.getProfile() });
  const { data: starred = [] } = useQuery({
    queryKey: ["starred-activities"],
    queryFn: () => api.getStarredActivities(),
    refetchOnMount: "always",
  });
  const feedFilters = loadFeedFilters();
  const { data, isLoading, error } = useQuery({
    queryKey: ["feed", feedFilters.include_full],
    queryFn: () => api.getFeed({ include_full: feedFilters.include_full }),
    refetchOnMount: "always",
  });

  useEffect(() => {
    void flushQueue(async (item) => {
      await api.recordSwipe({ ...item.payload, idempotency_key: item.idempotency_key });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["starred-activities"] });
      await queryClient.invalidateQueries({ queryKey: ["my-chats"] });
      await queryClient.invalidateQueries({ queryKey: ["chats-unread"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    });
  }, [queryClient]);

  const items = data?.items ?? [];
  const current = items[0] ?? null;
  const hasStack = items.length > 1;

  const completeSwipe = async (direction: "left" | "right" | "up") => {
    if (!current || isCompletingSwipe) return;
    setIsCompletingSwipe(true);
    const key = `swipe-${current.id}-${direction}`;
    try {
      await api.recordSwipe({
        activity_id: current.id,
        direction,
        position_in_feed: 0,
        dwell_ms: 1200,
        idempotency_key: key,
        introduction: direction === "right" ? pendingIntroductionRef.current ?? undefined : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["starred-activities"] });
      await queryClient.invalidateQueries({ queryKey: ["my-chats"] });
      await queryClient.invalidateQueries({ queryKey: ["chats-unread"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    } catch {
      if (direction === "right") {
        window.alert("Could not send your join request. Try again from the activity page.");
      } else {
        queueSwipe({ activity_id: current.id, direction, position_in_feed: 0, dwell_ms: 1200 }, key);
      }
    }
    pendingIntroductionRef.current = null;
    trackEvent("swipe", { activity_id: current.id, direction, position: 0 });
    setSwipeAnim("idle");
    setIsCompletingSwipe(false);

    const remaining = items.filter((item) => item.id !== current.id);
    if (remaining.length === 0) {
      navigate("/feed/exhausted");
    }
  };

  const beginJoinSwipe = async (introduction: string) => {
    if (!current || swipeAnim !== "idle" || isCompletingSwipe) return;
    pendingIntroductionRef.current = introduction;
    setJoinSheetOpen(false);
    setJoining(true);
    if (reducedMotion) {
      await completeSwipe("right");
      setJoining(false);
      return;
    }
    setSwipeAnim("right");
    setJoining(false);
  };

  const handleSwipe = (direction: "left" | "right" | "up") => {
    if (!current || swipeAnim !== "idle" || isCompletingSwipe) return;
    if (direction === "right") {
      setJoinSheetOpen(true);
      return;
    }
    if (reducedMotion) {
      void completeSwipe(direction);
      return;
    }
    setSwipeAnim(direction);
  };

  const cardAnimate =
    swipeAnim === "left"
      ? { x: -360, opacity: 0, rotate: -12, scale: 0.92 }
      : swipeAnim === "right"
        ? { x: 360, opacity: 0, rotate: 12, scale: 0.92 }
        : swipeAnim === "up"
          ? { y: -220, opacity: 0, scale: 0.88 }
          : { x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 };

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-surface text-on-surface select-none">
      <motion.header
        className="w-full sticky top-0 bg-surface flex justify-between items-center px-margin-mobile py-2 z-50 shrink-0"
        initial={reducedMotion ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      >
        <Pressable
          onClick={() => navigate("/profile")}
          className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high flex items-center justify-center shrink-0"
          ariaLabel="Open profile"
        >
          {profile?.avatar_ref ? (
            <img src={profile.avatar_ref} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-label-bold text-primary">
              {profile?.display_name?.[0]?.toUpperCase() ?? "?"}
            </span>
          )}
        </Pressable>

        <BrandHeader layout="lockup" size="sm" className="mx-0" />

        <div className="flex items-center gap-2 shrink-0">
          <Pressable
            onClick={() => navigate("/starred")}
            className="relative text-on-surface-variant hover:bg-surface-container-high transition-colors w-10 h-10 rounded-full flex items-center justify-center"
            ariaLabel="Starred activities"
          >
            <Icon name="star" filled className="text-secondary" />
            <UnreadBadge
              count={starred.length}
              variant="primary"
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] text-[10px]"
            />
          </Pressable>
          <Pressable
            onClick={() => navigate("/filters")}
            className="text-on-surface-variant hover:bg-surface-container-high transition-colors w-10 h-10 rounded-full flex items-center justify-center"
            ariaLabel="Open filters"
          >
            <Icon name="tune" />
          </Pressable>
          <Pressable
            onClick={() => navigate("/filters")}
            className="text-on-surface-variant hover:bg-surface-container-high transition-colors w-10 h-10 rounded-full flex items-center justify-center"
            ariaLabel="Map view"
          >
            <Icon name="map" />
          </Pressable>
        </div>
      </motion.header>

      <main className="flex-1 relative w-full overflow-hidden flex flex-col min-h-0 pb-20 px-margin-mobile">
        <NotificationSetupBanner dismissible className="w-full max-w-md mx-auto mt-2 mb-1 shrink-0" />

        {error && (
          <motion.div
            className="w-full max-w-md mx-auto bg-error-container text-on-error-container rounded-xl p-4 text-body-md my-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {(error as Error).message}
            <p className="mt-2 text-label-sm">Check docs/SUPABASE_SETUP.md — have you run db push and set .env?</p>
          </motion.div>
        )}

        {isLoading && (
          <motion.div
            className="flex-1 flex flex-col items-center justify-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-on-surface-variant text-body-md">Loading activities...</p>
          </motion.div>
        )}

        {!isLoading && !current && !error && (
          <motion.div
            className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-4 max-w-md mx-auto"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springSoft}
          >
            <Icon name="search_off" className="text-4xl text-on-surface-variant mx-auto" />
            <p className="text-body-md text-on-surface-variant">No more activities match your filters.</p>
            <PrimaryButton onClick={() => navigate("/feed/exhausted")}>See options</PrimaryButton>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {current && (
            <motion.div
              key={current.id}
              className="flex-1 flex flex-col min-h-0 w-full max-w-md mx-auto relative pt-2"
              initial={reducedMotion ? false : { opacity: 0, scale: 0.9, y: 28 }}
              animate={cardAnimate}
              transition={swipeAnim === "idle" ? springSoft : { duration: 0.34, ease: [0.32, 0.72, 0, 1] }}
              onAnimationComplete={() => {
                if (swipeAnim !== "idle") {
                  void completeSwipe(swipeAnim);
                }
              }}
            >
              {hasStack && (
                <motion.div
                  className="absolute inset-x-0 top-4 bottom-[5.5rem] z-0 pointer-events-none flex justify-center"
                  initial={{ opacity: 0, scale: 0.9, y: 40 }}
                  animate={{ opacity: 0.5, scale: 0.96, y: 8 }}
                  transition={{ delay: 0.1, ...springSoft }}
                  aria-hidden
                >
                  <div className="w-full h-full max-w-md bg-surface-container-low rounded-[24px] shadow-sm border border-outline-variant/20" />
                </motion.div>
              )}

              <div className="flex-1 min-h-0 relative z-10">
                <DiscoverFeedCard activity={current} onOpen={() => navigate(`/activities/${current.id}`)} />
              </div>

              <motion.div
                className="shrink-0 w-full flex justify-center gap-6 py-4 z-20"
                initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, ...springSoft }}
              >
                <Pressable
                  onClick={() => handleSwipe("left")}
                  className="w-14 h-14 rounded-full bg-surface-container-highest border border-outline-variant text-on-surface-variant shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex items-center justify-center hover:bg-surface-container-high transition-colors"
                  ariaLabel="Pass"
                >
                  <Icon name="close" className="text-[24px]" />
                </Pressable>
                <Pressable
                  onClick={() => handleSwipe("right")}
                  className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[0_6px_16px_rgba(0,76,34,0.2)] transition-colors scale-110 ${
                    current.is_full
                      ? "bg-secondary text-on-secondary"
                      : "bg-primary text-on-primary hover:bg-primary-fixed-dim"
                  }`}
                  ariaLabel={current.is_full ? "Join waitlist" : "Join or request"}
                >
                  <Icon
                    name={current.is_full ? "hourglass_top" : "check"}
                    filled={!current.is_full}
                    className="text-[28px]"
                  />
                </Pressable>
                <Pressable
                  onClick={() => handleSwipe("up")}
                  className="w-14 h-14 rounded-full bg-surface-container-lowest border border-outline-variant text-secondary shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex items-center justify-center hover:bg-surface-container-low transition-colors"
                  ariaLabel="Star for later"
                >
                  <Icon name="star" filled className="text-[24px]" />
                </Pressable>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {current && (
        <JoinRequestSheet
          open={joinSheetOpen}
          activityTitle={current.title}
          hostName={current.host.display_name}
          isWaitlist={current.is_full}
          loading={joining}
          onClose={() => setJoinSheetOpen(false)}
          onSubmit={beginJoinSwipe}
        />
      )}
    </div>
  );
}
