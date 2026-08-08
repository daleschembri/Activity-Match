import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BottomNav, Icon, PrimaryButton } from "@activity-match/ui";
import { DiscoverFeedCard } from "@/components/DiscoverFeedCard";
import { Pressable } from "@/components/motion/primitives";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { flushQueue, queueSwipe } from "@/lib/offline-queue";
import { mainNavCurrentPath, mainNavItems } from "@/lib/mainNav";
import { springSoft } from "@/lib/motion";

type SwipeAnim = "idle" | "left" | "right" | "up";

export function DiscoverPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const reducedMotion = useReducedMotion();
  const [swipeAnim, setSwipeAnim] = useState<SwipeAnim>("idle");
  const [isCompletingSwipe, setIsCompletingSwipe] = useState(false);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => api.getProfile() });
  const { data, isLoading, error } = useQuery({
    queryKey: ["feed"],
    queryFn: () => api.getFeed(),
    refetchOnMount: "always",
  });

  useEffect(() => {
    void flushQueue(async (item) => {
      await api.recordSwipe({ ...item.payload, idempotency_key: item.idempotency_key });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["my-chats"] });
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
      });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["my-chats"] });
    } catch {
      queueSwipe({ activity_id: current.id, direction, position_in_feed: 0, dwell_ms: 1200 }, key);
    }
    trackEvent("swipe", { activity_id: current.id, direction, position: 0 });
    setSwipeAnim("idle");
    setIsCompletingSwipe(false);

    const remaining = items.filter((item) => item.id !== current.id);
    if (remaining.length === 0) {
      navigate("/feed/exhausted");
    }
  };

  const handleSwipe = (direction: "left" | "right" | "up") => {
    if (!current || swipeAnim !== "idle" || isCompletingSwipe) return;
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

        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary">Discover</h1>

        <div className="flex items-center gap-4 shrink-0">
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

      <main className="flex-1 relative w-full overflow-hidden flex flex-col items-center justify-center pb-24 px-4 min-h-0">
        {error && (
          <motion.div
            className="w-full max-w-md bg-error-container text-on-error-container rounded-xl p-4 text-body-md mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {(error as Error).message}
            <p className="mt-2 text-label-sm">Check docs/SUPABASE_SETUP.md — have you run db push and set .env?</p>
          </motion.div>
        )}

        {isLoading && (
          <motion.div
            className="flex flex-col items-center gap-3"
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
            className="text-center py-12 space-y-4 max-w-md"
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
              className="w-full max-w-md flex flex-col items-center relative"
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
                  className="absolute w-full max-w-md px-8 top-12 z-0 pointer-events-none"
                  initial={{ opacity: 0, scale: 0.9, y: 40 }}
                  animate={{ opacity: 0.5, scale: 0.95, y: 32 }}
                  transition={{ delay: 0.1, ...springSoft }}
                  aria-hidden
                >
                  <div className="bg-surface-container-low w-full h-[min(574px,68dvh)] rounded-[24px] shadow-sm border border-outline-variant/20" />
                </motion.div>
              )}

              <DiscoverFeedCard activity={current} onOpen={() => navigate(`/activities/${current.id}`)} />

              <motion.div
                className="w-full flex justify-center gap-6 mt-6 z-20"
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
                  className="w-16 h-16 rounded-full bg-primary text-on-primary shadow-[0_6px_16px_rgba(0,76,34,0.2)] flex items-center justify-center hover:bg-primary-fixed-dim transition-colors scale-110"
                  ariaLabel="Join or request"
                >
                  <Icon name="check" filled className="text-[28px]" />
                </Pressable>
                <Pressable
                  onClick={() => handleSwipe("up")}
                  className="w-14 h-14 rounded-full bg-surface-container-lowest border border-outline-variant text-secondary shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex items-center justify-center hover:bg-surface-container-low transition-colors"
                  ariaLabel="Save for later"
                >
                  <Icon name="bookmark_border" className="text-[24px]" />
                </Pressable>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav
        items={[...mainNavItems]}
        currentPath={mainNavCurrentPath(location.pathname)}
        onNavigate={navigate}
      />
    </div>
  );
}
