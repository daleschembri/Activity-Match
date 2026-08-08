import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AcceptanceMode, SkillLevel } from "@activity-match/shared";
import { BottomNav, FilterChip, Icon, PrimaryButton, ScreenShell, TextField } from "@activity-match/ui";
import { api } from "@/lib/api";
import {
  acceptanceModeOptions,
  buildActivityFormPayload,
  DEFAULT_MAP_CENTER,
  defaultStartDatetimeLocal,
  fromDatetimeLocalValue,
  skillLevelOptions,
  toDatetimeLocalValue,
} from "@/lib/activityForm";
import { MapPinPicker, type MapPinValue } from "@/components/MapPinPicker";
import { resolvePinLocation } from "@/lib/geocode";
import { mainNavCurrentPath, mainNavItems } from "@/lib/mainNav";

function draftField<T>(field: { value?: T } | undefined, fallback: T): T {
  return field?.value ?? fallback;
}

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

export function CreateReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const stored = sessionStorage.getItem("activity-draft");
  const parsed = stored ? JSON.parse(stored) : null;
  const draft = parsed?.draft;

  const [title, setTitle] = useState(() => draftField(draft?.title, ""));
  const [description, setDescription] = useState(() => draftField(draft?.description, parsed?.freeText ?? ""));
  const [categoryId, setCategoryId] = useState("");
  const [startsAtLocal, setStartsAtLocal] = useState(() =>
    toDatetimeLocalValue(draftField(draft?.starts_at, null)) || defaultStartDatetimeLocal(),
  );
  const [durationMinutes, setDurationMinutes] = useState(() => draftField(draft?.duration_minutes, 120));
  const [pin, setPin] = useState(DEFAULT_MAP_CENTER);
  const [placeName, setPlaceName] = useState("");
  const [areaLabel, setAreaLabel] = useState("");
  const [geocodingArea, setGeocodingArea] = useState(false);
  const skipGeocodeRef = useRef(false);
  const placeNameTouchedRef = useRef(false);
  const initializedFromSuggestionsRef = useRef(false);
  const [capacity, setCapacity] = useState(() => draftField(draft?.capacity, 8));
  const [isFree, setIsFree] = useState(() => draftField(draft?.cost_amount, 0) === 0);
  const [costAmount, setCostAmount] = useState(() => draftField(draft?.cost_amount, 0));
  const [costNote, setCostNote] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(() => draftField(draft?.skill_level, "any"));
  const [acceptanceMode, setAcceptanceMode] = useState<AcceptanceMode>("auto");
  const [hostIsParticipating, setHostIsParticipating] = useState(true);
  const [coverImageRef, setCoverImageRef] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [tags, setTags] = useState<string[]>(() => draft?.suggested_tags ?? []);
  const [newTag, setNewTag] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<"publish" | "draft" | null>(null);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
  });
  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: () => api.getLocations(),
  });

  useEffect(() => {
    if (!categoryId && categories[0]?.id) setCategoryId(categories[0].id);
  }, [categories, categoryId]);

  useEffect(() => {
    if (initializedFromSuggestionsRef.current || !locations[0]) return;
    initializedFromSuggestionsRef.current = true;
    skipGeocodeRef.current = true;
    setPlaceName(locations[0].name);
    setAreaLabel(locations[0].area_label);
    setPin({ lat: locations[0].lat, lng: locations[0].lng });
  }, [locations]);

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
        if (!placeNameTouchedRef.current && result.placeName) {
          setPlaceName(result.placeName);
        }
      } finally {
        if (!cancelled) setGeocodingArea(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pin.lat, pin.lng, locations]);

  const handlePinChange = (next: MapPinValue) => {
    setPin(next);
  };

  const handleSuggestedSelect = (loc: { name: string; area_label: string; lat: number; lng: number }) => {
    skipGeocodeRef.current = true;
    setPlaceName(loc.name);
    setAreaLabel(loc.area_label);
  };

  const handleCoverPick = async (file: File | undefined) => {
    if (!file) return;
    setCoverUploading(true);
    setError("");
    try {
      const url = await api.uploadActivityCover(file);
      setCoverImageRef(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload image");
    } finally {
      setCoverUploading(false);
    }
  };

  const endTimeLabel = useMemo(() => {
    const start = fromDatetimeLocalValue(startsAtLocal);
    if (!start || !durationMinutes) return null;
    const end = new Date(new Date(start).getTime() + durationMinutes * 60_000);
    return end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }, [startsAtLocal, durationMinutes]);

  const formPayload = () =>
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
    });

  const saveDraft = async () => {
    setError("");
    setLoading("draft");
    try {
      await api.createActivity(formPayload());
      sessionStorage.removeItem("activity-draft");
      await queryClient.invalidateQueries({ queryKey: ["my-plans"] });
      navigate("/plans");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save draft");
    } finally {
      setLoading(null);
    }
  };

  const publish = async () => {
    setError("");
    setLoading("publish");
    try {
      const activity = await api.createAndPublishActivity(formPayload());
      sessionStorage.removeItem("activity-draft");
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["my-plans"] });
      navigate("/plans", { state: { highlight: activity.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish activity");
    } finally {
      setLoading(null);
    }
  };

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (!tag || tags.includes(tag)) return;
    setTags((prev) => [...prev, tag]);
    setNewTag("");
  };

  return (
    <ScreenShell
      title="Review"
      footer={<BottomNav items={[...mainNavItems]} currentPath={mainNavCurrentPath(location.pathname)} onNavigate={navigate} />}
    >
      <div className="space-y-6 pb-4">
        <section className="space-y-2">
          <h2 className="text-headline-lg-mobile font-extrabold">Almost there.</h2>
          <p className="text-body-md text-on-surface-variant">
            Review the details we gathered. You can edit any field before publishing.
          </p>
        </section>

        <Section title="Cover image" hint="Optional — helps your activity stand out in Discover">
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
            onChange={(e) => void handleCoverPick(e.target.files?.[0])}
          />
          {coverImageRef && (
            <PrimaryButton variant="outline" onClick={() => setCoverImageRef(null)}>
              Remove photo
            </PrimaryButton>
          )}
        </Section>

        <Section title="Basics">
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} hint="3–80 characters" />
          <label className="block space-y-1.5">
            <span className="text-label-bold">Description</span>
            <textarea
              className="w-full min-h-[120px] rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-body-md"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
            />
          </label>
          <div>
            <span className="text-label-bold">Category</span>
            {categoriesLoading ? (
              <p className="text-body-md text-on-surface-variant mt-2">Loading categories...</p>
            ) : (
              <div className="flex flex-wrap gap-2 mt-2">
                {categories.map((c: { id: string; name: string }) => (
                  <FilterChip key={c.id} label={c.name} selected={categoryId === c.id} onClick={() => setCategoryId(c.id)} />
                ))}
              </div>
            )}
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

        <Section title="Location" hint="Tap the map to place your pin, or choose a suggested spot.">
          {locationsLoading ? (
            <p className="text-body-md text-on-surface-variant">Loading map...</p>
          ) : (
            <MapPinPicker
              value={pin}
              onChange={handlePinChange}
              suggestedLocations={locations}
              onSuggestedSelect={handleSuggestedSelect}
            />
          )}
          <TextField
            label="Place name"
            value={placeName}
            onChange={(e) => {
              placeNameTouchedRef.current = true;
              setPlaceName(e.target.value);
            }}
            placeholder="e.g. Crag Peak, North Trailhead"
          />
          <TextField
            label="Area"
            value={areaLabel}
            onChange={(e) => setAreaLabel(e.target.value)}
            placeholder="e.g. Sliema"
            hint={geocodingArea ? "Looking up area from pin..." : "Auto-filled when you move the pin"}
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
            hint="How many people can join?"
          />
          <div className="flex gap-2">
            <FilterChip label="Free" selected={isFree} onClick={() => setIsFree(true)} />
            <FilterChip label="Paid" selected={!isFree} onClick={() => setIsFree(false)} />
          </div>
          {!isFree && (
            <>
              <TextField
                label="Cost per person (EUR)"
                type="number"
                min={0}
                step={0.5}
                value={costAmount}
                onChange={(e) => setCostAmount(Number(e.target.value))}
              />
              <TextField
                label="Cost note (optional)"
                value={costNote}
                onChange={(e) => setCostNote(e.target.value)}
                placeholder="e.g. Includes equipment rental"
              />
            </>
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

        <Section title="Tags" hint="Help people discover your activity">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-full bg-primary/10 text-primary font-label-bold inline-flex items-center gap-1"
              >
                {tag}
                <button type="button" aria-label={`Remove ${tag}`} onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}>
                  <Icon name="close" className="text-sm" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-body-md"
              placeholder="Add tag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            />
            <PrimaryButton variant="outline" onClick={addTag}>Add</PrimaryButton>
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
          <FilterChip
            label="I'll participate too"
            selected={hostIsParticipating}
            onClick={() => setHostIsParticipating((prev) => !prev)}
          />
        </Section>

        {error && (
          <p className="text-error text-body-md" role="alert">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <PrimaryButton
            variant="outline"
            fullWidth
            disabled={loading !== null || categoriesLoading || !categoryId}
            onClick={saveDraft}
          >
            {loading === "draft" ? "Saving..." : "Save draft"}
          </PrimaryButton>
          <PrimaryButton
            fullWidth
            disabled={loading !== null || categoriesLoading || !categoryId}
            onClick={publish}
          >
            {loading === "publish" ? "Publishing..." : "Publish activity"}
          </PrimaryButton>
        </div>
      </div>
    </ScreenShell>
  );
}
