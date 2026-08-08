interface CapacitySegmentsProps {
  filled: number;
  total: number;
  className?: string;
}

export function CapacitySegments({ filled, total, className = "h-2" }: CapacitySegmentsProps) {
  return (
    <div className={`flex gap-1 w-full ${className}`}>
      {Array.from({ length: total }, (_, index) => (
        <div
          key={index}
          className={`flex-1 rounded-full ${
            index < filled ? "bg-primary" : "bg-surface-variant"
          } ${index === 0 ? "rounded-l-full" : ""} ${
            index === total - 1 ? "rounded-r-full" : ""
          }`}
        />
      ))}
    </div>
  );
}

export function capacityStatusLabel(filled: number, total: number): string {
  if (total <= 0) return "Open";
  const ratio = filled / total;
  if (ratio >= 1) return "Full";
  if (ratio >= 0.75) return "Almost full";
  if (ratio >= 0.4) return "Half full";
  return "Spots available";
}
