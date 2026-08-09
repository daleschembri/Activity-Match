import { useEffect, useState } from "react";
import { Icon, PrimaryButton } from "@activity-match/ui";
import { useAuth } from "@/lib/AuthProvider";
import {
  browserNotificationsSupported,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
} from "@/lib/browserNotifications";
import {
  hasActivePushSubscription,
  subscribeToWebPush,
  vapidPublicKeyConfigured,
  webPushSupported,
} from "@/lib/pushNotifications";

const DISMISS_KEY = "gathere-notifications-setup-dismissed";

function isIosDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function getUnsupportedMessage(): string {
  if (isIosDevice()) {
    return "On iPhone, tap Share → Add to Home Screen, then open Gathere from your home screen to enable alerts.";
  }
  if (!browserNotificationsSupported()) {
    return "Your browser does not support notifications. Try Chrome, Edge, or Firefox.";
  }
  if (vapidPublicKeyConfigured() && !webPushSupported()) {
    return "Background notifications need a secure connection (HTTPS) and a supported browser.";
  }
  return "Notifications are not available in this browser.";
}

type SetupKind = "unsupported" | "denied" | "prompt" | "subscribe" | "ready";

function getSetupKind(permission: NotificationPermission | "unsupported", pushSubscribed: boolean | null): SetupKind {
  if (!browserNotificationsSupported()) return "unsupported";
  if (permission === "unsupported") return "unsupported";
  if (permission === "denied") return "denied";
  if (permission === "default") return "prompt";
  if (vapidPublicKeyConfigured() && pushSubscribed === false) return "subscribe";
  return "ready";
}

interface NotificationSetupBannerProps {
  className?: string;
  dismissible?: boolean;
}

export function NotificationSetupBanner({ className = "", dismissible = false }: NotificationSetupBannerProps) {
  const { session } = useAuth();
  const [permission, setPermission] = useState(() => getBrowserNotificationPermission());
  const [pushSubscribed, setPushSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");

  useEffect(() => {
    if (permission !== "granted") {
      setPushSubscribed(null);
      return;
    }
    void hasActivePushSubscription().then(setPushSubscribed);
  }, [permission]);

  const kind = getSetupKind(permission, pushSubscribed);
  if (kind === "ready" || (dismissible && dismissed)) return null;

  const enable = async () => {
    setBusy(true);
    try {
      const next = await requestBrowserNotificationPermission();
      setPermission(next);
      if (next === "granted" && session?.user.id) {
        if (vapidPublicKeyConfigured()) {
          await subscribeToWebPush(session.user.id);
          setPushSubscribed(await hasActivePushSubscription());
        } else {
          setPushSubscribed(true);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const finishPushSetup = async () => {
    if (!session?.user.id) return;
    setBusy(true);
    try {
      await subscribeToWebPush(session.user.id);
      setPushSubscribed(await hasActivePushSubscription());
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const title =
    kind === "unsupported"
      ? "Notifications unavailable here"
      : kind === "denied"
        ? "Notifications are blocked"
        : kind === "subscribe"
          ? "Finish notification setup"
          : "Turn on notifications";

  const description =
    kind === "unsupported"
      ? getUnsupportedMessage()
      : kind === "denied"
        ? "Allow notifications for Gathere in your browser or device settings, then refresh this page."
        : kind === "subscribe"
          ? "Permission is on, but background alerts are not connected yet."
          : vapidPublicKeyConfigured()
            ? "Get join requests, chat messages, and updates even when Gathere is closed."
            : "Get join requests, chat messages, and updates while Gathere is open.";

  const showEnable = kind === "prompt";
  const showFinish = kind === "subscribe";

  return (
    <div
      className={`rounded-xl border border-primary/25 bg-primary/5 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Icon name="notifications_active" className="text-[20px]" />
        </div>
        <div className="min-w-0">
          <p className="font-label-bold text-label-bold text-on-surface">{title}</p>
          <p className="text-body-md text-on-surface-variant mt-1">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 sm:ml-4">
        {showEnable && (
          <PrimaryButton onClick={() => void enable()} disabled={busy}>
            {busy ? "Enabling…" : "Enable"}
          </PrimaryButton>
        )}
        {showFinish && (
          <PrimaryButton onClick={() => void finishPushSetup()} disabled={busy}>
            {busy ? "Connecting…" : "Connect"}
          </PrimaryButton>
        )}
        {dismissible && (
          <button
            type="button"
            onClick={dismiss}
            className="px-3 py-2 text-label-bold text-label-sm text-on-surface-variant rounded-lg hover:bg-surface-container-high transition-colors"
          >
            Not now
          </button>
        )}
      </div>
    </div>
  );
}
