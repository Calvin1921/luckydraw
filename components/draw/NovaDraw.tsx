"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { useReducedMotion } from "@/lib/hooks"

interface DrawThemeProps {
  participants: Array<{ _id: string; name: string; nameZh: string | null }>
  winner: { _id: string; name: string; nameZh: string | null } | null
  isSpinning: boolean
  prizeName?: string | null
  primaryColor: string
  onComplete: () => void
}

type Rgb = { r: number; g: number; b: number }
type Hsl = { h: number; s: number; l: number }

type Palette = {
  base: Rgb
  deep: Rgb
  ink: Rgb
  accent: Rgb
  secondary: Rgb
  highlight: Rgb
  white: Rgb
  temperature: number
  architecture: "gala" | "summit" | "launch" | "editorial"
}

type Particle = {
  angle: number
  radius: number
  depth: number
  size: number
  alpha: number
  speed: number
  drift: number
  lane: number
  colorMix: number
}

type CeremonyState = {
  field: number
  gather: number
  blackout: number
  compression: number
  impact: number
  reveal: number
  afterglow: number
  camera: number
}

const DRAW_DURATION_MS = 6200
const REVEAL_AT_MS = 3320
const PROJECTION_WHITE: Rgb = { r: 226, g: 222, b: 214 }
const WARM_METAL: Rgb = { r: 232, g: 186, b: 116 }
const COOL_GLASS: Rgb = { r: 132, g: 197, b: 228 }
const MAGENTA_LIGHT: Rgb = { r: 214, g: 112, b: 190 }

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function lerp(a: number, b: number, amount: number) {
  return a + (b - a) * amount
}

function easeInOut(value: number) {
  const t = clamp(value)
  return t * t * (3 - 2 * t)
}

function hexToRgb(hex: string): Rgb {
  const clean = hex.replace("#", "").trim()
  const normalized = clean.length === 3
    ? clean.split("").map(char => char + char).join("")
    : clean.padEnd(6, "0").slice(0, 6)

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16) || 0,
    g: Number.parseInt(normalized.slice(2, 4), 16) || 0,
    b: Number.parseInt(normalized.slice(4, 6), 16) || 0,
  }
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min

  if (d === 0) return { h: 0, s: 0, l }

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
  if (max === gn) h = (bn - rn) / d + 2
  if (max === bn) h = (rn - gn) / d + 4

  return { h: h * 60, s, l }
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hue = (((h % 360) + 360) % 360) / 360
  if (s === 0) {
    const gray = Math.round(l * 255)
    return { r: gray, g: gray, b: gray }
  }

  const hueToRgb = (p: number, q: number, tValue: number) => {
    let t = tValue
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    r: Math.round(hueToRgb(p, q, hue + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, hue) * 255),
    b: Math.round(hueToRgb(p, q, hue - 1 / 3) * 255),
  }
}

function mixRgb(a: Rgb, b: Rgb, amount: number): Rgb {
  const t = clamp(amount)
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t)),
  }
}

function rgba(color: Rgb, alpha: number) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${clamp(alpha)})`
}

function createRandom(seed: number) {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function fitTextSize(text: string, base: number) {
  if (text.length <= 4) return base
  if (text.length <= 8) return base * 0.92
  if (text.length <= 14) return base * 0.8
  if (text.length <= 22) return base * 0.64
  return base * 0.52
}

function resetState(state: CeremonyState) {
  state.field = 0.22
  state.gather = 0
  state.blackout = 0
  state.compression = 0
  state.impact = 0
  state.reveal = 0
  state.afterglow = 0
  state.camera = 0
}

function buildPalette(primaryColor: string): Palette {
  const base = hexToRgb(primaryColor)
  const hsl = rgbToHsl(base)
  const saturated = hslToRgb({ h: hsl.h, s: Math.max(0.58, hsl.s), l: 0.52 })
  const deep = hslToRgb({ h: hsl.h + 8, s: Math.min(0.78, Math.max(0.38, hsl.s)), l: 0.12 })
  const ink = hslToRgb({ h: hsl.h + 18, s: Math.min(0.58, hsl.s + 0.16), l: 0.035 })
  const temperature = hsl.h < 70 || hsl.h > 330 ? 1 : hsl.h > 170 && hsl.h < 255 ? 0 : 0.45
  const secondary = temperature > 0.7
    ? mixRgb(WARM_METAL, saturated, 0.24)
    : temperature < 0.2
      ? mixRgb(COOL_GLASS, saturated, 0.28)
      : mixRgb(MAGENTA_LIGHT, saturated, 0.18)
  const architecture =
    hsl.s < 0.22 ? "editorial" :
    hsl.h >= 35 && hsl.h <= 76 ? "gala" :
    hsl.h >= 165 && hsl.h <= 240 ? "summit" :
    hsl.h >= 250 && hsl.h <= 326 ? "launch" :
    "editorial"

  return {
    base: saturated,
    deep,
    ink,
    accent: mixRgb(saturated, PROJECTION_WHITE, 0.2),
    secondary,
    highlight: mixRgb(PROJECTION_WHITE, secondary, 0.16),
    white: PROJECTION_WHITE,
    temperature,
    architecture,
  }
}

function makeParticles(seed: number): Particle[] {
  const random = createRandom(seed + 401)
  return Array.from({ length: 520 }, () => {
    const depth = Math.pow(random(), 1.9)
    return {
      angle: random() * Math.PI * 2,
      radius: 0.12 + Math.pow(random(), 0.58) * 0.92,
      depth,
      size: 0.0018 + Math.pow(random(), 5.2) * 0.014 + depth * 0.002,
      alpha: 0.06 + Math.pow(random(), 2) * 0.34,
      speed: 0.000055 + random() * 0.00018,
      drift: random() * Math.PI * 2,
      lane: random(),
      colorMix: random(),
    }
  })
}

function drawSoftDisc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: Rgb,
  alpha: number,
) {
  if (radius <= 0 || alpha <= 0) return
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
  gradient.addColorStop(0, rgba(color, alpha))
  gradient.addColorStop(0.22, rgba(color, alpha * 0.42))
  gradient.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, palette: Palette, state: CeremonyState, time: number) {
  const camera = 1 + state.camera * 0.025 - state.compression * 0.018
  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.scale(camera, camera)
  ctx.translate(-width / 2, -height / 2)

  const base = ctx.createLinearGradient(0, 0, width, height)
  base.addColorStop(0, rgba(mixRgb(palette.ink, palette.deep, 0.35), 1))
  base.addColorStop(0.48, rgba(palette.ink, 1))
  base.addColorStop(1, rgba(mixRgb(palette.deep, { r: 1, g: 2, b: 8 }, 0.5), 1))
  ctx.fillStyle = base
  ctx.fillRect(0, 0, width, height)

  const centerX = width / 2
  const centerY = height * 0.48
  const ambient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) * 0.72)
  ambient.addColorStop(0, rgba(palette.base, 0.15 + state.field * 0.16 + state.reveal * 0.2))
  ambient.addColorStop(0.28, rgba(palette.secondary, 0.08 + state.afterglow * 0.14))
  ambient.addColorStop(0.72, rgba(palette.deep, 0.16))
  ambient.addColorStop(1, rgba(palette.ink, 0))
  ctx.fillStyle = ambient
  ctx.fillRect(0, 0, width, height)

  const horizonY = height * (0.68 + Math.sin(time * 0.00018) * 0.015)
  const horizon = ctx.createLinearGradient(0, horizonY - height * 0.18, 0, horizonY + height * 0.18)
  horizon.addColorStop(0, rgba(palette.secondary, 0))
  horizon.addColorStop(0.52, rgba(palette.secondary, 0.045 + state.field * 0.08))
  horizon.addColorStop(1, rgba(palette.base, 0))
  ctx.fillStyle = horizon
  ctx.fillRect(0, horizonY - height * 0.22, width, height * 0.44)

  ctx.restore()
}

function drawLightArchitecture(ctx: CanvasRenderingContext2D, width: number, height: number, palette: Palette, state: CeremonyState, time: number) {
  const centerX = width / 2
  const centerY = height * 0.5
  const minSide = Math.min(width, height)
  const breathe = Math.sin(time * 0.00055) * 0.5 + 0.5
  const intensity = 0.08 + state.field * 0.18 + state.gather * 0.1 + state.reveal * 0.2 + state.afterglow * 0.16
  const squeeze = 1 - state.compression * 0.2

  ctx.save()
  ctx.globalCompositeOperation = "lighter"
  ctx.filter = `blur(${Math.max(10, minSide * 0.012)}px)`

  for (let i = 0; i < 5; i += 1) {
    const side = i % 2 === 0 ? -1 : 1
    const offset = (i - 2) * width * 0.065
    const drift = Math.sin(time * 0.00024 + i) * width * 0.016
    const alpha = intensity * (0.42 - i * 0.035)
    const topSpread = palette.architecture === "summit" ? 0.09 : palette.architecture === "launch" ? 0.2 : 0.14

    ctx.beginPath()
    ctx.moveTo(centerX + side * width * (topSpread + i * 0.035) + offset, -height * 0.04)
    ctx.lineTo(centerX + side * width * (topSpread + 0.18 + i * 0.025) + offset, -height * 0.04)
    ctx.lineTo(centerX + drift + side * minSide * (0.08 + i * 0.02) * squeeze, height * 1.04)
    ctx.lineTo(centerX + drift - side * minSide * (0.04 + i * 0.018) * squeeze, height * 1.04)
    ctx.closePath()
    ctx.fillStyle = rgba(i % 3 === 0 ? palette.secondary : palette.base, alpha)
    ctx.fill()
  }

  const apertureRadius = minSide * (0.18 + state.gather * 0.1 + state.impact * 0.42 + state.reveal * 0.26)
  drawSoftDisc(ctx, centerX, centerY, apertureRadius * (1.6 + breathe * 0.08), palette.base, 0.08 + state.afterglow * 0.12)
  drawSoftDisc(ctx, centerX, centerY, apertureRadius, palette.highlight, 0.05 + state.impact * 0.18 + state.reveal * 0.08)

  ctx.filter = "none"
  ctx.lineWidth = Math.max(1, minSide * 0.002)
  ctx.strokeStyle = rgba(palette.highlight, 0.08 + state.gather * 0.13)

  const ringCount = palette.architecture === "editorial" ? 3 : 5
  for (let i = 0; i < ringCount; i += 1) {
    const radius = minSide * (0.2 + i * 0.085 + state.gather * 0.015 + state.impact * 0.06)
    ctx.beginPath()
    ctx.ellipse(centerX, centerY, radius * (1.88 + i * 0.04), radius * (0.36 + i * 0.025), Math.sin(time * 0.00018 + i) * 0.06, Math.PI * 1.04, Math.PI * 1.96)
    ctx.stroke()
  }

  ctx.restore()
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: Palette,
  particles: Particle[],
  state: CeremonyState,
  time: number,
) {
  const centerX = width / 2
  const centerY = height * 0.49
  const minSide = Math.min(width, height)
  const gather = easeInOut(state.gather)
  const impact = state.impact
  const revealFade = 1 - state.reveal * 0.62
  const blackoutFade = 1 - state.blackout * 0.52

  ctx.save()
  ctx.globalCompositeOperation = "lighter"

  for (const particle of particles) {
    const layerScale = lerp(0.38, 1.18, particle.depth)
    const orbit = particle.angle + time * particle.speed * (1 + state.field * 2.2 + state.impact * 4)
    const calmRadius = particle.radius * minSide * 0.74 * layerScale
    const gatherRadius = minSide * (0.035 + particle.depth * 0.11 + Math.abs(particle.lane - 0.5) * 0.05)
    const burstRadius = calmRadius * (1.08 + particle.depth * 0.7)
    const radius = lerp(lerp(calmRadius, gatherRadius, gather), burstRadius, impact)
    const laneCurve = Math.sin(particle.lane * Math.PI * 2 + time * 0.00033)
    const x = centerX + Math.cos(orbit) * radius + laneCurve * minSide * 0.035 * gather
    const y = centerY + Math.sin(orbit + particle.drift) * radius * (0.24 + particle.depth * 0.28)
      - state.compression * minSide * 0.015
    const twinkle = 0.72 + Math.sin(time * 0.002 + particle.drift) * 0.28
    const color = particle.colorMix > 0.72 ? palette.highlight : particle.colorMix > 0.38 ? palette.secondary : palette.accent
    const size = Math.max(minSide * 0.0038, particle.size * minSide * (1 + gather * 1.05 + impact * 3.2))
    const alpha = particle.alpha * twinkle * revealFade * blackoutFade * (0.44 + state.field * 0.9 + gather * 0.34)

    if (particle.depth > 0.94 || impact > 0.08) {
      drawSoftDisc(ctx, x, y, size * (1.9 + impact * 1.4), color, alpha * 0.16)
    }

    if (particle.colorMix > 0.82) {
      const streak = size * (3.2 + particle.depth * 2)
      const angle = orbit + Math.PI / 2
      ctx.strokeStyle = rgba(color, alpha * 0.62)
      ctx.lineWidth = Math.max(1, size * 0.28)
      ctx.beginPath()
      ctx.moveTo(x - Math.cos(angle) * streak, y - Math.sin(angle) * streak)
      ctx.lineTo(x + Math.cos(angle) * streak, y + Math.sin(angle) * streak)
      ctx.stroke()
    } else {
      ctx.fillStyle = rgba(color, alpha * 0.82)
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
}

function drawImpact(ctx: CanvasRenderingContext2D, width: number, height: number, palette: Palette, state: CeremonyState) {
  if (state.blackout <= 0 && state.impact <= 0.01 && state.compression <= 0) return

  const centerX = width / 2
  const centerY = height * 0.5
  const minSide = Math.min(width, height)

  ctx.save()
  if (state.blackout > 0) {
    ctx.fillStyle = rgba(palette.ink, state.blackout * 0.62)
    ctx.fillRect(0, 0, width, height)
  }

  ctx.globalCompositeOperation = "lighter"

  if (state.compression > 0.01) {
    ctx.strokeStyle = rgba(palette.highlight, 0.12 + state.compression * 0.32)
    ctx.lineWidth = minSide * (0.003 + state.compression * 0.008)
    ctx.beginPath()
    ctx.ellipse(centerX, centerY, minSide * (0.28 - state.compression * 0.08), minSide * (0.08 - state.compression * 0.025), 0, 0, Math.PI * 2)
    ctx.stroke()
  }

  if (state.impact > 0.01) {
    const flare = ctx.createLinearGradient(width * 0.08, centerY, width * 0.92, centerY)
    flare.addColorStop(0, rgba(palette.highlight, 0))
    flare.addColorStop(0.46, rgba(palette.secondary, state.impact * 0.24))
    flare.addColorStop(0.5, rgba(palette.white, state.impact * 0.68))
    flare.addColorStop(0.54, rgba(palette.secondary, state.impact * 0.24))
    flare.addColorStop(1, rgba(palette.highlight, 0))
    ctx.fillStyle = flare
    ctx.fillRect(width * 0.04, centerY - minSide * 0.05, width * 0.92, minSide * 0.1)
    drawSoftDisc(ctx, centerX, centerY, minSide * (0.22 + state.impact * 0.62), palette.white, state.impact * 0.24)
  }

  ctx.restore()
}

function drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number, palette: Palette) {
  const gradient = ctx.createRadialGradient(width / 2, height * 0.5, 0, width / 2, height * 0.5, Math.max(width, height) * 0.68)
  gradient.addColorStop(0, "rgba(0,0,0,0)")
  gradient.addColorStop(0.62, "rgba(0,0,0,0.08)")
  gradient.addColorStop(1, rgba(palette.ink, 0.78))
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = "rgba(255,255,255,0.018)"
  for (let i = 0; i < 110; i += 1) {
    const x = (i * 47 % 113) / 113 * width
    const y = (i * 89 % 127) / 127 * height
    ctx.fillRect(x, y, 1, 1)
  }
}

function renderFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: Palette,
  particles: Particle[],
  state: CeremonyState,
  time: number,
) {
  drawBackground(ctx, width, height, palette, state, time)
  drawLightArchitecture(ctx, width, height, palette, state, time)
  drawParticles(ctx, width, height, palette, particles, state, time)
  drawImpact(ctx, width, height, palette, state)
  drawVignette(ctx, width, height, palette)
}

function WinnerReveal({
  winner,
  prizeName,
  primaryColor,
  palette,
  visible,
}: {
  winner: DrawThemeProps["winner"]
  prizeName?: string | null
  primaryColor: string
  palette: Palette
  visible: boolean
}) {
  if (!winner) return null

  const label = winner.nameZh ?? winner.name
  const sublabel = winner.nameZh ? winner.name : null
  const hasLocalName = Boolean(winner.nameZh)

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-[max(2rem,5vw)]"
      aria-hidden={!visible}
    >
      <div
        className={[
          "relative flex max-w-[min(88vw,1180px)] flex-col items-center text-center",
          "transition-all duration-[1300ms] ease-[cubic-bezier(.16,1,.3,1)]",
          visible ? "translate-y-0 scale-100 opacity-100 blur-0" : "translate-y-7 scale-[0.965] opacity-0 blur-md",
        ].join(" ")}
        style={{ animation: visible ? "winner-couture-impact 1320ms cubic-bezier(.16,1,.3,1) both" : undefined }}
      >
        <div
          className="absolute left-1/2 top-1/2 -z-10 h-[min(34vw,390px)] w-[min(78vw,980px)] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(ellipse at center, ${rgba(palette.highlight, 0.2)}, ${primaryColor}2e 34%, transparent 72%)`,
            opacity: visible ? 1 : 0,
          }}
        />
        <div
          className="mb-[clamp(1.35rem,3vh,2.4rem)] h-px w-[min(52vw,680px)]"
          style={{ background: `linear-gradient(90deg, transparent, ${rgba(palette.secondary, 0.86)}, ${rgba(palette.highlight, 0.92)}, ${rgba(palette.secondary, 0.86)}, transparent)` }}
        />
        {prizeName && (
          <div
            className="mb-[clamp(0.8rem,2vh,1.4rem)] max-w-[min(74vw,820px)] font-body text-[clamp(0.82rem,1.08vw,1.08rem)] font-semibold uppercase tracking-[0.24em]"
            style={{ color: rgba(palette.highlight, 0.86), textShadow: `0 0 24px ${primaryColor}66` }}
          >
            {prizeName}
          </div>
        )}
        <div
          className={[
            "max-w-full text-balance leading-[0.98]",
            hasLocalName ? "font-zh font-bold" : "font-display font-semibold italic",
          ].join(" ")}
          style={{
            color: rgba(palette.white, 1),
            fontSize: `clamp(4rem, ${fitTextSize(label, hasLocalName ? 10.4 : 12.6)}vw, ${hasLocalName ? 11.3 : 13.4}rem)`,
            textShadow: `0 1px 0 rgba(255,255,255,.16), 0 16px 54px rgba(0,0,0,.88), 0 0 72px ${primaryColor}70, 0 0 26px ${rgba(palette.secondary, 0.32)}`,
          }}
        >
          {label}
        </div>
        {sublabel && (
          <div
            className="mt-[clamp(1.1rem,2.7vh,2rem)] max-w-[min(70vw,760px)] font-body text-[clamp(1.18rem,2.25vw,2.35rem)] font-medium"
            style={{ color: rgba(palette.white, 0.7), textShadow: "0 0 26px rgba(0,0,0,.88)" }}
          >
            {sublabel}
          </div>
        )}
        <div
          className="mt-[clamp(1.4rem,3.2vh,2.4rem)] h-px w-[min(42vw,540px)]"
          style={{ background: `linear-gradient(90deg, transparent, ${primaryColor}99, ${rgba(palette.highlight, 0.82)}, ${primaryColor}99, transparent)` }}
        />
      </div>
      <style>{`
        @keyframes winner-couture-impact {
          0% { opacity: 0; transform: translateY(28px) scale(.9); filter: blur(9px); }
          38% { opacity: 1; transform: translateY(-4px) scale(1.035); filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
      `}</style>
    </div>
  )
}

function DrawCardSequence({
  participants,
  winner,
  prizeName,
  primaryColor,
  palette,
  visible,
}: {
  participants: DrawThemeProps["participants"]
  winner: DrawThemeProps["winner"]
  prizeName?: string | null
  primaryColor: string
  palette: Palette
  visible: boolean
}) {
  const sequence = useMemo(() => {
    const pool = participants.filter(participant => participant._id !== winner?._id)
    const cards = pool.slice(0, 5)
    if (winner) cards.push(winner)
    return cards
  }, [participants, winner])

  if (!winner || sequence.length === 0) return null

  const finalIndex = sequence.length - 1

  return (
    <div
      className={[
        "pointer-events-none absolute inset-0 z-20 flex items-center justify-center",
        "transition-opacity duration-500",
        visible ? "opacity-100" : "opacity-0",
      ].join(" ")}
      aria-hidden
    >
      <div className="draw-card-stage relative h-[min(62vh,560px)] w-[min(42vw,410px)] min-w-[300px]">
        <div
          className="absolute inset-x-[8%] bottom-[4%] h-[18%] rounded-full blur-3xl"
          style={{ background: `radial-gradient(ellipse at center, ${rgba(palette.secondary, 0.32)}, transparent 72%)` }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[78%] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-white/10 bg-black/30 shadow-[0_28px_90px_rgba(0,0,0,.55)]"
          style={{ transform: "translate(-50%, -50%) rotateX(58deg) rotateZ(-7deg)" }}
        />
        {sequence.map((participant, index) => {
          const label = participant.nameZh ?? participant.name
          const sublabel = participant.nameZh ? participant.name : "Participant"
          const isWinnerCard = index === finalIndex
          const delay = `${index * 420}ms`

          return (
            <div
              key={`${participant._id}-${index}`}
              className={[
                "draw-card absolute left-1/2 top-1/2 flex h-[78%] w-[74%] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[24px]",
                "border bg-[#101219] shadow-[0_30px_80px_rgba(0,0,0,.58)]",
                isWinnerCard ? "draw-card-winner" : "draw-card-pass",
              ].join(" ")}
              style={{
                animationDelay: delay,
                borderColor: isWinnerCard ? rgba(palette.highlight, 0.74) : "rgba(255,255,255,.14)",
                background: `linear-gradient(145deg, ${rgba(mixRgb(palette.deep, palette.ink, 0.32), 0.96)}, rgba(7,8,14,.98))`,
                ["--card-accent" as string]: primaryColor,
                ["--card-highlight" as string]: rgba(palette.highlight, 1),
                ["--card-secondary" as string]: rgba(palette.secondary, 1),
              }}
            >
              <div
                className="absolute inset-0 opacity-80"
                style={{
                  background: `
                    radial-gradient(circle at 28% 20%, ${rgba(palette.secondary, isWinnerCard ? 0.32 : 0.16)}, transparent 28%),
                    radial-gradient(circle at 82% 72%, ${primaryColor}36, transparent 32%),
                    linear-gradient(115deg, transparent 0 42%, rgba(255,255,255,.1) 48%, transparent 56% 100%)
                  `,
                }}
              />
              <div className="relative flex items-start justify-between px-5 pt-5">
                <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 font-body text-[11px] font-semibold uppercase text-white/70">
                  Entry Pass
                </span>
                <span
                  className="rounded-full px-3 py-1 font-body text-[11px] font-bold uppercase"
                  style={{
                    background: isWinnerCard ? rgba(palette.highlight, 0.92) : "rgba(255,255,255,.09)",
                    color: isWinnerCard ? rgba(palette.ink, 1) : "rgba(255,255,255,.62)",
                  }}
                >
                  {isWinnerCard ? "Selected" : "Live"}
                </span>
              </div>
              <div className="relative mt-auto px-6 pb-7">
                {prizeName && (
                  <div className="mb-4 font-body text-[12px] font-semibold uppercase text-white/48">
                    {prizeName}
                  </div>
                )}
                <div
                  className={[
                    "leading-[1.02] text-white",
                    participant.nameZh ? "font-zh text-[clamp(3rem,5.8vw,4.6rem)] font-bold" : "font-display text-[clamp(2.5rem,4.2vw,3.8rem)] font-semibold italic",
                  ].join(" ")}
                  style={{ textShadow: `0 12px 42px rgba(0,0,0,.75), 0 0 28px ${primaryColor}66` }}
                >
                  {label}
                </div>
                <div className="mt-3 font-body text-[clamp(1rem,1.4vw,1.25rem)] font-medium text-white/58">
                  {sublabel}
                </div>
                <div
                  className="mt-6 h-px w-full"
                  style={{ background: `linear-gradient(90deg, ${primaryColor}00, ${rgba(palette.highlight, 0.7)}, ${primaryColor}00)` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <style>{`
        .draw-card-stage {
          perspective: 1400px;
        }

        .draw-card {
          opacity: 0;
          transform-origin: 50% 78%;
          animation: draw-card-pass 720ms cubic-bezier(.2, 0, 0, 1) both;
          will-change: transform, opacity, filter;
        }

        .draw-card-pass::before,
        .draw-card-winner::before {
          content: "";
          position: absolute;
          inset: -40%;
          background: linear-gradient(110deg, transparent 28%, rgba(255,255,255,.32) 48%, transparent 62%);
          transform: translateX(-46%) rotate(8deg);
          animation: draw-card-sheen 900ms cubic-bezier(.2, 0, 0, 1) both;
          animation-delay: inherit;
        }

        .draw-card-pass {
          animation-name: draw-card-pass;
        }

        .draw-card-winner {
          animation-name: draw-card-winner;
          animation-duration: 1180ms;
          box-shadow: 0 0 0 1px rgba(255,255,255,.14) inset, 0 0 70px color-mix(in srgb, var(--card-accent) 48%, transparent), 0 34px 110px rgba(0,0,0,.74);
        }

        @keyframes draw-card-pass {
          0% { opacity: 0; transform: translate(-50%, -46%) rotateX(56deg) rotateZ(-10deg) scale(.86); filter: blur(8px); }
          18% { opacity: 1; filter: blur(0); }
          54% { opacity: 1; transform: translate(-50%, -50%) rotateX(0deg) rotateZ(-1deg) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -78%) rotateX(-26deg) rotateZ(12deg) scale(.92); filter: blur(5px); }
        }

        @keyframes draw-card-winner {
          0% { opacity: 0; transform: translate(-50%, -44%) rotateX(58deg) rotateZ(8deg) scale(.82); filter: blur(10px) saturate(.8); }
          24% { opacity: 1; filter: blur(0) saturate(1.15); }
          58% { opacity: 1; transform: translate(-50%, -50%) rotateX(0deg) rotateZ(0deg) scale(1.06); }
          78% { opacity: 1; transform: translate(-50%, -50%) rotateX(0deg) rotateZ(0deg) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) rotateX(0deg) rotateZ(0deg) scale(1.08); filter: blur(8px); }
        }

        @keyframes draw-card-sheen {
          0% { opacity: 0; transform: translateX(-54%) rotate(8deg); }
          30% { opacity: .65; }
          100% { opacity: 0; transform: translateX(52%) rotate(8deg); }
        }
      `}</style>
    </div>
  )
}

export function NovaDraw({
  participants,
  winner,
  isSpinning,
  prizeName,
  primaryColor,
  onComplete,
}: DrawThemeProps & { preserveDrawingBuffer?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<CeremonyState>({
    field: 0.22,
    gather: 0,
    blackout: 0,
    compression: 0,
    impact: 0,
    reveal: 0,
    afterglow: 0,
    camera: 0,
  })
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const onCompleteRef = useRef(onComplete)
  const [winnerVisible, setWinnerVisible] = useState(false)
  const reducedMotion = useReducedMotion()

  const palette = useMemo(() => buildPalette(primaryColor), [primaryColor])
  const seed = useMemo(() => {
    const source = participants.map(participant => participant._id).join("|") || "empty"
    return source.split("").reduce((total, char) => total + char.charCodeAt(0), 1729)
  }, [participants])
  const particles = useMemo(() => makeParticles(seed), [seed])

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (reducedMotion) return

    const canvas = canvasRef.current
    const container = containerRef.current
    const ctx = canvas?.getContext("2d", { alpha: false })
    if (!canvas || !container || !ctx) return

    let frame = 0
    let width = 1
    let height = 1

    const resize = () => {
      const rect = container.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)

    const draw = (time: number) => {
      renderFrame(ctx, width, height, palette, particles, stateRef.current, time)
      frame = requestAnimationFrame(draw)
    }

    frame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
    }
  }, [palette, particles, reducedMotion])

  useEffect(() => {
    const state = stateRef.current

    if (!winner) {
      timelineRef.current?.kill()
      timelineRef.current = null
      resetState(state)
      setWinnerVisible(false)
      return
    }

    if (!isSpinning) {
      timelineRef.current?.kill()
      timelineRef.current = null
      state.field = 0.36
      state.gather = 0.92
      state.blackout = 0
      state.compression = 0
      state.impact = 0
      state.reveal = 1
      state.afterglow = 0.76
      state.camera = 0.3
      setWinnerVisible(true)
      return
    }

    setWinnerVisible(false)
    resetState(state)
    timelineRef.current?.kill()

    const timeline = gsap.timeline({
      defaults: { overwrite: true },
      onComplete: () => onCompleteRef.current(),
    })

    timelineRef.current = timeline
    timeline.to(state, { field: 0.5, camera: 0.22, duration: 1.15, ease: "sine.inOut" }, 0)
    timeline.to(state, { gather: 1, field: 0.72, duration: 2.05, ease: "power3.inOut" }, 0.62)
    timeline.to(state, { compression: 1, blackout: 0.68, duration: 0.42, ease: "power4.in" }, 2.42)
    timeline.to(state, { camera: 0.06, duration: 0.18, ease: "power4.in" }, 2.66)
    timeline.to(state, { impact: 1, blackout: 0.12, compression: 0, camera: 0.56, duration: 0.18, ease: "power4.out" }, 2.92)
    timeline.to(state, { impact: 0, duration: 0.82, ease: "power2.out" }, 3.08)
    timeline.call(() => setWinnerVisible(true), [], REVEAL_AT_MS / 1000)
    timeline.to(state, { reveal: 1, afterglow: 1, field: 0.5, duration: 1.16, ease: "power3.out" }, 3.16)
    timeline.to(state, { afterglow: 0.72, camera: 0.34, field: 0.36, duration: 1.4, ease: "sine.out" }, 4.2)
    timeline.to({}, { duration: Math.max(0, DRAW_DURATION_MS / 1000 - 5.6) }, 5.6)

    return () => {
      timeline.kill()
    }
  }, [isSpinning, winner])

  if (reducedMotion) {
    return (
      <div
        className="relative h-full w-full overflow-hidden"
        style={{
          background: `radial-gradient(circle at center, ${rgba(palette.deep, 1)}, ${rgba(palette.ink, 1)})`,
        }}
      >
        <WinnerReveal winner={winner} prizeName={prizeName} primaryColor={primaryColor} palette={palette} visible={Boolean(winner)} />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#05060b]">
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-0 h-full w-full" />
      <DrawCardSequence
        participants={participants}
        winner={winner}
        prizeName={prizeName}
        primaryColor={primaryColor}
        palette={palette}
        visible={isSpinning && !winnerVisible}
      />
      <WinnerReveal winner={winner} prizeName={prizeName} primaryColor={primaryColor} palette={palette} visible={winnerVisible} />
    </div>
  )
}
