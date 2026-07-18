"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PhoneCall, Target, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/* =====================================================================
   OverviewStats  ·  the three headline stat cards
   ---------------------------------------------------------------------
   Numbers count up on mount and reveal with a staggered vv-fade-up.
   The key metric (Resolution Rate) sits on a brass-wash gradient with a
   brass number, the one deliberate brass moment in this row. Count-up
   and reveal both honor prefers-reduced-motion (final values render
   immediately, no motion).

   All values are computed server-side and passed in as props, so no
   data logic lives here. This component is presentation only.
   ===================================================================== */

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

/** Ease-out count-up from 0 to `target` on mount. */
function useCountUp(target: number, animate: boolean): number {
  const [animatedValue, setAnimatedValue] = React.useState(target);

  React.useEffect(() => {
    if (!animate) return;
    let raf = 0;
    const duration = 900;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedValue(target * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setAnimatedValue(target);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, animate]);

  // When not animating, always reflect `target` directly instead of
  // resetting state synchronously in the effect body.
  return animate ? animatedValue : target;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export interface OverviewStatsProps {
  callsToday: number;
  resolutionRate: number;
  completedCalls: number;
  totalCalls: number;
  avgDurationSeconds: number;
}

export function OverviewStats({
  callsToday,
  resolutionRate,
  completedCalls,
  totalCalls,
  avgDurationSeconds,
}: OverviewStatsProps) {
  const reduced = usePrefersReducedMotion();
  const animate = !reduced;

  const callsValue = useCountUp(callsToday, animate);
  const rateValue = useCountUp(resolutionRate, animate);
  const durationValue = useCountUp(avgDurationSeconds, animate);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Calls Handled */}
      <Card className="animate-vv-fade-up" style={{ animationDelay: "0ms" }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Calls Handled</CardTitle>
          <PhoneCall className="size-4 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="font-mono text-3xl font-bold tabular-nums tracking-tight">
            {Math.round(callsValue)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Today</p>
        </CardContent>
      </Card>

      {/* Resolution Rate (key metric): brass-wash gradient + brass number */}
      <Card
        className="animate-vv-fade-up border-brand/30 bg-[linear-gradient(135deg,var(--accent),var(--card)_70%)]"
        style={{ animationDelay: "60ms" }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
          <Target className="size-4 text-brand" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "font-mono text-3xl font-bold tabular-nums tracking-tight text-brand",
            )}
          >
            {Math.round(rateValue)}%
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {completedCalls} of {totalCalls} calls completed (all time)
          </p>
        </CardContent>
      </Card>

      {/* Avg Duration */}
      <Card className="animate-vv-fade-up" style={{ animationDelay: "120ms" }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
          <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="font-mono text-3xl font-bold tabular-nums tracking-tight">
            {formatDuration(durationValue)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Per call, all time</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default OverviewStats;
