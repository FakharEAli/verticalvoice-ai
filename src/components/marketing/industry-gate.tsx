'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChefHat, Stethoscope, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/* ---------------------------------------------------------------------------
 * IndustryGate
 * ---------------------------------------------------------------------------
 * First-visit industry selector. Shown once per visitor on the landing page
 * only. Any choice (including "Other", "Just exploring", Escape, or the close
 * button) is persisted to localStorage so the modal never nags a returning
 * visitor.
 *
 * Hydration safety: localStorage is client-only, so the component renders
 * nothing on the server AND on the first client paint. The stored value is
 * read inside an effect, after which a short timer opens the dialog. Initial
 * state is never derived from localStorage, so the server and client trees
 * always match.
 * ------------------------------------------------------------------------- */

export const INDUSTRY_GATE_STORAGE_KEY = 'vv-industry-choice';

/** Delay before opening, so the hero paints first and LCP is untouched. */
const OPEN_DELAY_MS = 750;

export type IndustryGateChoice =
  | 'healthcare'
  | 'restaurant'
  | 'real-estate'
  | 'other'
  | 'exploring';

export interface IndustryGateRecord {
  choice: IndustryGateChoice;
  ts: number;
}

interface IndustryOption {
  choice: Extract<IndustryGateChoice, 'healthcare' | 'restaurant' | 'real-estate'>;
  label: string;
  benefit: string;
  href: string;
  jewel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const INDUSTRY_OPTIONS: IndustryOption[] = [
  {
    choice: 'healthcare',
    label: 'Healthcare',
    benefit: 'Books appointments, never gives clinical advice.',
    href: '/industries/healthcare',
    jewel: 'var(--vertical-healthcare)',
    icon: Stethoscope,
  },
  {
    choice: 'restaurant',
    label: 'Restaurant',
    benefit: 'Takes reservations and orders through the rush.',
    href: '/industries/restaurant',
    jewel: 'var(--vertical-restaurant)',
    icon: ChefHat,
  },
  {
    choice: 'real-estate',
    label: 'Real Estate',
    benefit: 'Qualifies leads and schedules showings in seconds.',
    href: '/industries/real-estate',
    jewel: 'var(--vertical-realestate)',
    icon: Building2,
  },
];

function readStoredChoice(): IndustryGateRecord | null {
  try {
    const raw = window.localStorage.getItem(INDUSTRY_GATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'choice' in parsed) {
      return parsed as IndustryGateRecord;
    }
    return null;
  } catch {
    // Private mode, disabled storage, or corrupt JSON. Treat as "not seen".
    return null;
  }
}

function persistChoice(choice: IndustryGateChoice) {
  try {
    const record: IndustryGateRecord = { choice, ts: Date.now() };
    window.localStorage.setItem(INDUSTRY_GATE_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage unavailable. The modal simply closes for this session.
  }
}

export function IndustryGate() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [reduced, setReduced] = React.useState(false);
  // Nothing renders until the client has checked storage, which keeps the
  // server-rendered tree and the first client render identical.
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    if (readStoredChoice()) {
      // Defer to a fresh frame rather than setting state synchronously in
      // the effect body (React discourages it — see set-state-in-effect).
      const frame = requestAnimationFrame(() => setChecked(true));
      return () => cancelAnimationFrame(frame);
    }

    const timer = window.setTimeout(() => {
      setChecked(true);
      setOpen(true);
    }, OPEN_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  const commit = React.useCallback(
    (choice: IndustryGateChoice, href?: string) => {
      persistChoice(choice);
      setOpen(false);
      if (href) router.push(href);
    },
    [router],
  );

  // Escape, the scrim, and the close button all resolve to "just exploring".
  const handleOpenChange = React.useCallback((next: boolean) => {
    if (!next) {
      persistChoice('exploring');
      setOpen(false);
      return;
    }
    setOpen(true);
  }, []);

  if (!checked || !open) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-labelledby="industry-gate-title"
        aria-describedby="industry-gate-description"
        className="max-w-[calc(100%-2rem)] overflow-hidden border border-border bg-card p-6 text-card-foreground sm:max-w-[620px] sm:p-8"
      >
        {/* Single soft brass wash, top center. Decorative only. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-40"
          style={{
            background:
              'radial-gradient(60% 100% at 50% 0%, var(--brand) 0%, transparent 70%)',
            maskImage: 'linear-gradient(to bottom, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)',
            opacity: 0.12,
          }}
        />

        <Button
          variant="ghost"
          onClick={() => commit('exploring')}
          aria-label="Close industry selector"
          className="absolute top-3 right-3 size-11 rounded-lg text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </Button>

        <div className="relative flex flex-col gap-6">
          <header className="flex flex-col gap-2 pr-12">
            <DialogTitle
              id="industry-gate-title"
              className="font-display text-3xl leading-tight font-normal tracking-tight text-foreground sm:text-4xl"
            >
              Which industry are you in?
            </DialogTitle>
            <DialogDescription
              id="industry-gate-description"
              className="max-w-prose text-base text-muted-foreground"
            >
              The agent is tuned per industry, so it already knows the calls you take.
              Pick yours and we will show you the version built for it.
            </DialogDescription>
          </header>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {INDUSTRY_OPTIONS.map((option, index) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.choice}
                  type="button"
                  onClick={() => commit(option.choice, option.href)}
                  style={
                    {
                      '--jewel': option.jewel,
                      animationDelay:
                        !reduced && index ? `${index * 50}ms` : undefined,
                    } as React.CSSProperties
                  }
                  className={cn(
                    'group flex min-h-[44px] flex-col items-start gap-3 rounded-lg border border-border bg-background p-4 text-left',
                    'transition-[transform,box-shadow,border-color] duration-150 ease-out',
                    'hover:-translate-y-0.5 hover:border-[var(--jewel)] hover:shadow-lg',
                    'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                    !reduced && 'animate-vv-fade-up',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="flex size-10 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor:
                        'color-mix(in oklab, var(--jewel) 12%, transparent)',
                      color: 'var(--jewel)',
                    }}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-foreground">
                      {option.label}
                    </span>
                    <span className="text-[13px] leading-snug text-muted-foreground">
                      {option.benefit}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-muted-foreground">Not one of these three?</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => commit('other')}
                className="h-11 px-4 text-muted-foreground hover:text-foreground"
              >
                Other industry
              </Button>
              <Button
                variant="ghost"
                onClick={() => commit('exploring')}
                className="h-11 px-4 text-muted-foreground hover:text-foreground"
              >
                Just exploring
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default IndustryGate;
