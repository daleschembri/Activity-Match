import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FilterChip, PrimaryButton, ScreenShell } from "@activity-match/ui";
import { BrandHeader } from "@/components/GathereLogo";
import { api } from "@/lib/api";

const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const dayLabels: Record<string, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

export function AvailabilityOnboardingPage() {
  const navigate = useNavigate();
  const [selectedDays, setSelectedDays] = useState<string[]>(["tue", "thu", "sat"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const finish = async () => {
    setError("");
    setSaving(true);
    try {
      const interests = await api.getUserInterests();
      if (!interests.length) {
        setError("Pick at least one interest first.");
        navigate("/onboarding/interests");
        return;
      }

      const availability = selectedDays.map((day) => ({
        day_of_week: day,
        time_start: "18:00",
        time_end: "22:00",
      }));
      await api.saveOnboarding(interests, availability);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save availability");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenShell headerLeading={<BrandHeader layout="lockup" size="sm" />}>
      <div className="space-y-6">
        <h2 className="text-headline-md font-bold">Your availability</h2>
        <p className="text-body-lg">When are you usually free for activities? We use this to rank events that fit your schedule.</p>
        <div className="flex flex-wrap gap-2">
          {days.map((d) => (
            <FilterChip
              key={d}
              label={dayLabels[d]}
              selected={selectedDays.includes(d)}
              onClick={() => setSelectedDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])}
            />
          ))}
        </div>
        <p className="text-label-sm text-on-surface-variant">Default evening window: 6pm – 10pm. You can fine-tune later in profile settings.</p>
        {error && (
          <p className="text-error text-body-md" role="alert">
            {error}
          </p>
        )}
        <PrimaryButton fullWidth disabled={saving || selectedDays.length === 0} onClick={finish}>
          {saving ? "Saving..." : "Start discovering"}
        </PrimaryButton>
      </div>
    </ScreenShell>
  );
}
