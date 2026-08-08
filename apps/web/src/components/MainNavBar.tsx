import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@activity-match/ui";
import { api } from "@/lib/api";
import { isMainNavRoute, mainNavCurrentPath, mainNavItems } from "@/lib/mainNav";

export function MainNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => api.getUnreadNotificationCount(),
    refetchInterval: 30_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
    enabled: isMainNavRoute(location.pathname),
  });

  if (!isMainNavRoute(location.pathname)) return null;

  const items = mainNavItems.map((item) => ({
    ...item,
    icon:
      item.to === "/notifications" && unreadCount > 0 ? "notifications_active" : item.icon,
    badge: item.to === "/notifications" ? unreadCount : undefined,
  }));

  return (
    <BottomNav
      items={items}
      currentPath={mainNavCurrentPath(location.pathname)}
      onNavigate={navigate}
    />
  );
}
