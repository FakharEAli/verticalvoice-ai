'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, SkipForward, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type OnboardingData,
  initialOnboardingData,
  stepsMeta,
} from './types';
import { Step1Industry } from './steps/step-1-industry';
import { Step2Business } from './steps/step-2-business';
import { Step3Import } from './steps/step-3-import';
import { Step4IndustryForm } from './steps/step-4-industry-form';
import { Step5Personality } from './steps/step-5-personality';
import { Step6Integration } from './steps/step-6-integration';
import { StepPhone } from './steps/step-phone';
import { Step7Review } from './steps/step-7-review';
import { Step8Preflight } from './steps/step-8-preflight';
import { Step9TestCall } from './steps/step-9-test-call';
import { Step10Activate } from './steps/step-10-activate';

// v2: a Phone-number step was inserted, shifting later step indexes. Bumping
// the key drops any stale in-progress state saved under the old layout so a
// returning session can't resume on a mismatched step.
const STORAGE_KEY = 'verticalvoice_onboarding_state_v2';

// Short mono eyebrow shown above each step's serif question headline.
const STEP_EYEBROWS = [
  'Industry',
  'Business',
  'Smart import',
  'Configuration',
  'Personality',
  'Integrations',
  'Phone number',
  'Review',
  'Preflight',
  'Test call',
  'Go live',
];

function loadPersistedState(): { data: OnboardingData; currentStep: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function OnboardingPage() {
  const persisted = loadPersistedState();
  const [currentStep, setCurrentStep] = useState(persisted?.currentStep ?? 0);
  const [data, setData] = useState<OnboardingData>(
    persisted?.data ?? initialOnboardingData
  );
  // Slide direction: 1 = forward, -1 = back. Drives the transition only.
  const [direction, setDirection] = useState<1 | -1>(1);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, currentStep }));
  }, [data, currentStep]);

  const updateData = useCallback((partial: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const meta = stepsMeta[currentStep];
  const isValid = meta.validate(data);
  const isFirst = currentStep === 0;
  const isLast = currentStep === stepsMeta.length - 1;
  const progress = ((currentStep + 1) / stepsMeta.length) * 100;

  const goNext = () => {
    if (currentStep < stepsMeta.length - 1) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  };

  const jumpToStep = (step: number) => {
    if (step >= 0 && step < stepsMeta.length) {
      setDirection(step >= currentStep ? 1 : -1);
      setCurrentStep(step);
    }
  };

  const renderStep = () => {
    const props = { data, updateData };
    switch (currentStep) {
      case 0:
        return <Step1Industry {...props} />;
      case 1:
        return <Step2Business {...props} />;
      case 2:
        return <Step3Import {...props} />;
      case 3:
        return <Step4IndustryForm {...props} />;
      case 4:
        return <Step5Personality {...props} />;
      case 5:
        return <Step6Integration {...props} />;
      case 6:
        return <StepPhone {...props} />;
      case 7:
        return <Step7Review {...props} onJumpToStep={jumpToStep} />;
      case 8:
        return <Step8Preflight {...props} />;
      case 9:
        return <Step9TestCall {...props} />;
      case 10:
        return <Step10Activate {...props} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Per-step slide keyframes. prefers-reduced-motion is honored globally
          (globals.css disables all animation), so the step simply appears. */}
      <style>{`
        @keyframes vv-onb-fwd  { from { opacity: 0; transform: translateX(24px) }  to { opacity: 1; transform: none } }
        @keyframes vv-onb-back { from { opacity: 0; transform: translateX(-24px) } to { opacity: 1; transform: none } }
      `}</style>

      {/* Persistent progress chrome */}
      <div className="border-b bg-background/80 px-6 py-5 backdrop-blur">
        <div className="mx-auto max-w-[720px]">
          <div className="mb-3 flex items-end justify-between">
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Step {currentStep + 1} / {stepsMeta.length}
            </span>
            <span className="font-mono text-xs tabular-nums text-brand">
              {Math.round(progress)}% complete
            </span>
          </div>

          <Progress value={progress} />

          {/* Step dots: done = brass fill, current = brass ring, upcoming = muted */}
          <div className="mt-4 flex items-center justify-between">
            {stepsMeta.map((s, i) => {
              const done = i < currentStep;
              const current = i === currentStep;
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (i < currentStep) jumpToStep(i);
                  }}
                  disabled={i > currentStep}
                  title={s.title}
                  aria-label={`Step ${i + 1}: ${s.title}`}
                  aria-current={current ? 'step' : undefined}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full font-mono text-[11px] font-medium transition-all',
                    done &&
                      'cursor-pointer bg-brand text-brand-foreground hover:opacity-80',
                    current &&
                      'bg-background text-brand ring-2 ring-brand ring-offset-2 ring-offset-background',
                    !done &&
                      !current &&
                      'bg-muted text-muted-foreground'
                  )}
                >
                  {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step content: card-per-step, centered, generous padding */}
      <div className="flex-1 overflow-y-auto px-6 py-10">
        <div
          key={currentStep}
          className="mx-auto max-w-[720px]"
          style={{
            animation: `${direction === 1 ? 'vv-onb-fwd' : 'vv-onb-back'} 220ms ease-out both`,
          }}
        >
          <header className="mb-8">
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {STEP_EYEBROWS[currentStep]}
            </p>
            <h2 className="font-display text-3xl leading-[1.1] tracking-tight text-foreground sm:text-4xl">
              {meta.title}
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              {meta.subtitle}
            </p>
          </header>

          <div className="rounded-lg border bg-card p-6 shadow-sm sm:p-8">
            {renderStep()}
          </div>
        </div>
      </div>

      {/* Sticky footer: Continue = ink primary, Back = ghost */}
      <div className="sticky bottom-0 border-t bg-background/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-[720px] items-center justify-between">
          {isFirst ? (
            <div />
          ) : (
            <Button variant="ghost" onClick={goBack}>
              <ChevronLeft className="mr-1 size-4" />
              Back
            </Button>
          )}

          <div className="flex gap-2">
            {meta.skippable && !isLast && (
              <Button variant="ghost" onClick={goNext}>
                <SkipForward className="mr-1 size-4" />
                Skip
              </Button>
            )}
            {!isLast && (
              <Button onClick={goNext} disabled={!isValid}>
                Continue
                <ChevronRight className="ml-1 size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
