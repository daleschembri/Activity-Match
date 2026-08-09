import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon, PrimaryButton } from "@activity-match/ui";
import { GathereLogo } from "@/components/GathereLogo";
import { authErrorMessage, formatPhoneDisplay, sendPhoneOtp, verifyPhoneOtp } from "@/lib/authFlow";
import { supabase } from "@/lib/supabase";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 45;

export function VerificationCodePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as { phone?: string; from?: string };
  const phone = state.phone ?? "";
  const from = state.from ?? "/";

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!phone) {
      navigate("/auth/phone", { replace: true });
    }
  }, [phone, navigate]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => value - 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  const code = digits.join("");

  const verify = async (token: string) => {
    setMessage("");
    setLoading(true);
    try {
      const { user } = await verifyPhoneOtp(phone, token);
      if (!user) throw new Error("Verification failed");

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      navigate(profile?.onboarding_completed ? from : "/onboarding/interests", { replace: true });
    } catch (err) {
      setMessage(
        err && typeof err === "object" && "message" in err
          ? authErrorMessage(err as import("@supabase/supabase-js").AuthError)
          : "Could not verify code.",
      );
      setDigits(Array(CODE_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (code.length === CODE_LENGTH && !loading) {
      void verify(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const setDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const onKeyDown = (index: number, key: string) => {
    if (key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const resend = async () => {
    setMessage("");
    setSecondsLeft(RESEND_SECONDS);
    try {
      await sendPhoneOtp(phone);
    } catch (err) {
      setMessage(
        err && typeof err === "object" && "message" in err
          ? authErrorMessage(err as import("@supabase/supabase-js").AuthError)
          : "Could not resend code.",
      );
    }
  };

  if (!phone) return null;

  return (
    <div className="min-h-dvh bg-background text-on-background flex flex-col">
      <header className="fixed top-0 w-full flex px-margin-mobile safe-area-pt py-2 bg-surface z-10">
        <button
          type="button"
          onClick={() => navigate("/auth/phone", { state: { from } })}
          aria-label="Go back"
          className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-container-high"
        >
          <Icon name="arrow_back" />
        </button>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto flex flex-col items-center text-center px-margin-mobile pt-24">
        <GathereLogo variant="symbolSimplified" size="lg" className="mb-6" />

        <h1 className="text-headline-lg-mobile font-extrabold mb-2">Enter the code</h1>
        <p className="text-body-md text-on-surface-variant mb-8">
          We sent a verification code to
          <br />
          <strong className="text-headline-md text-on-background mt-1 inline-block">
            {formatPhoneDisplay(phone)}
          </strong>
        </p>

        <div className="flex gap-2 mb-8" role="group" aria-label="Verification code">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={digit}
              disabled={loading}
              aria-label={`Digit ${index + 1}`}
              className="w-12 h-14 text-center text-2xl font-bold border-b-2 border-outline-variant bg-transparent outline-none focus:border-primary focus:bg-primary/5 transition-colors"
              onChange={(e) => setDigit(index, e.target.value)}
              onKeyDown={(e) => onKeyDown(index, e.key)}
              onFocus={(e) => e.target.select()}
            />
          ))}
        </div>

        {message && (
          <p className="text-error text-body-md mb-4" role="alert">
            {message}
          </p>
        )}

        {secondsLeft > 0 ? (
          <p className="text-label-sm text-on-surface-variant">
            Resend in{" "}
            <span className="font-label-bold">
              0:{secondsLeft.toString().padStart(2, "0")}
            </span>
          </p>
        ) : (
          <button
            type="button"
            onClick={resend}
            className="font-label-bold text-primary hover:underline"
          >
            Resend code
          </button>
        )}

        <div className="mt-10 w-full">
          <PrimaryButton fullWidth disabled={loading || code.length !== CODE_LENGTH} onClick={() => verify(code)}>
            {loading ? "Verifying…" : "Continue"}
          </PrimaryButton>
        </div>
      </main>
    </div>
  );
}
