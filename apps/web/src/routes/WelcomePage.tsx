import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Icon, PrimaryButton } from "@activity-match/ui";
import { PageIndicator } from "@/components/onboarding/PageIndicator";
import { BrandHeader } from "@/components/GathereLogo";
import {
  ActivityCardIllustration,
  CreateActivityIllustration,
  PlanTogetherIllustration,
} from "@/components/onboarding/WelcomeIllustrations";
import { markWelcomeComplete } from "@/lib/welcomeStorage";

const SLIDES = [
  {
    title: "Swipe through activities, not profiles.",
    body: "Discover real plans happening nearby that need people.",
    visual: <ActivityCardIllustration />,
  },
  {
    title: "Join something, or start your own.",
    body: "Describe an activity in your own words and the app finds people for it.",
    visual: <CreateActivityIllustration />,
  },
  {
    title: 'Turn "I should do that" into an actual plan.',
    body: "Coordinate through group chat, manage attendance, and form recurring groups.",
    visual: <PlanTogetherIllustration />,
  },
] as const;

export function WelcomePage() {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const isLast = slide === SLIDES.length - 1;

  const finish = () => {
    markWelcomeComplete();
    navigate("/auth", { replace: true });
  };

  const next = () => {
    if (isLast) {
      finish();
      return;
    }
    setSlide((value) => value + 1);
  };

  return (
    <div className="min-h-dvh bg-surface text-on-surface flex flex-col p-margin-mobile max-w-md mx-auto w-full">
      <header className="flex justify-between items-center py-2 min-h-[44px]">
        {slide > 0 ? (
          <button
            type="button"
            onClick={() => setSlide((value) => value - 1)}
            aria-label="Go back"
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant"
          >
            <Icon name="arrow_back" />
          </button>
        ) : (
          <BrandHeader layout="symbol" size="sm" className="mx-0" />
        )}
        {!isLast && (
          <button
            type="button"
            onClick={finish}
            className="font-label-bold text-label-bold text-on-surface-variant hover:text-on-surface px-4 py-2 rounded-full"
          >
            Skip
          </button>
        )}
        {isLast && <div className="w-11" />}
      </header>

      <main className="flex-1 flex flex-col justify-center items-center gap-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="w-full flex flex-col items-center gap-8"
          >
            {SLIDES[slide].visual}
            <div className="text-center flex flex-col gap-3 px-2">
              <h1 className="text-headline-xl font-extrabold text-on-surface">
                {SLIDES[slide].title}
              </h1>
              <p className="text-body-lg text-on-surface-variant">{SLIDES[slide].body}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="pb-[max(16px,env(safe-area-inset-bottom))] flex flex-col gap-6">
        <PageIndicator total={SLIDES.length} current={slide} />
        <PrimaryButton fullWidth onClick={next}>
          {isLast ? (
            "Get started"
          ) : (
            <span className="inline-flex items-center gap-2">
              Next
              <Icon name="arrow_forward" className="text-[18px]" />
            </span>
          )}
        </PrimaryButton>
      </footer>
    </div>
  );
}
