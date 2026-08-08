import type { ButtonHTMLAttributes, ReactNode } from "react";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "danger";
  fullWidth?: boolean;
}

const variants = {
  primary: "bg-primary text-on-primary hover:bg-primary-container",
  secondary: "bg-secondary-container text-on-secondary-container",
  outline: "border-2 border-outline text-on-surface bg-surface-container-lowest",
  danger: "bg-error text-on-error",
};

export function PrimaryButton({
  children,
  variant = "primary",
  fullWidth,
  className = "",
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      className={`btn-press rounded-xl px-5 py-3.5 text-label-bold font-bold transition-colors disabled:opacity-50 min-h-[48px] ${
        variants[variant]
      } ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
