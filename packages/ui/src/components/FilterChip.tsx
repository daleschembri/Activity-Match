interface FilterChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}

export function FilterChip({ label, selected, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn-press shrink-0 rounded-full px-4 py-2 text-label-bold border transition-all duration-200 min-h-[40px] ${
        selected
          ? "bg-primary text-on-primary border-primary scale-[1.02] shadow-sm"
          : "bg-surface-container-low border-outline-variant text-on-surface hover:scale-[1.02]"
      }`}
    >
      {label}
    </button>
  );
}
