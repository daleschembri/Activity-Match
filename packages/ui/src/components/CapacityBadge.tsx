interface CapacityBadgeProps {
  remaining: number;
  capacity: number;
}

export function CapacityBadge({ remaining, capacity }: CapacityBadgeProps) {
  const full = remaining <= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-label-bold px-2.5 py-1 rounded-full ${
        full
          ? "bg-error-container text-on-error-container"
          : remaining <= 2
            ? "bg-secondary-fixed text-on-secondary-fixed"
            : "bg-primary-fixed text-on-primary-fixed"
      }`}
      aria-label={full ? "Activity is full" : `${remaining} of ${capacity} spaces remaining`}
    >
      {full ? "Full" : `${remaining}/${capacity} spots`}
    </span>
  );
}
