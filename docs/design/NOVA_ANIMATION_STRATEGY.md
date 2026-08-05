# Nova Animation Strategy

## Goal

Nova should feel like an event-grade reveal system, not a fixed lucky-draw toy. The winner name is the hero. The animation exists to create anticipation, focus the room, and make the reveal feel branded for the event.

## Quality Standard

1. Purposeful motion: every moving layer supports anticipation, impact, or reveal.
2. Clear choreography: idle, build, hold, impact, reveal, settle.
3. Brand flexibility: event color changes the light architecture, palette temperature, and accent behavior.
4. Projection safety: deep tinted blacks, no pure white backgrounds, center-weighted action, large readable typography.
5. Restraint: negative space and a few hot highlights beat constant particle noise.
6. Accessibility: the reveal must still work with reduced motion.

## Current Direction

The implementation uses procedural canvas rendering plus a premium participant-pass reveal sequence. The scene is built from branded light planes, atmospheric particles, aperture rings, a brief blackout/impact moment, and large typographic reveal.

The card/pack reference is used as motion grammar, not as visual identity:

1. A stacked object creates anticipation.
2. Several ordinary entries pass quickly so the audience understands selection is happening.
3. The final entry receives stronger light, slower timing, and a “rare card” treatment.
4. The card dissolves into the winner name, keeping the winner as the hero.

For Lucky Draw this becomes event passes/cards instead of collectible cards. That keeps the satisfying reveal concept while staying appropriate for corporate dinners, launches, awards, summits, and formal company events.

## Theme Expansion Plan

Future theme controls should not be separate hardcoded animations. They should be profile inputs into the same stage system:

- `gala`: warm metal, formal, slower light planes, elegant rings.
- `summit`: cool glass, precise beams, restrained particles.
- `launch`: high-energy accent color, sharper flare, more kinetic field.
- `editorial`: monochrome, premium, large negative space, minimal sparkle.

The app currently only passes `primaryColor`, so Nova infers the profile from hue and saturation. A later branding UI can expose this as an explicit event taste preset without rewriting the animation.

## Research Notes

- Material motion guidance emphasizes natural easing, different durations for different distances, and slower treatment for larger screens.
- Apple HIG emphasizes purposeful motion, restraint, realistic feedback, and reduced-motion support.
- The local animation rubric adds projection-specific requirements: depth layers, strong contrast, negative space, disciplined color, and a real build/peak/resolve rhythm.
