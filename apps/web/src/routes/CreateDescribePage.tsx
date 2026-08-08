import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BottomNav, PrimaryButton, ScreenShell } from "@activity-match/ui";
import { api } from "@/lib/api";
import { mainNavCurrentPath, mainNavItems } from "@/lib/mainNav";

export function CreateDescribePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const continueFlow = async () => {
    setLoading(true);
    const draft = await api.draftFromText(text);
    sessionStorage.setItem("activity-draft", JSON.stringify({ freeText: text, draft }));
    setLoading(false);
    navigate("/create/review");
  };

  return (
    <ScreenShell
      title="New Activity"
      footer={<BottomNav items={[...mainNavItems]} currentPath={mainNavCurrentPath(location.pathname)} onNavigate={navigate} />}
    >
      <div className="space-y-6 pb-4">
        <p className="text-body-md text-on-surface-variant">
          Describe your activity in your own words. We will suggest details you can review before publishing.
        </p>
        <label className="block">
          <span className="text-label-bold">What do you want to do?</span>
          <textarea
            className="mt-2 w-full min-h-[160px] rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-body-md"
            placeholder="e.g. Casual board games Tuesday evening near St Paul's Bay, 6-8 people, beginners welcome"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
          />
        </label>
        <PrimaryButton fullWidth disabled={text.length < 10 || loading} onClick={continueFlow}>
          {loading ? "Extracting details..." : "Continue to review"}
        </PrimaryButton>
        <PrimaryButton fullWidth variant="outline" onClick={() => navigate("/create/review")}>
          Fill in manually instead
        </PrimaryButton>
      </div>
    </ScreenShell>
  );
}
