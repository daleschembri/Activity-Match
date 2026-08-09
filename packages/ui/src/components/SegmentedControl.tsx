interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`flex p-0.5 rounded-full bg-surface-container-high ${className}`}
      role="group"
    >
      {options.map((option) => {
        const selected = option.value === value;
        const isPrimaryOption = option.value === options[0]?.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex-1 py-1.5 px-2 rounded-full font-label-bold text-label-bold transition-all ${
              selected
                ? isPrimaryOption
                  ? "bg-primary text-on-primary shadow-sm"
                  : "bg-surface-container-lowest text-on-surface border border-outline shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
                : "text-on-surface-variant hover:bg-surface-variant/50"
            }`}
            aria-pressed={selected}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
