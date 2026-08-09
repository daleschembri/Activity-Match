function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

interface UserAvatarProps {
  name: string;
  avatarRef?: string | null;
  size?: "sm" | "md";
  className?: string;
}

const sizes = {
  sm: "w-10 h-10 text-label-sm",
  md: "w-12 h-12 text-headline-md",
};

export function UserAvatar({ name, avatarRef, size = "md", className = "" }: UserAvatarProps) {
  if (avatarRef) {
    return (
      <img
        src={avatarRef}
        alt=""
        className={`rounded-full object-cover border border-surface-variant shrink-0 ${sizes[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-surface-container-high flex items-center justify-center font-bold text-on-surface-variant border border-surface-variant shrink-0 ${sizes[size]} ${className}`}
    >
      {initials(name)}
    </div>
  );
}
