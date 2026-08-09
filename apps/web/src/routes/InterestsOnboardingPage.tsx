import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FilterChip, PrimaryButton, ScreenShell } from "@activity-match/ui";
import { BrandHeader } from "@/components/GathereLogo";
import { api } from "@/lib/api";

export function InterestsOnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromProfile = (location.state as { from?: string } | null)?.from === "profile";
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
  });

  const { data: savedInterests = [] } = useQuery({
    queryKey: ["user-interests"],
    queryFn: () => api.getUserInterests(),
  });

  useEffect(() => {
    if (savedInterests.length) {
      setSelected(savedInterests);
    }
  }, [savedInterests]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const continueFlow = async () => {
    setError("");
    setSaving(true);
    try {
      await api.saveUserInterests(selected);
      if (fromProfile) {
        navigate("/profile");
        return;
      }
      navigate("/onboarding/availability");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save interests");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenShell headerLeading={<BrandHeader layout="lockup" size="sm" />}>
      <div className="space-y-6">
        <h2 className="text-headline-md font-bold">Your interests</h2>
        <p className="text-body-lg">What kinds of activities are you into? Pick at least one to personalize your feed.</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((c: { id: string; name: string }) => (
            <FilterChip key={c.id} label={c.name} selected={selected.includes(c.id)} onClick={() => toggle(c.id)} />
          ))}
        </div>
        {error && (
          <p className="text-error text-body-md" role="alert">
            {error}
          </p>
        )}
        <PrimaryButton fullWidth disabled={selected.length === 0 || saving} onClick={continueFlow}>
          {saving ? "Saving..." : fromProfile ? "Save interests" : "Continue"}
        </PrimaryButton>
      </div>
    </ScreenShell>
  );
}
