import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Icon, PrimaryButton } from "@activity-match/ui";
import { GathereLogo } from "@/components/GathereLogo";
import { authErrorMessage, signInWithOAuth } from "@/lib/authFlow";
import { isSupabaseConfigured } from "@/lib/supabase";

export function SignInOptionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? "/";
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    setMessage("");
    setLoading("google");
    try {
      await signInWithOAuth("google");
    } catch (err) {
      setMessage(
        err && typeof err === "object" && "message" in err
          ? authErrorMessage(err as import("@supabase/supabase-js").AuthError)
          : "Could not start sign in. Check that Google is enabled in Supabase.",
      );
    } finally {
      setLoading(null);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-dvh bg-surface p-margin-mobile flex items-center justify-center">
        <p className="text-body-md text-on-surface-variant text-center">
          Add Supabase env vars to <code>apps/web/.env</code>. See docs/SUPABASE_SETUP.md.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface text-on-surface flex flex-col px-margin-mobile safe-area-page-top pb-margin-mobile max-w-md mx-auto w-full">
      <main className="flex-1 flex flex-col justify-between">
        <div className="flex flex-col items-center text-center mt-8">
          <GathereLogo variant="full" size="lg" className="mb-6" />
          <p className="text-body-lg text-on-surface-variant max-w-[280px]">
            Sign in to find people who are up for the same thing — not dates.
          </p>
        </div>

        <div className="flex flex-col gap-4 w-full mt-auto mb-6">
          <button
            type="button"
            disabled={Boolean(loading)}
            onClick={signInWithGoogle}
            className="w-full bg-surface border-[1.5px] border-outline-variant text-on-surface flex items-center justify-center gap-2 py-4 rounded-full font-label-bold text-label-bold hover:bg-surface-container-lowest shadow-sm active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            <span className="font-bold text-headline-md leading-none" aria-hidden>
              G
            </span>
            {loading === "google" ? "Opening Google…" : "Continue with Google"}
          </button>

          <PrimaryButton
            fullWidth
            disabled={Boolean(loading)}
            onClick={() => navigate("/auth/email", { state: { from } })}
          >
            <span className="inline-flex items-center gap-2">
              <Icon name="mail" />
              Continue with email
            </span>
          </PrimaryButton>

          {message && (
            <p className="text-error text-body-md text-center" role="alert">
              {message}
            </p>
          )}

          <p className="text-center text-label-sm text-outline px-4">
            By continuing, you agree to our{" "}
            <a href="#" className="underline hover:text-on-surface-variant">
              Terms of Service
            </a>{" "}
            and acknowledge our{" "}
            <a href="#" className="underline hover:text-on-surface-variant">
              Privacy Policy
            </a>
            .
          </p>
        </div>

        <div className="w-full flex flex-col items-center pt-4 border-t border-surface-variant">
          <Link
            to="/a/demo"
            className="font-label-bold text-label-bold text-primary hover:text-surface-tint text-center"
          >
            Got an invite link? Open it to see the activity
          </Link>
        </div>
      </main>
    </div>
  );
}
