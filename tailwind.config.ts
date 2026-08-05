import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Semantic surface tokens ──────────────────────────────────────────
        // Use these instead of raw Tailwind colors in components.
        // bg-app         → page background
        // bg-warm        → slightly lifted background variant
        // surface        → card/panel base (translucent)
        // surface-hover  → card hover state
        // surface-raised → elevated card (modals, dropdowns)
        "bg-app": "var(--bg)",
        "bg-warm": "var(--bg-warm)",
        surface: "var(--surface)",
        "surface-hover": "var(--surface-hover)",
        "surface-raised": "var(--surface-raised)",

        // ─── Border tokens ────────────────────────────────────────────────────
        "border-default": "var(--border)",
        "border-hover": "var(--border-hover)",

        // ─── Text tokens ──────────────────────────────────────────────────────
        "text-base": "var(--text)",
        "text-muted": "var(--text-muted)",
        "text-dim": "var(--text-dim)",

        // ─── Accent / brand ───────────────────────────────────────────────────
        // --accent is the design system gold (#e2a84b).
        // Per-event primaryColor overrides this via inline style — not Tailwind.
        "text-accent": "var(--accent)",
        "bg-accent": "var(--accent)",
        "bg-accent-glow": "var(--accent-glow)",
        "bg-accent-subtle": "var(--accent-subtle)",

        // ─── Semantic status tokens ───────────────────────────────────────────
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        blue: "var(--blue)",

        // ─── shadcn/ui compatibility ──────────────────────────────────────────
        // These HSL-based tokens are kept so any installed shadcn components
        // continue to resolve. They forward to the new system where possible.
        border: "hsl(var(--border-hsl))",
        input: "hsl(var(--input-hsl))",
        ring: "hsl(var(--ring-hsl))",
        background: "hsl(var(--background-hsl))",
        foreground: "hsl(var(--foreground-hsl))",
        primary: {
          // Maps to accent gold — also the default event primaryColor.
          DEFAULT: "hsl(var(--primary-hsl))",
          foreground: "hsl(var(--primary-foreground-hsl))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary-hsl))",
          foreground: "hsl(var(--secondary-foreground-hsl))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive-hsl))",
          foreground: "hsl(var(--destructive-foreground-hsl))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted-hsl))",
          foreground: "hsl(var(--muted-foreground-hsl))",
        },
        accent: {
          // shadcn "accent" slot reused as surface-hover equivalent
          DEFAULT: "hsl(var(--accent-bg-hsl))",
          foreground: "hsl(var(--accent-foreground-hsl))",
        },
        card: {
          DEFAULT: "hsl(var(--card-hsl))",
          foreground: "hsl(var(--card-foreground-hsl))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover-hsl))",
          foreground: "hsl(var(--popover-foreground-hsl))",
        },
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      fontFamily: {
        // These map to CSS variables set in layout.tsx via next/font/google.
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        zh: ["var(--font-zh)", "var(--font-body)", "sans-serif"],
      },

      keyframes: {
        // Accordion (shadcn/ui)
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Entrance animations — used with stagger via CSS custom property index
        fadeSlideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseGold: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },

      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-slide-up": "fadeSlideUp 0.4s ease-out both",
        "fade-in": "fadeIn 0.3s ease-out both",
        shimmer: "shimmer 2s linear infinite",
        "pulse-gold": "pulseGold 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
