import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FilterChip, PrimaryButton, ScreenShell } from "@activity-match/ui";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const times = ["Morning", "Afternoon", "Evening", "Night"];
const types = ["Confirmed", "Proposed", "Ideas"];

export function FilterPage() {
  const navigate = useNavigate();
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const toggle = (list: string[], value: string, setter: (v: string[]) => void) => {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  return (
    <ScreenShell title="Filter Activities">
      <div className="space-y-6">
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
        <PrimaryButton fullWidth onClick={() => navigate("/")}>Apply filters</PrimaryButton>
        <PrimaryButton fullWidth variant="outline" onClick={() => navigate("/")}>Reset</PrimaryButton>
      </div>
    </ScreenShell>
  );
}
