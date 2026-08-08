import { Icon } from "./Icon";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

interface BottomNavProps {
  items: NavItem[];
  currentPath: string;
  onNavigate: (to: string) => void;
}

export function BottomNav({ items, currentPath, onNavigate }: BottomNavProps) {
  return (
    <nav
      className="sticky bottom-0 bg-surface-container-lowest border-t border-outline-variant/30 px-2 py-2 safe-area-pb"
      aria-label="Main navigation"
    >
      <ul className="flex justify-around">
        {items.map((item) => {
          const active =
            currentPath === item.to ||
            (item.to !== "/" && currentPath.startsWith(item.to)) ||
            (item.to.startsWith("/create") && currentPath.startsWith("/create"));
          return (
            <li key={item.to}>
              <button
                type="button"
                onClick={() => onNavigate(item.to)}
                className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg min-w-[56px] min-h-[48px] ${
                  active ? "text-primary" : "text-on-surface-variant"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon name={item.icon} filled={active} />
                <span className="text-label-sm">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
