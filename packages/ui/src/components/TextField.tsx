import type { InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export function TextField({ label, hint, className = "", id, ...props }: TextFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label className="block space-y-1.5" htmlFor={fieldId}>
      <span className="text-label-bold text-on-surface">{label}</span>
      <input
        id={fieldId}
        className={`w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[48px] ${className}`}
        {...props}
      />
      {hint && <span className="text-label-sm text-on-surface-variant">{hint}</span>}
    </label>
  );
}
