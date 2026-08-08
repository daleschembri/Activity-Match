import { useNavigate } from "react-router-dom";
import { Icon, PrimaryButton, ScreenShell } from "@activity-match/ui";

export function EndOfFeedPage() {
  const navigate = useNavigate();
  return (
    <ScreenShell title="End of Feed">
      <div className="flex flex-col items-center text-center py-12 space-y-6">
        <Icon name="terrain" className="text-5xl text-primary" />
        <h2 className="text-headline-md font-bold">You have seen everything nearby</h2>
        <p className="text-body-md text-on-surface-variant max-w-sm">
          The feed is finite by design. Try widening your filters, save an alert, or create your own activity.
        </p>
        <div className="w-full max-w-sm space-y-3">
          <PrimaryButton fullWidth onClick={() => navigate("/filters")}>Widen filters</PrimaryButton>
          <PrimaryButton fullWidth variant="outline" onClick={() => navigate("/create/describe")}>Create an activity</PrimaryButton>
          <PrimaryButton fullWidth variant="secondary" onClick={() => navigate("/")}>Back to feed</PrimaryButton>
        </div>
      </div>
    </ScreenShell>
  );
}
