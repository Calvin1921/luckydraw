"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { NovaDraw } from "./NovaDraw";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

type Participant = {
  _id: Id<"participants">;
  name: string;
  nameZh?: string | null;
  isEligible: boolean;
};

type Props = {
  sessionId: Id<"drawSessions">;
  participants: Participant[];
  primaryColor: string;
  isOperator: boolean;
  isStage: boolean;
};

// ─── Main DrawEngine ────────────────────────────────────────────────────────

export function DrawEngine({
  sessionId,
  participants,
  primaryColor,
  isOperator: _isOperator,
  isStage: _isStage,
}: Props) {
  const [animationDone, setAnimationDone] = useState(false);

  const session = useQuery(api.draw.getSession, { sessionId });

  const isSpinning = session?.status === "result" && !animationDone;
  const showWinner = session?.status === "result" && animationDone;
  const showCeremonyChrome = session?.status === "idle";

  useEffect(() => {
    if (session?.status === "idle") setAnimationDone(false);
  }, [session?.status]);

  if (!session) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (!_isStage) return null;

  const eligibleParticipants = participants
    .filter((p) => p.isEligible)
    .map((p) => ({
      _id: p._id as string,
      name: p.name,
      nameZh: p.nameZh ?? null,
    }));

  if (eligibleParticipants.length === 0) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <p className="font-display text-white/50 text-xl tracking-wide">
          No eligible participants remaining
        </p>
      </div>
    );
  }

  // Prize + tier display values
  const tierName = session.tier?.nameZh ?? session.tier?.name;
  const prizesRemaining = session.prizesRemaining ?? 0;
  const prizesTotal = session.prizesTotal ?? 0;
  const prizesAwarded = prizesTotal - prizesRemaining;
  const displayPrize = session.prize ?? session.nextPrize;

  const winner = session.winner
    ? {
        _id: session.winner._id as string,
        name: session.winner.name,
        nameZh: session.winner.nameZh ?? null,
      }
    : null;

  // ARIA live region
  const prizeName = displayPrize?.nameZh ?? displayPrize?.name ?? "";
  const winnerName = winner ? (winner.nameZh ?? winner.name) : "";
  let announceText: string;
  if (session.status === "result" && animationDone && winner) {
    announceText = `Winner selected: ${winnerName} for ${prizeName}`;
  } else if (session.status === "result") {
    announceText = `Drawing in progress for ${prizeName}. Please wait.`;
  } else {
    announceText = `Ready to draw for ${prizeName}`;
  }

  return (
    <div className="relative w-screen h-screen bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Screen reader live region */}
      <div aria-live="assertive" className="sr-only" id="draw-announcer">
        {announceText}
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-40"
        style={{ background: "linear-gradient(180deg, rgba(3,2,8,0.78), rgba(3,2,8,0))" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-44"
        style={{ background: "linear-gradient(0deg, rgba(3,2,8,0.72), rgba(3,2,8,0))" }}
      />

      <AnimatePresence>
        {showCeremonyChrome && (
          <motion.div
            className="absolute top-0 left-0 right-0 flex flex-col items-center pt-5 z-10 pointer-events-none"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={tierName}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="font-display text-white/35 text-[13px] uppercase tracking-[0.25em] font-semibold mb-2"
              >
                {tierName}
              </motion.div>
            </AnimatePresence>

            {/* Prize progress dots */}
            {prizesTotal > 0 && (
              <div className="flex items-center gap-2 mb-3">
                {Array.from({ length: prizesTotal }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="rounded-full transition-all duration-500"
                    style={{
                      width: i === prizesAwarded ? 12 : 8,
                      height: i === prizesAwarded ? 12 : 8,
                      background:
                        i < prizesAwarded
                          ? primaryColor
                          : i === prizesAwarded
                            ? `${primaryColor}88`
                            : "rgba(255,255,255,0.12)",
                      boxShadow:
                        i === prizesAwarded ? `0 0 10px ${primaryColor}66` : "none",
                    }}
                  />
                ))}
              </div>
            )}

            {/* Prize name — pre-draw only, so it never competes with the reveal */}
            <AnimatePresence mode="wait">
              {displayPrize && (
                <motion.div
                  key={displayPrize._id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="font-display italic text-white/55"
                  style={{ fontSize: "42px", lineHeight: 1.1 }}
                >
                  {displayPrize.nameZh ?? displayPrize.name}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nova draw animation */}
      <div className="flex items-center justify-center w-full h-full absolute inset-0">
        <NovaDraw
          participants={eligibleParticipants}
          winner={session.status === "result" ? winner : null}
          isSpinning={isSpinning}
          prizeName={displayPrize ? (displayPrize.nameZh ?? displayPrize.name) : null}
          primaryColor={primaryColor}
          onComplete={() => setAnimationDone(true)}
        />
      </div>

      {/* Waiting hint */}
      <AnimatePresence>
        {session.status === "idle" && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-10 text-white/50 text-xs tracking-[0.25em] uppercase z-10"
          >
            Waiting for draw...
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWinner && winner && (
          <motion.div
            className="absolute bottom-8 left-1/2 z-10 h-px w-24 -translate-x-1/2"
            style={{ background: `linear-gradient(90deg, transparent, ${primaryColor}99, transparent)` }}
            initial={{ opacity: 0, scaleX: 0.25 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
