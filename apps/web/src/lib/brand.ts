export const APP_NAME = "Gathere";

export const GATHERE_LOGO = {
  full: "/gathere/logo-full-color.svg",
  fullWhite: "/gathere/logo-full-white.svg",
  fullColorWhiteText: "/gathere/logo-full-color-white-text.svg",
  wordmark: "/gathere/logo-wordmark.svg",
  wordmarkWhite: "/gathere/logo-wordmark-white.svg",
  symbol: "/gathere/logo-symbol.svg",
  symbolWhite: "/gathere/logo-symbol-white.svg",
  symbolBlack: "/gathere/logo-symbol-black.svg",
  symbolSimplified: "/gathere/logo-symbol-simplified.svg",
  symbolSimplifiedWhite: "/gathere/logo-symbol-simplified-white.svg",
  symbolSimplifiedBlack: "/gathere/logo-symbol-simplified-black.svg",
} as const;

export type GathereLogoVariant = keyof typeof GATHERE_LOGO;
