import { Icon } from "@activity-match/ui";

export function ArchivedChatBanner() {
  return (
    <div className="bg-surface-variant text-on-surface-variant px-margin-mobile py-2 flex items-center justify-center gap-2 font-label-sm text-label-sm border-b border-surface-dim shrink-0">
      <Icon name="lock" className="text-base" />
      This activity has finished. The chat is read-only.
    </div>
  );
}
