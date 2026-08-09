import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Icon, PrimaryButton, SegmentedControl } from "@activity-match/ui";
import { UserAvatar } from "@/components/UserAvatar";
import { api } from "@/lib/api";
import {
  attendanceCorrectionDeadline,
  formatActivityDate,
  formatAttendanceDeadline,
} from "@/lib/attendance";

type AttendanceChoice = "attended" | "no_show";

export function MarkAttendancePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [marks, setMarks] = useState<Record<string, AttendanceChoice>>({});

  const { data: activity } = useQuery({
    queryKey: ["activity", id],
    queryFn: () => api.getActivity(id),
    enabled: Boolean(id),
  });

  const { data: participants = [], isLoading } = useQuery({
    queryKey: ["attendance-participants", id],
    queryFn: () => api.getAttendanceParticipants(id),
    enabled: Boolean(id),
  });

  const { data: attendanceResolved, isLoading: checkingResolved } = useQuery({
    queryKey: ["attendance-resolved", id],
    queryFn: () => api.isAttendanceResolved(id),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (attendanceResolved) {
      navigate(`/activities/${id}/past`, { replace: true });
    }
  }, [attendanceResolved, id, navigate]);

  const deadline = useMemo(
    () => attendanceCorrectionDeadline(activity?.starts_at ?? null, activity?.duration_minutes ?? null),
    [activity],
  );

  const effectiveMarks = useMemo(() => {
    const result: Record<string, AttendanceChoice> = {};
    for (const p of participants) {
      result[p.user_id] = marks[p.user_id] ?? (p.status === "no_show" ? "no_show" : "attended");
    }
    return result;
  }, [participants, marks]);

  const setChoice = (userId: string, choice: AttendanceChoice) => {
    setMarks((prev) => ({ ...prev, [userId]: choice }));
  };

  const save = async (everyoneAttended = false) => {
    setSaving(true);
    try {
      const payload = participants.map((p) => ({
        user_id: p.user_id,
        attended: everyoneAttended ? true : effectiveMarks[p.user_id] === "attended",
      }));
      const result = await api.markAttendance(id, payload);
      navigate(`/activities/${id}/attendance/saved`, {
        state: {
          attendedCount: result.attended_count,
          totalCount: result.total_count,
          title: activity?.title,
          startsAt: activity?.starts_at,
        },
      });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not save attendance");
    } finally {
      setSaving(false);
    }
  };

  if (checkingResolved || attendanceResolved) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-on-background flex flex-col">
      <header className="sticky top-0 z-10 bg-surface flex items-center justify-between px-margin-mobile py-2 border-b border-surface-container-high">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-container-high text-primary"
        >
          <Icon name="arrow_back" />
        </button>
        <h1 className="text-headline-md font-bold text-primary">Mark Attendance</h1>
        <div className="w-11" />
      </header>

      <main className="flex-1 pb-40">
        <section className="px-margin-mobile py-6 flex flex-col gap-2">
          <h2 className="text-headline-lg-mobile font-extrabold">{activity?.title ?? "Activity"}</h2>
          <div className="flex items-center gap-1 text-on-surface-variant font-label-bold">
            <Icon name="calendar_month" className="text-lg" />
            <span>{formatActivityDate(activity?.starts_at ?? null)}</span>
          </div>
          {deadline && (
            <p className="text-body-md text-secondary mt-1">{formatAttendanceDeadline(deadline)}</p>
          )}
        </section>

        {isLoading && (
          <p className="px-margin-mobile text-on-surface-variant">Loading participants...</p>
        )}

        <section>
          {participants.map((participant) => {
            const choice = effectiveMarks[participant.user_id];
            const changed = marks[participant.user_id] !== undefined;
            return (
              <div
                key={participant.user_id}
                className="relative px-margin-mobile py-4 border-b border-surface-variant"
              >
                {changed && (
                  <div className="absolute inset-0 bg-primary-fixed-dim/15 pointer-events-none" />
                )}
                <div className="relative z-10 flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    <UserAvatar name={participant.display_name} avatarRef={participant.avatar_ref} />
                    <span className="text-body-lg font-medium">{participant.display_name}</span>
                  </div>
                  <SegmentedControl
                    options={[
                      { value: "attended", label: "Came along" },
                      { value: "no_show", label: "Didn't come" },
                    ]}
                    value={choice}
                    onChange={(value) => setChoice(participant.user_id, value)}
                  />
                </div>
              </div>
            );
          })}
        </section>

        <div className="px-margin-mobile py-6 flex justify-center">
          <button
            type="button"
            className="text-label-bold text-primary underline underline-offset-4"
            onClick={() => window.alert("If someone is missing, they may not have been confirmed before the activity ended.")}
          >
            Someone missing from this list?
          </button>
        </div>
      </main>

      <div className="fixed bottom-0 inset-x-0 bg-surface px-margin-mobile py-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-8px_20px_rgba(0,0,0,0.04)] flex flex-col gap-2 z-50">
        <PrimaryButton fullWidth onClick={() => save(false)} disabled={saving || !participants.length}>
          {saving ? "Saving..." : "Save attendance"}
        </PrimaryButton>
        <PrimaryButton variant="outline" fullWidth onClick={() => save(true)} disabled={saving || !participants.length}>
          All good, everyone came
        </PrimaryButton>
      </div>
    </div>
  );
}
