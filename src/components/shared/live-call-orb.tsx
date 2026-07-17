"use client";

import * as React from "react";
import { Phone, PhoneCall } from "lucide-react";

import { cn } from "@/lib/utils";

/* =====================================================================
   LiveCallOrb  ·  the "Obsidian & Brass" signature component
   ---------------------------------------------------------------------
   A brass 5-bar equalizer inside a ring, a live pulse dot with a
   state label, an optional typewriter transcript feed, and an optional
   live mm:ss timer. Reused across the landing hero, dashboard overview,
   test center, onboarding steps 5 and 9, and the industry pages.

   Accent / vertical tinting:
     Pass `accent` as any CSS color or CSS variable string, e.g.
     "var(--vertical-healthcare)", "var(--vertical-restaurant)",
     "var(--vertical-realestate)". It defaults to the brass brand var.
     The accent is applied as `color` on the equalizer + pulse dot and
     the bars/dot paint with `currentColor`, so a single prop retints
     the whole signature.

   Reduced motion:
     Honors prefers-reduced-motion. The global stylesheet already stops
     CSS animations, and this component additionally guards the
     JS-driven timer and typewriter: the transcript renders in full
     immediately and the timer stays frozen when reduced motion is on.
   ===================================================================== */

export type LiveCallOrbState = "idle" | "ringing" | "live";

export interface TranscriptLine {
  speaker: "caller" | "agent";
  text: string;
}

export interface LiveCallOrbProps {
  /** Overall footprint. Default "md". */
  size?: "sm" | "md" | "lg";
  /** Call state. Drives labels, animation, and the timer. Default "live". */
  state?: LiveCallOrbState;
  /**
   * CSS color or CSS variable string for the equalizer + pulse dot.
   * Defaults to the brass brand var. Pass a vertical token on industry
   * pages, e.g. "var(--vertical-healthcare)".
   */
  accent?: string;
  /** Show the typewriter transcript feed. Default false. */
  showTranscript?: boolean;
  /** Show the live mm:ss timer. Defaults to true when state is "live". */
  showTimer?: boolean;
  /** Transcript lines. A sensible default is provided. */
  transcript?: TranscriptLine[];
  className?: string;
}

const DEFAULT_ACCENT = "var(--brand)";

const DEFAULT_TRANSCRIPT: TranscriptLine[] = [
  { speaker: "caller", text: "I need to come in today" },
  {
    speaker: "agent",
    text: "I can see an opening at 2:30 this afternoon, does that work?",
  },
];

/** Stagger delays from section 4b of the brief. */
const BAR_DELAYS = ["0s", ".15s", ".3s", ".45s", ".6s"] as const;
/** Frozen waveform when motion is paused or the call is idle. */
const BAR_STATIC_SCALE = [0.45, 0.75, 1, 0.65, 0.5] as const;

const SIZES = {
  sm: {
    orb: "size-14",
    bar: "w-[2px]",
    barHeight: 18,
    gap: "gap-[3px]",
    label: "text-xs",
    dot: "size-1.5",
    timer: "text-xs",
  },
  md: {
    orb: "size-24",
    bar: "w-[3px]",
    barHeight: 38,
    gap: "gap-1",
    label: "text-sm",
    dot: "size-2",
    timer: "text-sm",
  },
  lg: {
    orb: "size-36",
    bar: "w-[5px]",
    barHeight: 60,
    gap: "gap-1.5",
    label: "text-base",
    dot: "size-2.5",
    timer: "text-base",
  },
} as const;

const STATE_LABELS: Record<LiveCallOrbState, string> = {
  idle: "Agent ready",
  ringing: "Incoming call",
  live: "Agent active",
};

/** matchMedia-based reduced-motion hook. Safe on the server (defaults off). */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const ss = (safe % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export function LiveCallOrb({
  size = "md",
  state = "live",
  accent = DEFAULT_ACCENT,
  showTranscript = false,
  showTimer,
  transcript = DEFAULT_TRANSCRIPT,
  className,
}: LiveCallOrbProps) {
  const reducedMotion = usePrefersReducedMotion();
  const dims = SIZES[size];

  const animateBars = !reducedMotion && state !== "idle";
  const showPing = !reducedMotion && state === "live";
  const timerEnabled = showTimer ?? state === "live";

  const lines =
    transcript && transcript.length > 0 ? transcript : DEFAULT_TRANSCRIPT;

  // ---- Live timer -------------------------------------------------------
  const [seconds, setSeconds] = React.useState(0);

  React.useEffect(() => {
    if (!timerEnabled || reducedMotion || state !== "live") return;
    const id = window.setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerEnabled, reducedMotion, state]);

  React.useEffect(() => {
    // Reset the clock whenever we leave the live state.
    if (state !== "live") setSeconds(0);
  }, [state]);

  // ---- Typewriter transcript -------------------------------------------
  const [lineIndex, setLineIndex] = React.useState(0);
  const [charIndex, setCharIndex] = React.useState(0);

  React.useEffect(() => {
    if (!showTranscript || reducedMotion) return;

    let currentLine = 0;
    let currentChar = 0;
    let timeout: ReturnType<typeof setTimeout>;

    setLineIndex(0);
    setCharIndex(0);

    const tick = () => {
      const text = lines[currentLine].text;
      if (currentChar < text.length) {
        currentChar += 1;
        setLineIndex(currentLine);
        setCharIndex(currentChar);
        timeout = setTimeout(tick, 40);
      } else {
        // Line finished. Hold, then advance (looping back to the start).
        timeout = setTimeout(() => {
          currentLine = (currentLine + 1) % lines.length;
          currentChar = 0;
          setLineIndex(currentLine);
          setCharIndex(0);
          tick();
        }, 1200);
      }
    };

    timeout = setTimeout(tick, 400);
    return () => clearTimeout(timeout);
  }, [showTranscript, reducedMotion, lines]);

  // ---- Equalizer + pulse ------------------------------------------------
  const orb = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full border border-border bg-card shadow-sm",
          dims.orb,
        )}
        style={{ color: accent }}
      >
        {/* Soft accent wash ring while live */}
        {state === "live" ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-brand/40"
          />
        ) : null}

        <div
          className={cn("flex items-end", dims.gap)}
          role="img"
          aria-label={`${STATE_LABELS[state]} equalizer`}
        >
          {BAR_DELAYS.map((delay, i) => (
            <span
              key={i}
              className={cn(
                "rounded-full",
                dims.bar,
                animateBars && "animate-vv-eq",
              )}
              style={{
                height: dims.barHeight,
                backgroundColor: "currentColor",
                transformOrigin: "bottom",
                animationDelay: animateBars ? delay : undefined,
                transform: animateBars
                  ? undefined
                  : `scaleY(${BAR_STATIC_SCALE[i]})`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Live pulse dot + state label */}
      <div className={cn("flex items-center gap-2", dims.label)}>
        <span
          className="relative inline-flex items-center justify-center"
          style={{ color: accent }}
        >
          {showPing ? (
            <span
              aria-hidden
              className={cn(
                "absolute inline-flex rounded-full opacity-70 animate-vv-ping",
                dims.dot,
              )}
              style={{ backgroundColor: "currentColor" }}
            />
          ) : null}
          <span
            className={cn("relative inline-flex rounded-full", dims.dot)}
            style={{
              backgroundColor:
                state === "idle" ? "var(--muted-foreground)" : "currentColor",
            }}
          />
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          {state === "live" ? (
            <PhoneCall className="size-4 text-muted-foreground" aria-hidden />
          ) : (
            <Phone className="size-4 text-muted-foreground" aria-hidden />
          )}
          {STATE_LABELS[state]}
        </span>
        {timerEnabled ? (
          <span
            className={cn(
              "font-mono tabular-nums text-muted-foreground",
              dims.timer,
            )}
            aria-label="Call duration"
          >
            {formatClock(seconds)}
          </span>
        ) : null}
      </div>
    </div>
  );

  if (!showTranscript) {
    return <div className={cn("inline-flex", className)}>{orb}</div>;
  }

  // ---- Transcript feed --------------------------------------------------
  const renderedLines = reducedMotion ? lines : lines.slice(0, lineIndex + 1);

  const transcriptFeed = (
    <div
      className="flex w-full max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-label="Live call transcript"
    >
      {renderedLines.map((entry, i) => {
        const isTyping = !reducedMotion && i === lineIndex;
        const text = isTyping ? entry.text.slice(0, charIndex) : entry.text;
        const isAgent = entry.speaker === "agent";

        return (
          <div
            key={`${i}-${entry.speaker}`}
            className={cn("flex", isAgent ? "justify-end" : "justify-start")}
          >
            <span
              className={cn(
                "inline-block rounded-lg px-3 py-2 text-sm leading-relaxed",
                isAgent
                  ? "border border-brand/20 bg-accent text-accent-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {text}
              {isTyping ? (
                <span
                  aria-hidden
                  className="ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-current align-middle"
                />
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8",
        className,
      )}
    >
      {orb}
      {transcriptFeed}
    </div>
  );
}

export default LiveCallOrb;
