import { useNavigate } from "react-router-dom";
import { PrimaryButton, ScreenShell } from "@activity-match/ui";
import { BrandHeader, GathereLogo } from "@/components/GathereLogo";

export function EndOfFeedPage() {
  const navigate = useNavigate();
  return (
    <ScreenShell
      headerLeading={
        <div className="flex items-center gap-3">
          <BrandHeader layout="symbol" size="sm" />
          <h1 className="text-headline-md font-bold tracking-tight">End of Feed</h1>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center py-12 space-y-6">
        <GathereLogo variant="symbol" size="lg" className="opacity-90" />
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
