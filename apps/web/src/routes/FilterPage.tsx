import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FilterChip, PrimaryButton, ScreenShell } from "@activity-match/ui";
import { DEFAULT_FEED_FILTERS, loadFeedFilters, saveFeedFilters, resetFeedFilters } from "@/lib/feedFilters";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const times = ["Morning", "Afternoon", "Evening", "Night"];
const types = ["Confirmed", "Proposed", "Ideas"];

export function FilterPage() {
  const navigate = useNavigate();
  const initial = loadFeedFilters();
  const [selectedDays, setSelectedDays] = useState<string[]>(initial.days_of_week);
  const [selectedTimes, setSelectedTimes] = useState<string[]>(initial.time_of_day);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(initial.listing_types);
  const [includeFull, setIncludeFull] = useState(initial.include_full);

  const toggle = (list: string[], value: string, setter: (v: string[]) => void) => {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const apply = () => {
    saveFeedFilters({
      ...DEFAULT_FEED_FILTERS,
      include_full: includeFull,
      days_of_week: selectedDays,
      time_of_day: selectedTimes,
      listing_types: selectedTypes,
    });
    navigate("/");
  };

  const reset = () => {
    resetFeedFilters();
    setSelectedDays([]);
    setSelectedTimes([]);
    setSelectedTypes([]);
    setIncludeFull(false);
    navigate("/");
  };

  return (
    <ScreenShell title="Filter Activities">
      <div className="space-y-6">
        <section>
          <h2 className="text-label-bold mb-2">Availability</h2>
          <p className="text-body-md text-on-surface-variant mb-3">
            Include full activities so you can join the waitlist when a spot opens.
          </p>
          <FilterChip
            label="Show full activities"
            selected={includeFull}
            onClick={() => setIncludeFull((value) => !value)}
          />
        </section>
        <section>
          <h2 className="text-label-bold mb-3">Days</h2>
          <div className="flex flex-wrap gap-2">
            {days.map((d) => (
              <FilterChip key={d} label={d} selected={selectedDays.includes(d)} onClick={() => toggle(selectedDays, d, setSelectedDays)} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-label-bold mb-3">Time of day</h2>
          <div className="flex flex-wrap gap-2">
            {times.map((t) => (
              <FilterChip key={t} label={t} selected={selectedTimes.includes(t)} onClick={() => toggle(selectedTimes, t, setSelectedTimes)} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-label-bold mb-3">Listing type</h2>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <FilterChip key={t} label={t} selected={selectedTypes.includes(t)} onClick={() => toggle(selectedTypes, t, setSelectedTypes)} />
            ))}
          </div>
        </section>
        <PrimaryButton fullWidth onClick={apply}>Apply filters</PrimaryButton>
        <PrimaryButton fullWidth variant="outline" onClick={reset}>Reset</PrimaryButton>
      </div>
    </ScreenShell>
  );
}
