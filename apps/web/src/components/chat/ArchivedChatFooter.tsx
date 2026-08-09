import { Icon } from "@activity-match/ui";

interface ArchivedChatFooterProps {
  onRepeat: () => void;
}

export function ArchivedChatFooter({ onRepeat }: ArchivedChatFooterProps) {
  return (
    <div className="shrink-0 px-margin-mobile py-4 pb-safe bg-surface shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
      <button
        type="button"
        onClick={onRepeat}
        className="w-full bg-primary text-on-primary font-label-bold text-label-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform hover:opacity-90"
      >
        <Icon name="restart_alt" />
        Repeat with this group
      </button>
    </div>
  );
}
