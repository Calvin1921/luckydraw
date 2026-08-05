/**
 * Lucky Draw Design Tokens
 *
 * Single source of truth for design values that must be used in both:
 *   1. Tailwind utility classes (via tailwind.config.ts CSS variable references)
 *   2. Inline styles (style={{ background: tokens.accent }}) for canvas/Three.js
 *      components and per-event color overrides
 *
 * Rule: CSS variables are the runtime authority. These constants are the
 * build-time / TypeScript authority. Keep them in sync manually — they are
 * NOT auto-generated from CSS.
 *
 * Per-event overrides: components accept a `primaryColor` prop (hex string)
 * that overrides `tokens.accent` at runtime. This system token is the DEFAULT
 * shown when no event-specific color has been configured.
 */

// ─── Color tokens ──────────────────────────────────────────────────────────

export const colors = {
  // Backgrounds
  bg: "#0b0a0f",
  bgWarm: "#0e0d13",

  // Surfaces (translucent — use rgba strings in style props)
  surface: "rgba(255,255,255,0.03)",
  surfaceHover: "rgba(255,255,255,0.06)",
  surfaceRaised: "rgba(255,255,255,0.05)",

  // Borders
  border: "rgba(255,255,255,0.06)",
  borderHover: "rgba(255,255,255,0.12)",

  // Text
  text: "#ede9e3",
  textMuted: "rgba(237,233,227,0.65)",
  textDim: "rgba(237,233,227,0.45)",

  // Accent / brand gold — the design system default event color
  accent: "#e2a84b",
  accentGlow: "rgba(226,168,75,0.2)",
  accentSubtle: "rgba(226,168,75,0.08)",

  // Status
  success: "#5ec269",
  warning: "#d4a853",
  danger: "#d45555",
  blue: "#5b8def",
} as const;

// ─── Spacing scale (rem) ───────────────────────────────────────────────────
// Matches Tailwind's default 4px base grid. Use for inline style calculations
// in canvas or animated components where Tailwind classes are unavailable.

export const spacing = {
  0: "0",
  1: "0.25rem",   //  4px
  2: "0.5rem",    //  8px
  3: "0.75rem",   // 12px
  4: "1rem",      // 16px
  5: "1.25rem",   // 20px
  6: "1.5rem",    // 24px
  8: "2rem",      // 32px
  10: "2.5rem",   // 40px
  12: "3rem",     // 48px
  16: "4rem",     // 64px
  20: "5rem",     // 80px
  24: "6rem",     // 96px
} as const;

// ─── Border radius ─────────────────────────────────────────────────────────

export const radius = {
  sm: "0.375rem",   //  6px — inputs, badges
  md: "0.5rem",     //  8px — buttons, small cards
  lg: "0.625rem",   // 10px — base radius (--radius)
  xl: "0.875rem",   // 14px — large cards
  "2xl": "1rem",    // 16px — modals
  full: "9999px",   //        pills, chips
} as const;

// ─── Font families ─────────────────────────────────────────────────────────
// These CSS variable references are populated at runtime by next/font in
// layout.tsx. Fallbacks are provided for SSR and storybook environments.

export const fontFamilies = {
  display: "var(--font-display, Georgia, serif)",
  body: "var(--font-body, system-ui, sans-serif)",
  zh: "var(--font-zh, var(--font-body, system-ui, sans-serif))",
} as const;

// ─── Animation durations ───────────────────────────────────────────────────

export const duration = {
  fast: 150,    // ms — micro-interactions (button press)
  base: 250,    // ms — standard transitions
  slow: 400,    // ms — entrance animations
  slower: 600,  // ms — modal/overlay transitions
} as const;

// ─── Stagger helper ────────────────────────────────────────────────────────
// Returns inline style to be combined with the .stagger-item CSS class.
// Usage:
//   <div className="stagger-item" style={staggerStyle(index)}>
//     ...
//   </div>

export function staggerStyle(index: number): React.CSSProperties {
  return {
    "--stagger-index": String(index),
  } as React.CSSProperties;
}

// ─── Convenience: alpha variant of any hex color ───────────────────────────
// Useful for building per-event glow/shadow strings inline.
// hex must be 6-char hex (without #), e.g. hexAlpha("e2a84b", 0.2)

export function hexAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${clean}${a}`;
}

// ─── Convenience: CSS variable reference ──────────────────────────────────
// For use in style props when you want to reference a token by name.
// Usage: style={{ color: cssVar("accent") }}

export function cssVar(token: string): string {
  return `var(--${token})`;
}

// ─── Type exports ──────────────────────────────────────────────────────────

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radius;

// ─── Default export: grouped tokens object ─────────────────────────────────

const tokens = {
  colors,
  spacing,
  radius,
  fontFamilies,
  duration,
} as const;

export default tokens;
