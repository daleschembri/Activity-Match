import type { ReactNode } from "react";

interface ScreenShellProps {
  title?: string;
  children: ReactNode;
  headerRight?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function ScreenShell({
  title,
  children,
  headerRight,
  footer,
  className = "",
}: ScreenShellProps) {
  return (
    <div className={`min-h-dvh bg-surface text-on-surface flex flex-col ${className}`}>
      {(title || headerRight) && (
        <header className="sticky top-0 z-10 bg-surface/95 backdrop-blur border-b border-outline-variant/30 px-margin-mobile py-3 flex items-center justify-between">
          {title ? (
            <h1 className="text-headline-md font-bold tracking-tight">{title}</h1>
          ) : (
            <span />
          )}
          {headerRight}
        </header>
      )}
      <main className="flex-1 px-margin-mobile py-gutter overflow-y-auto">{children}</main>
      {footer}
    </div>
  );
}
