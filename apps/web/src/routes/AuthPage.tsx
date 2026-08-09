import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Icon, PrimaryButton, TextField } from "@activity-match/ui";
import { GathereLogo } from "@/components/GathereLogo";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { AuthError } from "@supabase/supabase-js";

function authErrorMessage(error: AuthError, mode: "signin" | "signup"): string {
  const msg = error.message.toLowerCase();

  if (msg.includes("database error") || error.status === 500) {
    return "Server setup incomplete: run supabase db push, then supabase/scripts/bootstrap_project.sql in the SQL editor. See docs/SUPABASE_SETUP.md.";
  }
  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
    return mode === "signin"
      ? "Wrong email or password — or no account yet. Try Sign up first."
      : error.message;
  }
  if (msg.includes("email not confirmed")) {
    return "Email not confirmed. Check your inbox, or disable “Confirm email” in Supabase → Authentication → Providers → Email.";
  }
  if (msg.includes("user already registered")) {
    return "This email is already registered. Sign in instead.";
  }
  if (msg.includes("password") && msg.includes("6")) {
    return "Password must be at least 6 characters.";
  }
  return error.message;
}

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setMessage("");
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          navigate("/onboarding/interests");
        } else {
          setMessage("Account created. Check your email to confirm, then sign in.");
          setMode("signin");
        }
      } else {
        const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!authData.user) throw new Error("Sign in failed");

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profile) {
          setMessage(
            "Signed in but profile is missing. Run bootstrap_project.sql in Supabase SQL editor, delete this user in Auth → Users, then sign up again.",
          );
          await supabase.auth.signOut();
          return;
        }

        navigate(profile.onboarding_completed ? from : "/onboarding/interests");
      }
    } catch (err) {
      if (err && typeof err === "object" && "message" in err) {
        setMessage(authErrorMessage(err as AuthError, mode));
      } else {
        setMessage(err instanceof Error ? err.message : "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-dvh bg-surface p-margin-mobile flex flex-col items-center justify-center text-center gap-4">
        <GathereLogo variant="symbolSimplified" size="lg" />
        <p className="text-body-md text-on-surface-variant">
          Add Supabase env vars to <code>apps/web/.env</code>. See docs/SUPABASE_SETUP.md.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface text-on-surface flex flex-col px-margin-mobile pt-4 pb-margin-mobile max-w-md mx-auto w-full">
      <header className="py-2">
        <button
          type="button"
          onClick={() => navigate("/auth")}
          className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant"
          aria-label="Back to sign-in options"
        >
          <Icon name="arrow_back" />
        </button>
      </header>

      <main className="flex-1 flex flex-col gap-6 pt-2">
        <div className="flex flex-col items-center text-center gap-3">
          <GathereLogo variant="wordmark" size="md" />
          <p className="text-body-md text-on-surface-variant">Sign in with your email</p>
        </div>

        <div className="space-y-5">
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="At least 6 characters"
          />
          {message && (
            <p className="text-error text-body-md whitespace-pre-wrap" role="alert">
              {message}
            </p>
          )}
          <PrimaryButton fullWidth disabled={loading || !email || !password} onClick={submit}>
            {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
          </PrimaryButton>
          <PrimaryButton fullWidth variant="outline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </PrimaryButton>
        </div>
      </main>
    </div>
  );
}
