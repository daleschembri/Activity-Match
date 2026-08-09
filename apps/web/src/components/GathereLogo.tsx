import { APP_NAME, GATHERE_LOGO, type GathereLogoVariant } from "@/lib/brand";

export type GathereLogoSize = "xs" | "sm" | "md" | "lg" | "xl";

interface GathereLogoProps {
  variant?: GathereLogoVariant;
  size?: GathereLogoSize;
  className?: string;
  /** @deprecated Use variant="fullWhite" */
  inverse?: boolean;
}

const SIZE_CLASS: Record<GathereLogoSize, string> = {
  xs: "h-5 w-auto",
  sm: "h-7 w-auto",
  md: "h-9 w-auto",
  lg: "h-12 w-auto",
  xl: "w-[min(72vw,280px)] h-auto",
};

function resolveVariant(variant: GathereLogoVariant | undefined, inverse: boolean): GathereLogoVariant {
  if (variant) return variant;
  return inverse ? "fullWhite" : "full";
}

export function GathereLogo({
  variant,
  size = "xl",
  className = "",
  inverse = false,
}: GathereLogoProps) {
  const resolved = resolveVariant(variant, inverse);
  const src = GATHERE_LOGO[resolved];
  const isFullLockup = resolved.startsWith("full");

  return (
    <img
      src={src}
      alt={APP_NAME}
      className={`${isFullLockup && size === "xl" ? SIZE_CLASS.xl : SIZE_CLASS[size]} mx-auto block ${className}`}
    />
  );
}

interface BrandHeaderProps {
  /** Symbol only, wordmark only, or symbol + wordmark */
  layout?: "symbol" | "wordmark" | "lockup";
  size?: "sm" | "md";
  className?: string;
}

export function BrandHeader({ layout = "lockup", size = "sm", className = "" }: BrandHeaderProps) {
  const symbolSize: GathereLogoSize = size === "md" ? "md" : "sm";
  const wordmarkSize: GathereLogoSize = size === "md" ? "md" : "sm";

  if (layout === "symbol") {
    return <GathereLogo variant="symbolSimplified" size={symbolSize} className={`mx-0 ${className}`} />;
  }

  if (layout === "wordmark") {
    return <GathereLogo variant="wordmark" size={wordmarkSize} className={`mx-0 ${className}`} />;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <GathereLogo variant="symbolSimplified" size={symbolSize} className="mx-0" />
      <GathereLogo variant="wordmark" size={wordmarkSize} className="mx-0" />
    </div>
  );
}
