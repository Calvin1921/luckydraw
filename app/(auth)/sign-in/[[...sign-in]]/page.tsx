import { SignIn } from "@clerk/nextjs"
import { Sparkles } from "lucide-react"
import { colors } from "@/lib/design-tokens"

export default function SignInPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: colors.bg }}
    >
      {/* Gold accent glow — design system radial */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 40%, ${colors.accentGlow} 0%, transparent 70%)`,
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Product branding */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2" style={{ color: colors.text }}>
            <Sparkles
              size={28}
              aria-hidden="true"
              style={{ color: colors.accent }}
            />
            <span className="text-3xl font-bold tracking-tight font-display italic">
              Lucky Draw
            </span>
          </div>
          <p className="text-sm max-w-xs leading-relaxed" style={{ color: colors.textDim }}>
            Run unforgettable lucky draws for your events
          </p>
        </div>

        {/* Clerk auth component */}
        <SignIn />
      </div>
    </div>
  )
}
