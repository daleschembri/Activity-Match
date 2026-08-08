import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BottomNav, Icon, PrimaryButton, ScreenShell } from "@activity-match/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { isSupabaseConfigured } from "@/lib/supabase";
import { mainNavCurrentPath, mainNavItems } from "@/lib/mainNav";

export function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => api.getProfile() });
  const { data: reliability } = useQuery({
    queryKey: ["reliability", profile?.id],
    queryFn: () => api.getReliability(profile?.id ?? ""),
    enabled: Boolean(profile?.id),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
  });
  const { data: interestIds = [] } = useQuery({
    queryKey: ["user-interests"],
    queryFn: () => api.getUserInterests(),
  });
  const interestNames = categories
    .filter((c: { id: string }) => interestIds.includes(c.id))
    .map((c: { name: string }) => c.name);

  return (
    <ScreenShell
      title="Profile"
      footer={<BottomNav items={[...mainNavItems]} currentPath={mainNavCurrentPath(location.pathname)} onNavigate={navigate} />}
    >
      <div className="space-y-8 pb-8">
        <section className="flex flex-col items-center text-center gap-4">
          {profile?.avatar_ref ? (
            <img
              src={profile.avatar_ref}
              alt=""
              className="w-24 h-24 rounded-full object-cover border-4 border-surface shadow-sm"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-3xl font-bold border-4 border-surface shadow-sm">
              {profile?.display_name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="space-y-1">
            <h2 className="text-headline-md font-bold">{profile?.display_name ?? "Your profile"}</h2>
            <div className="flex items-center justify-center gap-1 text-on-surface-variant">
              <Icon name="location_on" className="text-base" />
              <span>{profile?.home_area_label ?? "Add your area"}</span>
            </div>
          </div>
          {profile?.bio ? (
            <p className="text-body-md text-on-surface-variant max-w-sm">{profile.bio}</p>
          ) : (
            <p className="text-body-md text-on-surface-variant max-w-sm">Add a short bio so people know what you are into.</p>
          )}
          <PrimaryButton variant="outline" onClick={() => navigate("/profile/edit")}>
            Edit Profile
          </PrimaryButton>
        </section>

        <section className="bg-primary-container text-on-primary-container p-5 rounded-xl space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-headline-md font-bold">Verify your profile</h3>
              <p className="text-body-md opacity-90">Build trust in the community by verifying your ID.</p>
            </div>
            <Icon name="shield" className="text-3xl opacity-80" />
          </div>
          <PrimaryButton variant="secondary" className="self-start">
            Start Verification
          </PrimaryButton>
        </section>

        <section className="space-y-3">
          <h3 className="text-label-bold text-on-surface-variant uppercase tracking-wider">Reliability</h3>
          {reliability?.label === "New to the platform" ? (
            <p className="text-body-md text-on-surface-variant">New to the platform</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-surface-container-lowest p-4 rounded-xl text-center">
                <p className="text-headline-lg-mobile font-extrabold text-primary">{reliability?.attended_count ?? 0}</p>
                <p className="text-label-sm text-on-surface-variant">Attended</p>
              </div>
              <div className="bg-surface-container-lowest p-4 rounded-xl text-center">
                <p className="text-headline-lg-mobile font-extrabold">{reliability?.late_cancellation_count ?? 0}</p>
                <p className="text-label-sm text-on-surface-variant">Cancel</p>
              </div>
              <div className="bg-surface-container-lowest p-4 rounded-xl text-center">
                <p className="text-headline-lg-mobile font-extrabold">{reliability?.no_show_count ?? 0}</p>
                <p className="text-label-sm text-on-surface-variant">No-shows</p>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-label-bold text-on-surface-variant uppercase tracking-wider">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {interestNames.map((name) => (
              <span key={name} className="px-4 py-2 bg-primary/10 text-primary font-label-bold rounded-full">
                {name}
              </span>
            ))}
            <button
              type="button"
              onClick={() => navigate("/onboarding/interests", { state: { from: "profile" } })}
              className="px-4 py-2 border border-outline-variant text-on-surface-variant font-label-bold rounded-full inline-flex items-center gap-1"
            >
              <Icon name="add" className="text-base" />
              Add
            </button>
          </div>
        </section>

        {isSupabaseConfigured && (
          <PrimaryButton variant="outline" fullWidth onClick={() => signOut()}>
            Sign out
          </PrimaryButton>
        )}
      </div>
    </ScreenShell>
  );
}
