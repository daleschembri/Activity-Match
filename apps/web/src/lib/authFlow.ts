import type { AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function authErrorMessage(error: AuthError): string {
  const msg = error.message.toLowerCase();

  if (msg.includes("database error") || error.status === 500) {
    return "Server setup incomplete. See docs/SUPABASE_SETUP.md.";
  }
  if (msg.includes("invalid login credentials") || msg.includes("invalid otp")) {
    return "That code didn't work. Check it and try again.";
  }
  if (msg.includes("phone") && msg.includes("invalid")) {
    return "Enter a valid phone number with country code, e.g. +356 79123456.";
  }
  if (msg.includes("signup is disabled")) {
    return "Sign-ups are disabled for this project. Check Supabase auth settings.";
  }
  return error.message;
}

export async function signInWithOAuth(provider: "google") {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  });
  if (error) throw error;
}

export async function sendPhoneOtp(phone: string) {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
}

export async function verifyPhoneOtp(phone: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
  if (error) throw error;
  return data;
}

export function normalizePhoneInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return trimmed.replace(/\s+/g, "");
  return `+${trimmed.replace(/\D/g, "")}`;
}

export function formatPhoneDisplay(phone: string): string {
  return phone.replace(/(\+\d{1,3})(\d+)/, "$1 $2");
}
