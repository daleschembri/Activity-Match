import { useNavigate, useParams } from "react-router-dom";
import { PrimaryButton, ScreenShell, Icon } from "@activity-match/ui";
import { api } from "@/lib/api";

export function WaitlistClaimPage() {
  const { requestId = "" } = useParams();
  const navigate = useNavigate();

  const claim = async () => {
    await api.claimWaitlist(requestId);
    navigate("/plans");
  };

  return (
    <ScreenShell title="Waitlist Claim">
      <div className="text-center py-10 space-y-6">
        <Icon name="hourglass_top" className="text-5xl text-secondary mx-auto" />
        <h2 className="text-headline-md font-bold">A spot opened up!</h2>
        <p className="text-body-md text-on-surface-variant">
          Claim your place before the offer expires. This window is limited to keep things fair for everyone on the waitlist.
        </p>
        <PrimaryButton fullWidth onClick={claim}>Claim my spot</PrimaryButton>
        <PrimaryButton fullWidth variant="outline" onClick={() => navigate("/plans")}>Decline offer</PrimaryButton>
      </div>
    </ScreenShell>
  );
}
