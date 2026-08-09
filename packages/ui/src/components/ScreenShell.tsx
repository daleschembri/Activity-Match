import type { ReactNode } from "react";

interface ScreenShellProps {
  title?: string;
  children: ReactNode;
  headerRight?: ReactNode;
  /** Replaces the title on the left (e.g. brand mark). */
  headerLeading?: ReactNode;
  footer?: ReactNode;
  /** Reserve space for the fixed main bottom nav. */
  reserveBottomNav?: boolean;
  className?: string;
}

export function ScreenShell({
  title,
  children,
  headerRight,
  headerLeading,
  footer,
  reserveBottomNav = false,
  className = "",
}: ScreenShellProps) {
  return (
    <div
      className={`${
        reserveBottomNav ? "h-dvh overflow-hidden" : "min-h-dvh"
      } bg-surface text-on-surface flex flex-col ${className}`}
    >
      {(title || headerRight || headerLeading) && (
        <header className="sticky top-0 z-10 bg-surface/95 backdrop-blur border-b border-outline-variant/30 px-margin-mobile py-3 flex items-center justify-between shrink-0">
          {headerLeading ?? (title ? (
            <h1 className="text-headline-md font-bold tracking-tight">{title}</h1>
          ) : (
            <span />
          ))}
          {headerRight ?? <span />}
        </header>
      )}
      <main
        className={`flex-1 px-margin-mobile py-gutter overflow-y-auto min-h-0 ${
          reserveBottomNav ? "pb-24" : ""
        }`}
      >
        {children}
      </main>
      {footer}
    </div>
  );
}
