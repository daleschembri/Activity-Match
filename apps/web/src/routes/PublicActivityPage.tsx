import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CapacityBadge, PrimaryButton, ScreenShell, TextField } from "@activity-match/ui";
import { api } from "@/lib/api";

export function PublicActivityPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const { data: activity, isLoading } = useQuery({
    queryKey: ["public-activity", slug],
    queryFn: () => api.resolvePublicActivity(slug),
    enabled: Boolean(slug),
  });

  const expressInterest = async () => {
    await api.createGuestInterest({ public_slug: slug, display_name: name, contact_ref: contact });
    alert("Interest recorded! Check your email for verification.");
  };

  if (isLoading) return <ScreenShell title="Activity"><p>Loading...</p></ScreenShell>;
  if (!activity) return <ScreenShell title="Activity"><p>Activity not found</p></ScreenShell>;

  return (
    <ScreenShell title="Shared Activity">
      <div className="space-y-5">
        <h1 className="text-headline-lg-mobile font-extrabold">{activity.title}</h1>
        {activity.capacity != null && (
          <CapacityBadge remaining={activity.spaces_remaining ?? 0} capacity={activity.capacity} />
        )}
        <p className="text-body-md text-on-surface-variant">{activity.description}</p>
        <div className="bg-surface-container rounded-xl p-4 space-y-2 text-body-md">
          <p>{activity.starts_at ? new Date(activity.starts_at).toLocaleString() : "Flexible timing"}</p>
          <p>{activity.area_label}</p>
          <p>Hosted by {activity.host.display_name}</p>
        </div>
        <section className="border-t border-outline-variant/30 pt-5 space-y-4">
          <h2 className="text-headline-md font-bold">Express interest</h2>
          <TextField label="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Email or phone" value={contact} onChange={(e) => setContact(e.target.value)} />
          <PrimaryButton fullWidth onClick={expressInterest}>I'm interested</PrimaryButton>
          <PrimaryButton fullWidth variant="outline" onClick={() => navigate("/")}>Create an account</PrimaryButton>
        </section>
      </div>
    </ScreenShell>
  );
}
