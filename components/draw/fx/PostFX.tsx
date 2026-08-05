"use client"

import { useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import { EffectComposer, Bloom, ChromaticAberration, Vignette, Noise, ToneMapping } from "@react-three/postprocessing"
import { BlendFunction, ToneMappingMode } from "postprocessing"
import { Vector2 } from "three"

/**
 * Shared R3F post-processing stack for cinematic draw themes.
 *
 * Provides: Bloom (selective, high threshold), ChromaticAberration (subtle),
 * Vignette, Film Grain (Noise), and ACES Filmic tone mapping.
 *
 * Each theme controls bloom intensity per-frame via bloomRef.
 */

export interface PostFXBloomState {
  strength: number
}

interface PostFXProps {
  bloomRef: React.RefObject<PostFXBloomState>
  /** Bloom luminance threshold — only bright pixels glow. Default 0.6 (selective). */
  bloomThreshold?: number
  /** Chromatic aberration offset. Default [0.002, 0.004]. Set [0,0] to disable. */
  chromaticOffset?: [number, number]
  /** Vignette darkness. Default 0.45. */
  vignetteDarkness?: number
  /** Film grain intensity. Default 0.12. */
  grainIntensity?: number
}

type BloomPassRef = { intensity: number } & Record<string, unknown>

export function PostFX({
  bloomRef,
  bloomThreshold = 0.6,
  chromaticOffset = [0.002, 0.004],
  vignetteDarkness = 0.45,
  grainIntensity = 0.12,
}: PostFXProps) {
  // Use a stable closure to avoid Next.js dev-tools circular JSON serialization bug
  const bloomPassProxy = useMemo(() => ({ current: null as BloomPassRef | null }), [])

  const offsetVec = useMemo(() => new Vector2(chromaticOffset[0], chromaticOffset[1]), [chromaticOffset])

  useFrame(() => {
    const bl = bloomRef.current
    if (!bl || !bloomPassProxy.current) return
    bloomPassProxy.current.intensity = bl.strength
  })

  return (
    <EffectComposer>
      <Bloom
        ref={(r: any) => { bloomPassProxy.current = r }}
        intensity={1.0}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.9}
        radius={0.6}
        mipmapBlur
      />
      <ChromaticAberration
        offset={offsetVec}
        radialModulation={true}
        modulationOffset={0.5}
      />
      <Vignette
        darkness={vignetteDarkness}
        offset={0.3}
        blendFunction={BlendFunction.NORMAL}
      />
      <Noise
        premultiply
        blendFunction={BlendFunction.OVERLAY}
        opacity={grainIntensity}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
