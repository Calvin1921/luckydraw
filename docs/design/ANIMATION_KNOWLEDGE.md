# Animation Knowledge Base — Lucky Draw

Technical reference for building cinematic WebGL particle animations on large-screen projection.

---

## Part 1: Particle Rendering Techniques

### Soft Sprite Texture (replace hard gl_Points circles)
Generate a radial gradient texture on a canvas, sample it via `gl_PointCoord`:

```glsl
// Fragment shader
uniform sampler2D uSprite;
void main() {
  vec4 texel = texture2D(uSprite, gl_PointCoord);
  gl_FragColor = vec4(vColor, texel.r * vAlpha);
}
```

```js
// JS: generate 64x64 soft glow texture
function createGlowTexture(size = 64) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.2, 'rgba(255,255,255,0.8)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.25)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}
```

Why: hard-edged discard circles look digital. Soft Gaussian falloff lets additive blending create natural light overlap.

### Curl Noise in GLSL (organic motion)
Divergence-free vector field derived from simplex noise. Particles swirl like fluid:

```glsl
vec3 snoiseVec3(vec3 x) {
  float s  = snoise(vec3(x));
  float s1 = snoise(vec3(x.y - 19.1, x.z + 33.4, x.x + 47.2));
  float s2 = snoise(vec3(x.z + 74.2, x.x - 124.5, x.y + 99.4));
  return vec3(s, s1, s2);
}

vec3 curlNoise(vec3 p) {
  const float e = 0.1;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);
  vec3 p_x0 = snoiseVec3(p - dx);
  vec3 p_x1 = snoiseVec3(p + dx);
  vec3 p_y0 = snoiseVec3(p - dy);
  vec3 p_y1 = snoiseVec3(p + dy);
  vec3 p_z0 = snoiseVec3(p - dz);
  vec3 p_z1 = snoiseVec3(p + dz);
  float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
  float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
  float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;
  return normalize(vec3(x, y, z) / (2.0 * e));
}
```

Use: `pos += curlNoise(pos * 0.5 + uTime * 0.1) * delta * strength;`

### Accumulation Buffer Trails
Don't clear the frame fully. Render a semi-transparent dark quad over the previous frame:

```js
// Fade material: low opacity = long trails
const fadeMat = new THREE.MeshBasicMaterial({
  color: 0x000000, transparent: true, opacity: 0.05
})
// Render: fadeMesh → particles → copy to screen
```

### Noise-Based Color Variation
```glsl
float n = snoise(vec3(aParticleId * 0.1, uTime * 0.2, 0.0));
vec3 color = mix(colorWarm, colorCool, smoothstep(-1.0, 1.0, n));
```

Time offset creates slow color drift. Avoid static random assignment.

---

## Part 2: Post-Processing Stack

### Effect Order (matters)
```
EffectComposer
  1. GodRays        — volumetric light from core
  2. Bloom          — selective, high threshold
  3. DepthOfField   — bokeh blur at distance
  4. ChromaticAberr — subtle RGB split
  5. Vignette       — edge darkening
  6. Noise          — film grain
  7. ToneMapping    — ACES Filmic
```

DoF after Bloom so it blurs the glow naturally.

### God Rays Setup
```jsx
<GodRays
  sun={coreMeshRef.current}    // actual mesh ref
  blendFunction={BlendFunction.SCREEN}
  samples={60}
  density={0.97}
  decay={0.96}
  weight={0.6}
  exposure={0.4}
  clampMax={1}
/>
```

### Depth of Field
```jsx
<DepthOfField
  focusDistance={0}       // 0-1 normalized
  focalLength={0.02}     // smaller = shallower
  bokehScale={2}         // bokeh disc size
  height={480}           // render height (perf)
/>
```

---

## Part 3: Animation Timing

### Timing Curves (cubic-bezier)
| Name | Curve | Use | Duration |
|------|-------|-----|----------|
| **Snap** | `(0.2, 0, 0, 1)` | Elements slamming into place | 250-350ms |
| **Breathe** | `(0.4, 0, 0.6, 1)` + sine | Idle floating, gentle pulse | 2000-4000ms/cycle |
| **Whip** | `(0.8, 0, 0.2, 1)` | State transitions, camera swoops | 400-600ms |
| **Anticipation-overshoot** | Pull back 10-15% (120ms) then overshoot 8% and settle (500ms) | Hero element reveal | ~620ms total |

### Stagger Patterns
- **Accelerating**: `delay(i) = baseDelay * (i ^ 1.4)`. With base=40ms, 8 items: 0, 40, 106, 186, 278, 381, 494, 616ms
- **Fibonacci**: 0, 30, 30, 60, 90, 150, 240, 390ms
- **Distance-based**: `delay = dist_from_center * 2.5ms + random(0, 40ms)`

### Tension/Release
- **The Hold**: freeze ALL motion for **150-250ms** before reveal. Scale focal element down 2-3% (compression/inhale).
- **Screen shake**: `sin(t * 30) * amplitude * e^(-t*8)` for 200-300ms
- **Color temp shift**: cool (6500K blue) → warm (4000K gold) over 400-600ms, starting 100ms before reveal
- **Flash frame**: 1 frame (16ms) max brightness, then main animation fires

### The Disney Moment (Emotional Pause)
- **200ms** for quick beat (surprise, comedy)
- **350-400ms** for dramatic weight (reveal, triumph)
- During hold: everything stops EXCEPT one subtle element (single particle drift, slow camera push 1-2%). Total stillness = bug. Near-stillness = intention.

### Layered Choreography (Master Timeline)
Lead with environment, follow with subject, finish with decoration:

| Layer | Offset | Duration |
|-------|--------|----------|
| Camera push in | +0ms | 800ms |
| Lighting cool→warm | +50ms | 600ms |
| Particle burst | +300ms | 1000ms |
| **Hold/pause** | +300ms | 200ms |
| Hero element (winner name) | +500ms | 500ms |
| Text stagger reveal | +650ms | 400ms |
| Secondary particles (sparkle) | +700ms | 800ms |

---

## Part 4: Projection-Specific Rules

### Scale Multipliers (laptop → 15ft projection)
| Parameter | Laptop | Projection | Multiplier |
|-----------|--------|------------|------------|
| Animation duration | 300ms | 500-600ms | 1.5-2x |
| Min particle size | 0.5% frame height | 2-3% frame height | 4-6x |
| Camera/scroll speed | 100% | 30-50% | 0.3-0.5x |
| Min text size | 2% frame height | 5-7% frame height | 2.5-3.5x |
| Min line weight | 1px at 1080p | 4-6px at 1080p | 4-6x |

### Color and Brightness
- Design for **gamma 2.4-2.6** (not 2.2) for dark venues
- Cap brightness at **85-90%** — no pure white (#fff). Use #ddd or tinted.
- Background: never pure black. Use tinted deep color (#0a0a14) for spatial depth.
- Keep critical content within **15:1 contrast ratio** against background.
- Add **3-5% noise overlay** to break gradient banding on projectors.

### Composition
- Keep action in **center 70%** of frame. Projector edges lose brightness and focus.
- Use **negative space**: 40%+ of frame should be empty/dark at any moment.
- Design for **32:9 or wider** if targeting ultrawide LED walls.

### The "Wow Moment" Layer Stack (Apple/Oscars pattern)
1. **Background**: slow volumetric environment (15-30s loop)
2. **Silence before storm**: 1-2s of near-darkness/stillness before burst
3. **Mid-ground**: reveal element scales from 0 → 120% → settle to 100% (800-1200ms)
4. **Light flare**: anamorphic bloom timed to apex (200-400ms burst, not persistent)
5. **Typography**: appears 200-400ms AFTER visual peak. Bold/heavy, wide tracking, opacity + Y-rise entry.
6. **Foreground**: subtle vignette + edge particles (10-15% opacity)

### Common Mistakes
- Thin fonts / fine detail (disappear or alias at projection scale)
- Fast cuts <500ms (read as glitches)
- White backgrounds (blinding, washes out stage)
- Content centered in small area (wastes immersive width)
- Subtle gradients without dithering (posterize/band on projectors)
- Assuming 60fps (many projection systems run 30fps)

---

## Part 5: Multi-Layer Particle Architecture

A cinematic particle system needs 3-5 layers, not one:

| Layer | Count | Size | Opacity | Blur | Purpose |
|-------|-------|------|---------|------|---------|
| **Distant fog** | 500 | Large (4-8%) | 5-15% | DoF blurred | Atmospheric depth |
| **Mid-field** | 6000 | Medium (1-3%) | 30-60% | Sharp | Main visual mass |
| **Near sparkles** | 200 | Small-medium (1-2%) | 60-100% | Slight DoF | Foreground depth cue |
| **Hot sparkles** | 50 | Tiny (0.5-1%) | 100% | Sharp + bloomed | High-contrast accents |
| **Core glow** | 1 mesh | Large | Animated | God rays | Focal light source |

Each layer has independent motion parameters (speed, curl noise scale, color palette).
