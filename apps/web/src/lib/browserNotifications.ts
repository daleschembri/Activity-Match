const PERMISSION_PROMPT_KEY = "gathere-notifications-prompted";
export const BROWSER_NOTIFICATION_NAVIGATE_EVENT = "gathere:navigate";

export function browserNotificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getBrowserNotificationPermission(): NotificationPermission | "unsupported" {
  if (!browserNotificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!browserNotificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  localStorage.setItem(PERMISSION_PROMPT_KEY, "1");
  return Notification.requestPermission();
}

export function hasPromptedForNotifications(): boolean {
  return localStorage.getItem(PERMISSION_PROMPT_KEY) === "1";
}

export interface BrowserNotificationPayload {
  title: string;
  body: string;
  tag?: string;
  href?: string;
  icon?: string;
}

function truncate(text: string, max = 140): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function shouldShowBrowserNotification(href?: string): boolean {
  if (!browserNotificationsSupported() || Notification.permission !== "granted") return false;
  if (document.visibilityState === "hidden") return true;
  if (!href) return true;
  try {
    const targetPath = new URL(href, window.location.origin).pathname;
    return window.location.pathname !== targetPath;
  } catch {
    return true;
  }
}

export function showBrowserNotification(payload: BrowserNotificationPayload): void {
  if (!shouldShowBrowserNotification(payload.href)) return;

  const notification = new Notification(payload.title, {
    body: truncate(payload.body),
    icon: payload.icon ?? "/favicon.svg",
    badge: "/favicon.svg",
    tag: payload.tag,
  });

  notification.onclick = (event) => {
    event.preventDefault();
    window.focus();
    if (payload.href) {
      const url = new URL(payload.href, window.location.origin);
      if (url.origin === window.location.origin) {
        window.dispatchEvent(
          new CustomEvent(BROWSER_NOTIFICATION_NAVIGATE_EVENT, {
            detail: { path: url.pathname + url.search + url.hash },
          }),
        );
      } else {
        window.location.assign(url.href);
      }
    }
    notification.close();
  };
}

export function formatChatMessagePreview(
  type: string,
  body: string,
  senderName?: string | null,
): { title: string; body: string } {
  const sender = senderName?.trim() || "Someone";
  if (type === "poll") {
    return { title: sender, body: "Sent a poll" };
  }
  if (type === "system") {
    return { title: "Activity update", body: truncate(body) };
  }
  return { title: sender, body: truncate(body) };
}
