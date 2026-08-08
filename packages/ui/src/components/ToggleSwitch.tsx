interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function ToggleSwitch({ checked, onChange, label, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        checked ? "bg-primary" : "bg-surface-container-highest border border-outline-variant"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        aria-hidden
        className={`pointer-events-none block h-6 w-6 rounded-full bg-surface-container-lowest shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[24px]" : "translate-x-1"
        }`}
      />
    </button>
  );
}
