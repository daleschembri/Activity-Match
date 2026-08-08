import type { AcceptanceMode, SkillLevel } from "@activity-match/shared";

export function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function defaultStartDatetimeLocal(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(18, 0, 0, 0);
  return toDatetimeLocalValue(date.toISOString());
}

export const skillLevelOptions: { value: SkillLevel; label: string }[] = [
  { value: "any", label: "Any level" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export const acceptanceModeOptions: { value: AcceptanceMode; label: string; description: string; icon: string }[] = [
  { value: "auto", label: "Auto-accept", description: "Anyone who RSVPs is instantly confirmed.", icon: "bolt" },
  { value: "approval", label: "Host approval", description: "You manually review and approve each request.", icon: "how_to_reg" },
];

export const DEFAULT_MAP_CENTER = { lat: 35.912, lng: 14.502 };

export function buildActivityFormPayload(form: {
  title: string;
  description: string;
  categoryId: string;
  startsAtLocal: string;
  durationMinutes: number;
  pin: { lat: number; lng: number };
  placeName: string;
  areaLabel: string;
  capacity: number;
  isFree: boolean;
  costAmount: number;
  costNote: string;
  skillLevel: SkillLevel;
  acceptanceMode: AcceptanceMode;
  hostIsParticipating: boolean;
  coverImageRef: string | null;
}) {
  return {
    listing_type: "confirmed",
    title: form.title.trim(),
    description: form.description,
    category_id: form.categoryId,
    starts_at: fromDatetimeLocalValue(form.startsAtLocal),
    duration_minutes: form.durationMinutes,
    location_pin: {
      lat: form.pin.lat,
      lng: form.pin.lng,
      name: form.placeName.trim(),
      area_label: form.areaLabel.trim(),
    },
    capacity: form.capacity,
    cost_amount: form.isFree ? 0 : form.costAmount,
    cost_currency: "EUR",
    cost_note: form.costNote.trim() || null,
    skill_level: form.skillLevel,
    acceptance_mode: form.acceptanceMode,
    host_is_participating: form.hostIsParticipating,
    cover_image_ref: form.coverImageRef,
  };
}
