interface UnreadBadgeProps {
  count: number;
  className?: string;
  variant?: "error" | "primary";
}

function formatCount(count: number): string {
  if (count > 99) return "99+";
  return String(count);
}

export function UnreadBadge({ count, className = "", variant = "error" }: UnreadBadgeProps) {
  if (count <= 0) return null;

  const colors =
    variant === "primary"
      ? "bg-primary text-on-primary min-w-[24px] h-6 text-label-sm"
      : "min-w-[22px] h-[22px] text-[11px] bg-error text-on-error";

  return (
    <span
      className={`px-1.5 rounded-full font-bold leading-none flex items-center justify-center shrink-0 ${colors} ${className}`}
      aria-label={`${count} unread`}
    >
      {formatCount(count)}
    </span>
  );
}
