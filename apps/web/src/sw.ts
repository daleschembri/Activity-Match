/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

declare let self: ServiceWorkerGlobalScope;

interface PushMessageData {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

async function shouldSuppressPush(url?: string): Promise<boolean> {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  if (!clients.length) return false;

  const anyFocused = clients.some((client) => client.focused);
  if (!anyFocused) return false;

  if (!url) return true;

  try {
    const targetPath = new URL(url, self.location.origin).pathname;
    return clients.some((client) => {
      const clientPath = new URL(client.url).pathname;
      return client.focused && clientPath === targetPath;
    });
  } catch {
    return anyFocused;
  }
}

self.addEventListener("push", (event) => {
  const data = (event.data?.json() ?? {}) as PushMessageData;
  const title = data.title ?? "Gathere";
  const body = data.body ?? "";
  const url = data.url ?? "/";
  const tag = data.tag;

  event.waitUntil(
    (async () => {
      if (await shouldSuppressPush(url)) return;

      await self.registration.showNotification(title, {
        body,
        icon: "/favicon.svg",
        badge: "/favicon.svg",
        tag,
        data: { url },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  const url = (event.notification.data?.url as string | undefined) ?? "/";
  event.notification.close();

  event.waitUntil(
    (async () => {
      const target = new URL(url, self.location.origin).href;
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

      for (const client of clients) {
        if (client.url === target && "focus" in client) {
          await client.focus();
          return;
        }
      }

      for (const client of clients) {
        if ("navigate" in client && "focus" in client) {
          await client.focus();
          await (client as WindowClient).navigate(target);
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(target);
      }
    })(),
  );
});
