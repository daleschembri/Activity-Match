interface PageIndicatorProps {
  total: number;
  current: number;
}

export function PageIndicator({ total, current }: PageIndicatorProps) {
  return (
    <div className="flex justify-center gap-2" aria-label={`Page ${current + 1} of ${total}`}>
      {Array.from({ length: total }, (_, index) => (
        <div
          key={index}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            index === current ? "w-8 bg-primary" : "w-2 bg-surface-dim"
          }`}
        />
      ))}
    </div>
  );
}
