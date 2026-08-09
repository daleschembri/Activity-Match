const CORRECTION_WINDOW_HOURS = 48;

export function activityEndAt(startsAt: string | null, durationMinutes: number | null): Date | null {
  if (!startsAt) return null;
  const end = new Date(startsAt);
  end.setMinutes(end.getMinutes() + (durationMinutes ?? 60));
  return end;
}

export function attendanceCorrectionDeadline(
  startsAt: string | null,
  durationMinutes: number | null,
): Date | null {
  const end = activityEndAt(startsAt, durationMinutes);
  if (!end) return null;
  return new Date(end.getTime() + CORRECTION_WINDOW_HOURS * 60 * 60 * 1000);
}

export function formatAttendanceDeadline(deadline: Date): string {
  const msLeft = deadline.getTime() - Date.now();
  if (msLeft <= 0) return "Correction window has closed";
  const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
  if (daysLeft === 1) return "You have 1 day left to update this";
  return `You have ${daysLeft} days left to update this`;
}

export function formatActivityDate(startsAt: string | null): string {
  if (!startsAt) return "Date TBC";
  return new Date(startsAt).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function suggestNextDate(startsAt: string | null): string | null {
  if (!startsAt) return null;
  const next = new Date(startsAt);
  next.setDate(next.getDate() + 7);
  return next.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function isActivityEnded(startsAt: string | null, durationMinutes: number | null): boolean {
  const end = activityEndAt(startsAt, durationMinutes);
  return end ? end.getTime() <= Date.now() : false;
}
