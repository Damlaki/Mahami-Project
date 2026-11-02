/**
 * Design tokens — the single source of truth for colors, spacing, radii and type.
 * Components read these through useTheme(); nothing hard-codes a hex value.
 */
import type { CategoryId, Priority } from "../domain/task";
import type { Scheme } from "../domain/preferences";

export interface Palette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  success: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  overlay: string;
  shadow: string;
  category: Record<CategoryId, string>;
  priority: Record<Priority, string>;
}

const light: Palette = {
  bg: "#F7F4EF",
  surface: "#FFFFFF",
  surfaceAlt: "#F1ECE4",
  border: "#E6DFD4",
  text: "#1E1B18",
  textMuted: "#6B645C",
  textFaint: "#9E968B",
  primary: "#E2725B",
  onPrimary: "#FFFFFF",
  primarySoft: "#FBE4DC",
  success: "#3E8E63",
  danger: "#C2453A",
  dangerSoft: "#F8DEDB",
  warning: "#C98A1B",
  overlay: "rgba(24, 18, 12, 0.45)",
  shadow: "#5A4632",
  category: {
    personal: "#E2725B",
    work: "#5B7DB1",
    study: "#8467C2",
    health: "#3E8E63",
    home: "#D4962A",
  },
  priority: { low: "#9E968B", medium: "#5B7DB1", high: "#D4962A", urgent: "#C2453A" },
};

const dark: Palette = {
  bg: "#0C1120",
  surface: "#141B2D",
  surfaceAlt: "#1B2338",
  border: "#262F48",
  text: "#E8ECF4",
  textMuted: "#9AA4BA",
  textFaint: "#636E88",
  primary: "#F08B73",
  onPrimary: "#1B0F0B",
  primarySoft: "#3A2731",
  success: "#5DBB8A",
  danger: "#EF6F64",
  dangerSoft: "#3B2026",
  warning: "#F0B652",
  overlay: "rgba(0, 0, 0, 0.6)",
  shadow: "#000000",
  category: {
    personal: "#F08B73",
    work: "#7D9DD4",
    study: "#A58BE0",
    health: "#5DBB8A",
    home: "#F0B652",
  },
  priority: { low: "#636E88", medium: "#7D9DD4", high: "#F0B652", urgent: "#EF6F64" },
};

export const palettes: Record<Scheme, Palette> = { light, dark };

/** Colors for the animated sky (sun ↔ moon). Index 0 = day, 1 = night. */
export const sky = {
  background: ["#FFE6D2", "#151E36"] as const,
  sun: "#FFB547",
  sunGlow: "rgba(255, 181, 71, 0.16)",
  moon: "#F3E9C6",
  moonGlow: "rgba(243, 233, 198, 0.07)",
  star: "#FFFFFF",
  toggleTrack: ["#FFD8B0", "#243150"] as const,
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

export const fonts = {
  regular: "Cairo_400Regular",
  semibold: "Cairo_600SemiBold",
  bold: "Cairo_700Bold",
} as const;

export const type = {
  display: { fontSize: 44, lineHeight: 54, fontFamily: fonts.bold },
  title: { fontSize: 22, lineHeight: 32, fontFamily: fonts.bold },
  heading: { fontSize: 16, lineHeight: 24, fontFamily: fonts.bold },
  body: { fontSize: 14, lineHeight: 21, fontFamily: fonts.regular },
  bodyStrong: { fontSize: 14, lineHeight: 21, fontFamily: fonts.semibold },
  caption: { fontSize: 12, lineHeight: 18, fontFamily: fonts.regular },
  label: { fontSize: 11, lineHeight: 16, fontFamily: fonts.semibold },
} as const;

export type TypeVariant = keyof typeof type;

export const motion = { fast: 160, base: 260, theme: 650 } as const;
