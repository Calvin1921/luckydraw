# Animation Quality Rubric — Lucky Draw

Score each criterion 0-10. Total 70+ = professional. Below 50 = screensaver.

Companion doc: `ANIMATION_KNOWLEDGE.md` has implementation techniques for each criterion.

## The 10 Criteria

| # | Criterion | What to check | Amateur (0-3) | Pro (7-10) |
|---|-----------|---------------|---------------|------------|
| 1 | **Easing** | Are all transitions eased? Check velocity curves. | Linear motion, constant speed | Cubic/elastic easing, slow-in slow-out on every phase change |
| 2 | **Depth layers** | Count distinct z-planes visible simultaneously | 1-2 flat layers, everything same scale | 4+ layers: distant fog, mid particles, foreground bokeh, UI |
| 3 | **Contrast ratio** | Brightest visible element vs darkest | Everything mid-range (all 0.3-0.7) | Deep blacks + hot whites. Brightest 15-50x darkest visible |
| 4 | **Negative space** | % of frame that is empty/dark at any moment | Frame filled >70%, visual noise | 40%+ empty. Action in center 70% of frame |
| 5 | **Color discipline** | Count distinct hues | Rainbow / flat single color | 2-4 hues. Monochromatic + one accent = high-end |
| 6 | **Choreography** | Does motion have build / peak / resolve? | Constant activity, no phrasing | Clear rhythm: calm idle, building tension, impact, settle |
| 7 | **Size variance** | Particle size range (min to max) | Uniform size (all ~same) | 5x+ range. Many small, few large (power-law) |
| 8 | **Secondary motion** | Count supporting layers beyond primary action | One layer of motion only | 2+ layers: primary particles + ambient dust + glow pulse + trails |
| 9 | **Projection safety** | Tested for large dark venue? | Pure white (#fff), tiny elements, edge action | Tinted white (#ddd), min 1.5% frame height, center-weighted |
| 10 | **Organic feel** | Does it feel alive or mechanical? | Uniform distribution, constant density, no surprise | Clustering, turbulence, surge/recede, 2-3 happy accidents per cycle |

## Key Principles

### Light behaves like light
- Soft falloff (Gaussian, not hard edge)
- Inverse-square brightness decay
- Bloom only on the brightest elements, not everything
- God rays / volumetric scattering from point sources

### Depth sells cinema
- Depth of Field (DoF) with bokeh blur on distant particles
- Size attenuation (far = small, near = large)
- Atmospheric fog / haze at distance
- Foreground particles (large, soft, out of focus) framing the action

### Motion tells a story
- Every element moves for a reason (not random drift)
- Timing matters: fast = energy, slow = drama
- Secondary action: primary burst + trailing wisps + ambient dust
- Curl noise for organic motion, not sine waves

### The Uncanny Valley of Procedural
What makes procedural animation feel cheap:
- **Uniform randomness** — real phenomena cluster, gap, cluster
- **No secondary physics** — particles don't interact or cast light
- **Constant density** — real effects surge and recede
- **No happy accidents** — add 2-3 "surprise" behaviors per cycle

## Projection-Specific Rules
- Nothing smaller than ~1.5% of frame height (vanishes on projector)
- Lock 60fps. Drops to 45fps cause nausea at scale.
- Avoid pure white (#fff) — projector bloom makes it blinding. Peak at #ddd tinted.
- Slow base motion 30-50% vs laptop-optimized. Large screens amplify speed.
- Keep action in center 70%. Projector edges lose brightness and focus.
- Background never pure black (#000). Use deep tinted (#0a0a14) for spatial depth.
