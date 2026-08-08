import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon, PrimaryButton, ScreenShell, TextField } from "@activity-match/ui";
import { api } from "@/lib/api";

export function EditProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => api.getProfile() });
  const [displayName, setDisplayName] = useState("");
  const [homeArea, setHomeArea] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setHomeArea(profile.home_area_label ?? "");
    setBio(profile.bio ?? "");
    setAvatarPreview(profile.avatar_ref);
  }, [profile]);

  const onAvatarPick = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setSaving(true);
    try {
      const url = await api.uploadAvatar(file);
      setAvatarPreview(url);
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload photo");
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      await api.updateProfile({
        display_name: displayName,
        home_area_label: homeArea,
        bio,
      });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      navigate("/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenShell
      title="Edit Profile"
      headerRight={
        <button type="button" onClick={() => navigate("/profile")} aria-label="Cancel">
          <Icon name="close" />
        </button>
      }
    >
      <div className="space-y-6 pb-8">
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            className="relative"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Change profile photo"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-surface shadow-sm" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-3xl font-bold border-4 border-surface">
                {displayName[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shadow-sm">
              <Icon name="photo_camera" className="text-base" />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void onAvatarPick(e.target.files?.[0])}
          />
          <p className="text-label-sm text-on-surface-variant">Tap to change photo</p>
        </div>

        <TextField label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} hint="2–40 characters" />
        <TextField label="Location" value={homeArea} onChange={(e) => setHomeArea(e.target.value)} hint="e.g. Pacific Northwest" />
        <label className="block space-y-1.5">
          <span className="text-label-bold">Bio</span>
          <textarea
            className="w-full min-h-[120px] rounded-xl border border-outline-variant p-4"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Weekend hiker, amateur climber..."
            maxLength={300}
          />
          <span className="text-label-sm text-on-surface-variant">{bio.length}/300</span>
        </label>

        {error && (
          <p className="text-error text-body-md" role="alert">
            {error}
          </p>
        )}

        <PrimaryButton fullWidth disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save profile"}
        </PrimaryButton>
      </div>
    </ScreenShell>
  );
}
