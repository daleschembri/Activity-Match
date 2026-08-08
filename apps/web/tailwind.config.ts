import type { Config } from "tailwindcss";
import { stitchColors } from "@activity-match/ui/tailwind.preset";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: stitchColors,
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      spacing: {
        gutter: "16px",
        "margin-mobile": "20px",
      },
      fontFamily: {
        sans: ["Hanken Grotesk", "system-ui", "sans-serif"],
      },
      fontSize: {
        "headline-lg-mobile": ["28px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "800" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "headline-md": ["20px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "label-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.04em", fontWeight: "500" }],
        "headline-xl": ["40px", { lineHeight: "44px", letterSpacing: "-0.02em", fontWeight: "800" }],
        "headline-lg": ["32px", { lineHeight: "36px", letterSpacing: "-0.02em", fontWeight: "800" }],
        "label-bold": ["14px", { lineHeight: "20px", letterSpacing: "0.02em", fontWeight: "700" }],
      },
    },
  },
} satisfies Config;
