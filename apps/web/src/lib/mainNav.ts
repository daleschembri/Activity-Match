export const mainNavItems = [
  { to: "/", label: "Discover", icon: "explore" },
  { to: "/plans", label: "Plans", icon: "event" },
  { to: "/chats", label: "Chats", icon: "chat" },
  { to: "/create/describe", label: "Create", icon: "add_circle" },
  { to: "/profile", label: "Profile", icon: "person" },
] as const;

export function mainNavCurrentPath(pathname: string): string {
  if (pathname.startsWith("/create")) return "/create/describe";
  if (pathname.startsWith("/profile")) return "/profile";
  if (pathname.startsWith("/plans")) return "/plans";
  if (pathname.startsWith("/chats") || pathname.includes("/chat")) return "/chats";
  return "/";
}
