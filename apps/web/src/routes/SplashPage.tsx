import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GathereLogo } from "@/components/GathereLogo";
import { hasCompletedWelcome } from "@/lib/welcomeStorage";

const SPLASH_MS = 2400;

export function SplashPage() {
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const handler = (event: MediaQueryListEvent) => setDark(event.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      navigate(hasCompletedWelcome() ? "/auth" : "/welcome", { replace: true });
    }, SPLASH_MS);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      className={`min-h-dvh flex flex-col items-center justify-center px-margin-mobile safe-area-page-top relative overflow-hidden ${
        dark ? "bg-[#141413] text-inverse-on-surface" : "bg-surface text-on-surface"
      }`}
    >
      {dark && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(22,101,52,0.2)_0%,_transparent_70%)] pointer-events-none" />
      )}
      <div className="relative z-10 text-center animate-[fadeInUp_0.8s_ease-out_forwards]">
        <GathereLogo variant={dark ? "fullWhite" : "full"} size="xl" className="mb-4" />
        <p
          className={`text-body-lg max-w-sm mx-auto ${
            dark ? "text-outline-variant" : "text-on-surface-variant"
          }`}
        >
          Find people who are up for the same thing.
        </p>
      </div>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
