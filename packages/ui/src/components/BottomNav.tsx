import { Icon } from "./Icon";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  badge?: number;
}

interface BottomNavProps {
  items: NavItem[];
  currentPath: string;
  onNavigate: (to: string) => void;
}

export function BottomNav({ items, currentPath, onNavigate }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-surface border-t border-outline-variant/20 px-2 h-20 flex items-center justify-around shadow-[0_-4px_12px_rgba(0,0,0,0.04)] safe-area-pb z-50"
      aria-label="Main navigation"
    >
      {items.map((item) => {
        const active =
          currentPath === item.to ||
          (item.to !== "/" && currentPath.startsWith(item.to)) ||
          (item.to.startsWith("/create") && currentPath.startsWith("/create"));
        return (
          <button
            key={item.to}
            type="button"
            onClick={() => onNavigate(item.to)}
            className={`relative flex flex-col items-center justify-center min-w-12 min-h-16 px-1 rounded-lg transition-all duration-300 btn-press ${
              active
                ? "text-primary font-label-bold text-label-bold scale-95 after:content-[''] after:w-1 after:h-1 after:bg-primary after:rounded-full after:mt-1"
                : "text-on-surface-variant font-label-sm text-label-sm hover:bg-surface-container-low hover:scale-105"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <span className="relative mb-1">
              <Icon name={item.icon} filled={active} />
              {item.badge != null && item.badge > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-error text-on-error text-[10px] font-bold flex items-center justify-center">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </span>
            <span className="text-[11px] leading-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
