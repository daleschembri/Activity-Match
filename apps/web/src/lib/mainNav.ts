export const mainNavItems = [
  { to: "/", label: "Discover", icon: "explore" },
  { to: "/plans", label: "Plans", icon: "event" },
  { to: "/chats", label: "Chats", icon: "chat" },
  { to: "/notifications", label: "Alerts", icon: "notifications" },
  { to: "/create/describe", label: "Create", icon: "add_circle" },
  { to: "/profile", label: "Profile", icon: "person" },
] as const;

export function mainNavCurrentPath(pathname: string): string {
  if (pathname.startsWith("/create")) return "/create/describe";
  if (pathname.startsWith("/profile")) return "/profile";
  if (pathname.startsWith("/plans")) return "/plans";
  if (pathname.startsWith("/chats") || pathname.includes("/chat")) return "/chats";
  if (pathname.startsWith("/notifications")) return "/notifications";
  return "/";
}

export function isMainNavRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/activities/")) return false;
  if (pathname.startsWith("/plans")) return true;
  if (pathname.startsWith("/chats")) return true;
  if (pathname.startsWith("/notifications")) return true;
  if (pathname.startsWith("/create")) return true;
  if (pathname.startsWith("/profile")) return true;
  return false;
}
