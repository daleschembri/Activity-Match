import type { ProfileGender } from "@activity-match/shared";

export const genderOptions: Array<{ value: ProfileGender; label: string }> = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export function formatGender(gender: ProfileGender | null | undefined): string | null {
  if (!gender) return null;
  return genderOptions.find((option) => option.value === gender)?.label ?? null;
}

export function calculateAge(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 0 && age <= 120 ? age : null;
}

export function formatProfileAgeGender(
  dateOfBirth: string | null | undefined,
  gender: ProfileGender | null | undefined,
): string | null {
  const age = calculateAge(dateOfBirth);
  const genderLabel = formatGender(gender);
  const parts: string[] = [];

  if (age != null) parts.push(String(age));
  if (genderLabel && gender !== "prefer_not_to_say") parts.push(genderLabel);

  return parts.length ? parts.join(" · ") : null;
}

export function toDateInputValue(dateOfBirth: string | null | undefined): string {
  if (!dateOfBirth) return "";
  return dateOfBirth.slice(0, 10);
}

export const maxBirthdate = (): string => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 13);
  return date.toISOString().slice(0, 10);
};

export const minBirthdate = (): string => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 120);
  return date.toISOString().slice(0, 10);
};
