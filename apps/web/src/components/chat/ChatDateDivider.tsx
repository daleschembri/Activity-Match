interface ChatDateDividerProps {
  label: string;
}

export function ChatDateDivider({ label }: ChatDateDividerProps) {
  return (
    <div className="flex justify-center my-2">
      <span className="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-4 py-1 rounded-full">
        {label}
      </span>
    </div>
  );
}
