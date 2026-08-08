import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PrimaryButton, ScreenShell, TextField } from "@activity-match/ui";
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
      <ScreenShell title="Setup required">
        <div className="space-y-4 py-8">
          <p className="text-body-md text-on-surface-variant">
            Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and{" "}
            <code>VITE_SUPABASE_ANON_KEY</code> to <code>apps/web/.env</code>.
          </p>
          <p className="text-body-md">See <strong>docs/SUPABASE_SETUP.md</strong>.</p>
        </div>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Welcome">
      <div className="space-y-5 py-8">
        <h2 className="text-headline-lg font-extrabold">Activity Match</h2>
        <p className="text-body-md text-on-surface-variant">Find people to do things with — not dates.</p>
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
    </ScreenShell>
  );
}
