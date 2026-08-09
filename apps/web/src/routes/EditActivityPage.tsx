import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AcceptanceMode, SkillLevel } from "@activity-match/shared";
import { FilterChip, Icon, PrimaryButton, ScreenShell, TextField, ToggleSwitch } from "@activity-match/ui";
import { MapPinPicker } from "@/components/MapPinPicker";
import { api } from "@/lib/api";
import {
  acceptanceModeOptions,
  buildActivityFormPayload,
  DEFAULT_MAP_CENTER,
  fromDatetimeLocalValue,
  skillLevelOptions,
  toDatetimeLocalValue,
} from "@/lib/activityForm";
import { resolvePinLocation } from "@/lib/geocode";

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4 space-y-3">
      <div>
        <h3 className="text-label-sm uppercase tracking-wider text-on-surface-variant">{title}</h3>
        {hint && <p className="text-label-sm text-on-surface-variant mt-1">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function EditActivityPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initializedRef = useRef(false);

  const { data: activity, isLoading } = useQuery({
    queryKey: ["activity", id],
    queryFn: () => api.getActivity(id),
    enabled: Boolean(id),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [startsAtLocal, setStartsAtLocal] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [pin, setPin] = useState(DEFAULT_MAP_CENTER);
  const [placeName, setPlaceName] = useState("");
  const [areaLabel, setAreaLabel] = useState("");
  const [geocodingArea, setGeocodingArea] = useState(false);
  const skipGeocodeRef = useRef(false);
  const placeNameTouchedRef = useRef(false);
  const [capacity, setCapacity] = useState(8);
  const [isFree, setIsFree] = useState(true);
  const [costAmount, setCostAmount] = useState(0);
  const [costNote, setCostNote] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("any");
  const [acceptanceMode, setAcceptanceMode] = useState<AcceptanceMode>("auto");
  const [hostIsParticipating, setHostIsParticipating] = useState(true);
  const [coverImageRef, setCoverImageRef] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
  });
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: () => api.getLocations(),
  });

  useEffect(() => {
    if (!activity || initializedRef.current) return;
    initializedRef.current = true;
    skipGeocodeRef.current = true;
    setTitle(activity.title);
    setDescription(activity.description);
    setCategoryId(activity.category.id);
    setStartsAtLocal(toDatetimeLocalValue(activity.starts_at) || "");
    setDurationMinutes(activity.duration_minutes ?? 120);
    setCapacity(activity.capacity ?? 8);
    setIsFree(activity.cost_amount === 0);
    setCostAmount(activity.cost_amount);
    setCostNote(activity.cost_note ?? "");
    setSkillLevel(activity.skill_level);
    setAcceptanceMode(activity.acceptance_mode);
    setCoverImageRef(activity.cover_image_ref ?? null);
    if (activity.location) {
      setPlaceName(activity.location.name);
      setAreaLabel(activity.location.area_label);
      if (activity.location.point) {
        setPin({ lat: activity.location.point.lat, lng: activity.location.point.lng });
      }
    }
  }, [activity]);

  useEffect(() => {
    if (skipGeocodeRef.current) {
      skipGeocodeRef.current = false;
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setGeocodingArea(true);
      try {
        const result = await resolvePinLocation(pin.lat, pin.lng, locations);
        if (cancelled || !result) return;
        setAreaLabel(result.areaLabel);
        if (!placeNameTouchedRef.current && result.placeName) setPlaceName(result.placeName);
      } finally {
        if (!cancelled) setGeocodingArea(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pin.lat, pin.lng, locations]);

  const endTimeLabel = useMemo(() => {
    const start = fromDatetimeLocalValue(startsAtLocal);
    if (!start || !durationMinutes) return null;
    const end = new Date(new Date(start).getTime() + durationMinutes * 60_000);
    return end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }, [startsAtLocal, durationMinutes]);

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      await api.updateActivity(
        id,
        buildActivityFormPayload({
          title,
          description,
          categoryId,
          startsAtLocal,
          durationMinutes,
          pin,
          placeName,
          areaLabel,
          capacity,
          isFree,
          costAmount,
          costNote,
          skillLevel,
          acceptanceMode,
          hostIsParticipating,
          coverImageRef,
        }),
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["activity", id] }),
        queryClient.invalidateQueries({ queryKey: ["my-plans"] }),
        queryClient.invalidateQueries({ queryKey: ["feed"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications-unread"] }),
      ]);
      navigate(`/activities/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenShell title="Edit activity">
        <p className="text-on-surface-variant">Loading...</p>
      </ScreenShell>
    );
  }

  if (!activity || activity.viewer_role !== "host") {
    return (
      <ScreenShell title="Edit activity">
        <p className="text-on-surface-variant">You can only edit activities you host.</p>
      </ScreenShell>
    );
  }

  if (!["published", "draft"].includes(activity.status)) {
    return (
      <ScreenShell title="Edit activity">
        <p className="text-on-surface-variant">This activity can no longer be edited.</p>
        <PrimaryButton className="mt-4" onClick={() => navigate(`/activities/${id}`)}>
          Back to activity
        </PrimaryButton>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Edit activity">
      <div className="space-y-6 pb-4">
        <p className="text-body-md text-on-surface-variant">
          Confirmed attendees will be notified when you save changes.
        </p>

        <Section title="Cover image">
          <button
            type="button"
            className="relative w-full h-44 rounded-xl overflow-hidden border border-dashed border-outline-variant bg-surface-container-low flex items-center justify-center"
            onClick={() => coverInputRef.current?.click()}
            disabled={coverUploading}
          >
            {coverImageRef ? (
              <img src={coverImageRef} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                <Icon name="photo_camera" className="text-3xl" />
                <span className="text-body-md">{coverUploading ? "Uploading..." : "Add a cover photo"}</span>
              </div>
            )}
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setCoverUploading(true);
              try {
                setCoverImageRef(await api.uploadActivityCover(file));
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not upload image");
              } finally {
                setCoverUploading(false);
              }
            }}
          />
        </Section>

        <Section title="Basics">
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label className="block space-y-1.5">
            <span className="text-label-bold">Description</span>
            <textarea
              className="w-full min-h-[120px] rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-body-md"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c: { id: string; name: string }) => (
              <FilterChip
                key={c.id}
                label={c.name}
                selected={categoryId === c.id}
                onClick={() => setCategoryId(c.id)}
              />
            ))}
          </div>
        </Section>

        <Section title="Date & time">
          <TextField
            label="Starts"
            type="datetime-local"
            value={startsAtLocal}
            onChange={(e) => setStartsAtLocal(e.target.value)}
          />
          <TextField
            label="Duration (minutes)"
            type="number"
            min={30}
            max={720}
            step={15}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            hint={endTimeLabel ? `Ends around ${endTimeLabel}` : undefined}
          />
        </Section>

        <Section title="Location">
          <MapPinPicker value={pin} onChange={setPin} suggestedLocations={locations} />
          <TextField
            label="Place name"
            value={placeName}
            onChange={(e) => {
              placeNameTouchedRef.current = true;
              setPlaceName(e.target.value);
            }}
          />
          <TextField
            label="Area"
            value={areaLabel}
            onChange={(e) => setAreaLabel(e.target.value)}
            hint={geocodingArea ? "Looking up area..." : undefined}
          />
        </Section>

        <Section title="Capacity & cost">
          <TextField
            label="Capacity"
            type="number"
            min={2}
            max={200}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
          />
          <div className="flex gap-2">
            <FilterChip label="Free" selected={isFree} onClick={() => setIsFree(true)} />
            <FilterChip label="Paid" selected={!isFree} onClick={() => setIsFree(false)} />
          </div>
          {!isFree && (
            <TextField
              label="Cost per person (EUR)"
              type="number"
              min={0}
              step={0.5}
              value={costAmount}
              onChange={(e) => setCostAmount(Number(e.target.value))}
            />
          )}
        </Section>

        <Section title="Skill level">
          <div className="flex flex-wrap gap-2">
            {skillLevelOptions.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={skillLevel === option.value}
                onClick={() => setSkillLevel(option.value)}
              />
            ))}
          </div>
        </Section>

        <section className="space-y-3">
          <h3 className="text-headline-md font-bold">How should people join?</h3>
          <div className="grid gap-2">
            {acceptanceModeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAcceptanceMode(option.value)}
                className={`text-left rounded-xl border-2 p-4 transition-colors ${
                  acceptanceMode === option.value
                    ? "border-primary bg-primary/5"
                    : "border-outline-variant/40 bg-surface-container-lowest"
                }`}
              >
                <p className="font-label-bold flex items-center gap-2">
                  {option.label}
                  <Icon name={option.icon} className="text-base" />
                </p>
                <p className="text-label-sm text-on-surface-variant mt-1">{option.description}</p>
              </button>
            ))}
          </div>
        </section>

        <Section title="Hosting">
          <div className="flex items-center justify-between gap-4">
            <p className="font-label-bold">I&apos;ll participate too</p>
            <ToggleSwitch checked={hostIsParticipating} onChange={setHostIsParticipating} label="Participate" />
          </div>
        </Section>

        {error && (
          <p className="text-error text-body-md" role="alert">
            {error}
          </p>
        )}

        <PrimaryButton
          fullWidth
          disabled={saving || categoriesLoading || !categoryId}
          onClick={save}
        >
          {saving ? "Saving..." : "Save changes"}
        </PrimaryButton>
      </div>
    </ScreenShell>
  );
}
