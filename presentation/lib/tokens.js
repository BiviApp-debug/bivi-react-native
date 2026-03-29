// ─── BIVI BRAND TOKENS — Light Theme (Premium Enterprise) ─────────────────────
// Source of truth for all colors. Never use raw hex values outside this file.

export const COLORS = {
  // Core palette
  primary:      "#F11B67",   // CTA, main buttons
  primaryHover: "#D3155B",   // Button hover
  primarySoft:  "#FF4D8D",   // Highlights / badges
  accent:       "#901A6A",   // Secondary elements

  // Gradient accent (hero, charts, highlights only)
  gradStart:    "#3F228B",
  gradMid:      "#331C6E",
  gradEnd:      "#281654",

  // Light UI surfaces
  background:   "#F5F3FF",   // Page background (very light purple tint)
  surface:      "#FFFFFF",   // Cards / containers (white)
  surfaceBorder:"#E8E5F0",   // Card borders (subtle light purple-grey)

  // Typography
  text:         "#1E1245",   // Primary text (deep purple)
  muted:        "#7B72A8",   // Secondary text (medium purple)
  white:        "#FFFFFF",

  // Legacy kept for compatibility
  yellow:       "#E5F23D",   // Bee Yellow — reward accents
};

// Shorthand aliases
export const M = COLORS.primary;
export const B = COLORS.gradStart;
export const Y = COLORS.yellow;
export const P = COLORS.gradEnd;
export const W = COLORS.white;
export const TEXT = COLORS.text;
export const MUTED = COLORS.muted;
export const SURFACE = COLORS.surface;
export const BG = COLORS.background;
export const BORDER = COLORS.surfaceBorder;
export const ACCENT = COLORS.accent;
export const PRIMARY_SOFT = COLORS.primarySoft;
export const PRIMARY_HOVER = COLORS.primaryHover;
export const GRAD_MID = COLORS.gradMid;
export const GRAD_END = COLORS.gradEnd;

// Legacy aliases
export const G1 = COLORS.background;
export const G2 = COLORS.surfaceBorder;
