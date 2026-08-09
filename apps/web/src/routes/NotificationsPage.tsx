import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppNotification } from "@activity-match/shared";
import { Icon, PrimaryButton, ScreenShell } from "@activity-match/ui";
import { NotificationSetupBanner } from "@/components/NotificationSetupBanner";
import { Stagger, StaggerItem } from "@/components/motion/primitives";
import { api } from "@/lib/api";
import { formatNotificationWhen, getNotificationIcon, resolveNotificationHref } from "@/lib/notifications";

function NotificationRow({
  notification,
  onOpen,
}: {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
}) {
  const unread = !notification.read_at;
  const introduction =
    typeof notification.payload.introduction === "string" ? notification.payload.introduction : null;

  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      className={`w-full text-left rounded-xl border p-4 transition-colors ${
        unread
          ? "bg-primary/5 border-primary/20"
          : "bg-surface-container-lowest border-outline-variant/20"
      }`}
    >
      <div className="flex gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            unread ? "bg-primary/15 text-primary" : "bg-surface-container-high text-on-surface-variant"
          }`}
        >
          <Icon name={getNotificationIcon(notification.type)} className="text-[20px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-label-bold text-label-bold text-on-surface">{notification.title}</p>
            <span className="text-label-sm text-on-surface-variant shrink-0">
              {formatNotificationWhen(notification.created_at)}
            </span>
          </div>
          <p className="text-body-md text-on-surface-variant mt-1">{notification.body}</p>
          {notification.activity?.title && (
            <p className="text-label-sm text-primary mt-2">{notification.activity.title}</p>
          )}
          {introduction && notification.type === "join_request_received" && (
            <p className="text-body-md text-on-surface mt-3 bg-surface-container rounded-lg p-3 whitespace-pre-wrap">
              “{introduction}”
            </p>
          )}
        </div>
        {unread && (
          <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" aria-label="Unread" />
        )}
      </div>
    </button>
  );
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.getNotifications(),
    refetchOnMount: "always",
  });

  const markAllRead = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications-unread"] }),
      ]);
    },
  });

  const openNotification = async (notification: AppNotification) => {
    if (!notification.read_at) {
      await api.markNotificationRead(notification.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications-unread"] }),
      ]);
    }
    navigate(await resolveNotificationHref(notification));
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <ScreenShell
      title="Notifications"
      reserveBottomNav
      headerRight={
        unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="text-label-bold text-label-sm text-primary px-2 py-1 rounded-lg hover:bg-surface-container-high transition-colors"
          >
            Mark all read
          </button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <NotificationSetupBanner />

        {isLoading && <p className="text-on-surface-variant">Loading notifications...</p>}

        {!isLoading && notifications.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mx-auto text-on-surface-variant">
              <Icon name="notifications" className="text-[32px]" />
            </div>
            <div className="space-y-2">
              <p className="text-headline-md font-bold">You&apos;re all caught up</p>
              <p className="text-body-md text-on-surface-variant">
                Join requests, acceptances, and updates will show up here.
              </p>
            </div>
            <PrimaryButton onClick={() => navigate("/")}>Discover activities</PrimaryButton>
          </div>
        )}

        {!isLoading && notifications.length > 0 && (
          <Stagger className="space-y-3">
            {notifications.map((notification) => (
              <StaggerItem key={notification.id}>
                <NotificationRow notification={notification} onOpen={openNotification} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </ScreenShell>
  );
}
