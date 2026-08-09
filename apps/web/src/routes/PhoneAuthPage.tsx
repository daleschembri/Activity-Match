import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon, PrimaryButton, TextField } from "@activity-match/ui";
import { GathereLogo } from "@/components/GathereLogo";
import { authErrorMessage, normalizePhoneInput, sendPhoneOtp } from "@/lib/authFlow";

export function PhoneAuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? "/";
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setMessage("");
    const normalized = normalizePhoneInput(phone);
    if (normalized.length < 8) {
      setMessage("Enter your phone number with country code, e.g. +356 79123456.");
      return;
    }

    setLoading(true);
    try {
      await sendPhoneOtp(normalized);
      navigate("/auth/verify", { state: { phone: normalized, from } });
    } catch (err) {
      setMessage(
        err && typeof err === "object" && "message" in err
          ? authErrorMessage(err as import("@supabase/supabase-js").AuthError)
          : "Could not send verification code.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-surface text-on-surface flex flex-col safe-area-page-top">
      <header className="px-margin-mobile py-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant"
        >
          <Icon name="arrow_back" />
        </button>
      </header>

      <main className="flex-1 px-margin-mobile max-w-md mx-auto w-full flex flex-col gap-6 pt-4">
        <div className="flex flex-col items-center text-center gap-3">
          <GathereLogo variant="wordmark" size="md" />
          <div>
            <h1 className="text-headline-lg-mobile font-extrabold mb-2">Your phone number</h1>
            <p className="text-body-md text-on-surface-variant">
              We&apos;ll text you a code to sign in. No passwords, no dating profiles.
            </p>
          </div>
        </div>

        <TextField
          label="Phone number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+356 79123456"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          hint="Include country code"
        />

        {message && (
          <p className="text-error text-body-md" role="alert">
            {message}
          </p>
        )}

        <PrimaryButton fullWidth disabled={loading || !phone.trim()} onClick={submit}>
          {loading ? "Sending code…" : "Send verification code"}
        </PrimaryButton>
      </main>
    </div>
  );
}
