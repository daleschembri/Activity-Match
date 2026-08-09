import { Icon } from "@activity-match/ui";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAttachClick?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  onAttachClick,
  disabled,
  placeholder = "Message group...",
}: ChatComposerProps) {
  return (
    <div className="shrink-0 bg-surface border-t border-surface-variant px-margin-mobile py-2 pb-safe flex items-center gap-2 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
      <button
        type="button"
        aria-label="Add attachment"
        onClick={onAttachClick}
        className="text-primary p-2 rounded-full hover:bg-surface-container-high transition-colors shrink-0 disabled:opacity-40"
        disabled={disabled || !onAttachClick}
      >
        <Icon name="add_circle" />
      </button>
      <div className="flex-1 bg-surface-container-low border border-outline-variant rounded-full flex items-center px-4 py-2 min-h-[44px]">
        <input
          className="w-full bg-transparent border-none p-0 focus:ring-0 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim() && !disabled) onSend();
          }}
          disabled={disabled}
        />
      </div>
      <button
        type="button"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className="bg-primary text-on-primary w-10 h-10 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity shrink-0 active:scale-95 shadow-sm disabled:opacity-40"
      >
        <Icon name="send" className="text-[20px]" />
      </button>
    </div>
  );
}
