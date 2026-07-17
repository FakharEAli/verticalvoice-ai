'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
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
import { Step7Review } from './steps/step-7-review';
import { Step8Preflight } from './steps/step-8-preflight';
import { Step9TestCall } from './steps/step-9-test-call';
import { Step10Activate } from './steps/step-10-activate';

const STORAGE_KEY = 'verticalvoice_onboarding_state';

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
      setCurrentStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const jumpToStep = (step: number) => {
    if (step >= 0 && step < stepsMeta.length) {
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
        return <Step7Review {...props} onJumpToStep={jumpToStep} />;
      case 7:
        return <Step8Preflight {...props} />;
      case 8:
        return <Step9TestCall {...props} />;
      case 9:
        return <Step10Activate {...props} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Progress bar area */}
      <div className="border-b bg-background px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">
              Step {currentStep + 1} of {stepsMeta.length}
            </span>
            <span className="text-muted-foreground">
              {Math.round(progress)}% complete
            </span>
          </div>
          <Progress value={progress} />
          {/* Step indicator dots */}
          <div className="mt-3 flex justify-between">
            {stepsMeta.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  if (i < currentStep) jumpToStep(i);
                }}
                className={`flex size-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  i === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : i < currentStep
                      ? 'cursor-pointer bg-primary/20 text-primary hover:bg-primary/30'
                      : 'bg-muted text-muted-foreground'
                }`}
                disabled={i > currentStep}
                title={s.title}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">{meta.title}</h2>
            <p className="mt-1 text-muted-foreground">{meta.subtitle}</p>
          </div>
          {renderStep()}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 border-t bg-background px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          {isFirst ? (
            <div />
          ) : (
            <Button variant="outline" onClick={goBack}>
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
                Next
                <ChevronRight className="ml-1 size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
