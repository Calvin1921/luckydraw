# Lucky Draw — Design System

> **Last updated:** 2026-04-08
> **Source of truth:** Reverse-engineered from implementation. No Figma or external design tool.

---

## Design Philosophy

Dark-first, event industry aesthetic. The dashboard uses a near-black background with glass-morphism cards — professional but understated. The draw screens go full black for a theater effect, letting the animated themes be the visual centerpiece. Indigo (#6366f1) is the primary accent color.

---

## Color Tokens

Defined in `app/globals.css` as HSL CSS custom properties.

### Light Mode (`:root`)

| Token | HSL | Hex (approx) | Usage |
|-------|-----|------|-------|
| `--background` | 0 0% 100% | #ffffff | Page background |
| `--foreground` | 222.2 84% 4.9% | #030712 | Primary text |
| `--primary` | 239 84% 67% | #6366f1 | Buttons, links, focus rings |
| `--primary-foreground` | 210 40% 98% | #f8fafc | Text on primary |
| `--secondary` | 210 40% 96.1% | #f1f5f9 | Secondary bg |
| `--muted` | 210 40% 96.1% | #f1f5f9 | Muted backgrounds |
| `--muted-foreground` | 215.4 16.3% 46.9% | #64748b | Muted text |
| `--destructive` | 0 84.2% 60.2% | #ef4444 | Delete actions |
| `--border` | 214.3 31.8% 91.4% | #e2e8f0 | Borders |
| `--ring` | 239 84% 67% | #6366f1 | Focus rings |
| `--radius` | — | 0.5rem | Border radius base |

### Dark Mode (`.dark`)

| Token | HSL | Hex (approx) | Usage |
|-------|-----|------|-------|
| `--background` | 222.2 84% 4.9% | #030712 | Page background |
| `--foreground` | 210 40% 98% | #f8fafc | Primary text |
| `--primary` | 239 84% 67% | #6366f1 | Buttons, links |
| `--secondary` | 217.2 32.6% 17.5% | #1e293b | Secondary bg |
| `--muted` | 217.2 32.6% 17.5% | #1e293b | Muted backgrounds |
| `--muted-foreground` | 215 20.2% 65.1% | #94a3b8 | Muted text |
| `--destructive` | 0 62.8% 30.6% | #7f1d1d | Delete (dark variant) |
| `--border` | 217.2 32.6% 17.5% | #1e293b | Borders |
| `--ring` | 224.3 76.3% 48% | #2563eb | Focus rings |

**Note:** Dashboard uses `bg-gray-950` (hardcoded near-black) rather than the CSS variable system. Dark mode class is not toggled — the app is dark-only in practice.

---

## Typography

- **Font:** Inter (Google Fonts, Latin subset) — loaded in `app/layout.tsx`
- **No CJK font loaded** — Traditional Chinese names render in system fallback (PingFang, Noto Sans CJK)
- **Scale:**
  - Page titles: `text-3xl font-bold`
  - Section headings: `text-xl font-semibold`
  - Labels: `text-sm font-medium text-white/60`
  - Helper text: `text-white/40 text-sm`
  - Body: default (1rem / 16px)

---

## Component Patterns

### Cards (glass-morphism)

```
rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition
```

Used for: event list items, setup checklist steps, prize tier containers.
Interior padding: `p-5` or `p-6`.

### Buttons

| Variant | Classes |
|---------|---------|
| Primary | `bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg px-4 py-2 transition` |
| Secondary | `bg-white/10 hover:bg-white/20 text-white rounded-lg px-4 py-2 transition` |
| Destructive | `text-red-400 hover:bg-red-500/10 rounded-lg p-1 transition` |
| DRAW (remote) | `w-52 h-52 rounded-full bg-gradient-to-br from-[primaryColor] to-[primaryColor]/70 text-white text-2xl font-bold` |

### Status Badges

```
text-xs px-2.5 py-1 rounded-full
```

| Status | Colors |
|--------|--------|
| Active | `bg-green-500/20 text-green-400` |
| Draft | `bg-yellow-500/20 text-yellow-400` |
| Completed | `bg-gray-500/20 text-gray-400` |

**A11Y issue:** Color is the only differentiator (A11Y-001). Needs icons or text patterns.

### Form Inputs

```
px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white
placeholder:text-white/30 focus:outline-none focus:border-indigo-500
```

**A11Y issue:** `focus:outline-none` suppresses keyboard focus indicators (A11Y-003).

### Layout

| Element | Pattern |
|---------|---------|
| Content container | `max-w-5xl mx-auto px-6 py-8` |
| Nav bar | `border-b border-white/10 px-6 py-4 flex items-center justify-between` |
| Back link | `inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-6` |
| Draw stage | `min-h-screen bg-black` (should be `min-h-[100dvh]` per RISK-002) |

### Loading States

```
min-h-screen flex items-center justify-center
```

Spinner: `w-10 h-10 rounded-full border-4 border-t-transparent animate-spin`
Border color: gradient using event's `primaryColor`.
Text: "Loading...", "Connecting...", "Setting up draw session..."

### Empty States

Pattern: centered text with low opacity + optional emoji.

```
text-center py-16 text-white/30
```

- No events: "No events yet. Create your first lucky draw event to get started."
- No participants: "No participants yet. Import a CSV or add manually."
- No prizes: Dashed border box with emoji + "No rounds yet."
- Draw complete: Spring-animated emoji + "All prizes awarded!"

---

## Draw Themes

| Theme | Renderer | Visual Style | Duration | Colors |
|-------|----------|-------------|----------|--------|
| Galaxy | React Three Fiber (WebGL) | Star field nebula, supernova reveal | 5.9s | Indigo/purple/white |
| Lucky Balls | Canvas 2D | HK lottery drum, ball drop reveal | 5.1s | 10 vibrant colors |
| Crystal Oracle | React Three Fiber (WebGL) | Glass sphere, shard burst reveal | 5.1s | Teal/violet |
| Cyber | Canvas 2D | Matrix rain, character decode reveal | 4.3s | Green (#00ff41) on black |

Theme config: `components/draw/themes.ts`
Theme components: `components/draw/themes/{Galaxy,LuckyBalls,Crystal,Cyber}Draw.tsx`

### WinnerCard Particle Effects

Each theme has a matching particle effect on the WinnerCard overlay:
- **Galaxy:** Confetti burst (rect/circle/triangle, physics-based gravity + wind)
- **Lucky Balls:** Fireworks (rockets + star clusters)
- **Crystal / Cyber:** Lightning bolts (segmented with glow)

Implementation: Canvas 2D + requestAnimationFrame in `components/draw/WinnerCard.tsx` (624 lines).

---

## Icons

Library: `lucide-react` (tree-shakeable)

Commonly used: `PlusIcon`, `Users`, `Trophy`, `Palette`, `CheckCircle2`, `Circle`, `ChevronRight`, `ExternalLink`, `Download`, `Trash2`, `ArrowLeft`

---

## Known Design Debt

| Issue | Impact | Fix |
|-------|--------|-----|
| No CJK font loaded | Chinese names use system fallback — inconsistent rendering across platforms | Add Noto Sans TC / Noto Sans HK to font stack |
| No breadcrumb navigation | Dashboard sub-pages are dead ends (UX-C1) | Add breadcrumbs to dashboard layout |
| Focus rings suppressed | Keyboard navigation invisible (A11Y-003) | Replace `focus:outline-none` with `focus:outline-2 focus:outline-indigo-500 focus:outline-offset-2` |
| Low contrast text | `text-white/25`, `/30`, `/40` all fail WCAG 4.5:1 (A11Y-002) | Minimum `text-white/50` for readable content, full white for important text |
| No dark/light toggle | Dashboard is dark-only despite CSS variable system existing | Intentional for event industry aesthetic — not a bug |
| No component library | All patterns are inline Tailwind — no reusable Button, Card, Input components | Extract to shared components if codebase grows |
| Touch targets too small | Trash buttons ~24px (A11Y-004) | Change `p-1` to `p-3` on icon-only buttons |
| `min-h-screen` on mobile | Browser chrome hides bottom content on iOS Safari (RISK-002) | Use `min-h-[100dvh]` |
