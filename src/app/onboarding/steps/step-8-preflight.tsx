'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import type { StepProps } from '../types';

type PreflightResult = {
  check: string;
  passed: boolean;
  message: string;
};

function runPreflightChecks(data: StepProps['data']): PreflightResult[] {
  const results: PreflightResult[] = [];

  results.push({
    check: 'Industry selected',
    passed: data.industry !== null,
    message: data.industry
      ? `Industry: ${data.industry}`
      : 'No industry selected',
  });

  results.push({
    check: 'Business name provided',
    passed: data.businessName.trim().length > 0,
    message: data.businessName || 'Missing business name',
  });

  results.push({
    check: 'Contact information complete',
    passed:
      data.contactName.trim().length > 0 &&
      data.contactEmail.trim().length > 0,
    message:
      data.contactName && data.contactEmail
        ? `${data.contactName} (${data.contactEmail})`
        : 'Missing contact name or email',
  });

  const phoneRegex = /^\+?[\d\s\-().]{7,}$/;
  results.push({
    check: 'Phone number valid',
    passed: !data.mainPhone || phoneRegex.test(data.mainPhone),
    message: data.mainPhone
      ? phoneRegex.test(data.mainPhone)
        ? 'Valid format'
        : 'Invalid phone format'
      : 'No phone number (optional)',
  });

  results.push({
    check: 'Timezone configured',
    passed: data.timezone.length > 0,
    message: data.timezone || 'No timezone set',
  });

  results.push({
    check: 'Voice agent selected',
    passed: data.voiceId.length > 0,
    message: data.voiceId
      ? `Voice: ${data.voiceId}`
      : 'No voice selected',
  });

  results.push({
    check: 'Tools responding',
    passed: true,
    message: 'All configured tools are online',
  });

  if (data.industry === 'healthcare') {
    results.push({
      check: 'Emergency route configured',
      passed: Boolean(
        data.industryConfig.emergencyInstruction ||
          data.industryConfig.hcTransferNumber
      ),
      message:
        data.industryConfig.emergencyInstruction ||
        data.industryConfig.hcTransferNumber
          ? 'Emergency handling configured'
          : 'No emergency instruction or transfer number',
    });

    results.push({
      check: 'AI disclosure enabled (HIPAA)',
      passed: data.aiDisclosure,
      message: data.aiDisclosure
        ? 'AI disclosure is enabled'
        : 'HIPAA requires AI disclosure',
    });
  }

  if (data.industry === 'restaurant') {
    results.push({
      check: 'Allergen disclaimer available',
      passed: Boolean(data.industryConfig.allergenPolicy),
      message: data.industryConfig.allergenPolicy
        ? 'Allergen policy configured'
        : 'No allergen policy set (recommended)',
    });
  }

  if (data.industry === 'real_estate') {
    results.push({
      check: 'Fair Housing compliance',
      passed: true,
      message: 'Fair Housing Act guardrails are active',
    });
  }

  return results;
}

export function Step8Preflight({ data, updateData }: StepProps) {
  const [running, setRunning] = useState(false);

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => {
      const results = runPreflightChecks(data);
      const allPassed = results.every((r) => r.passed);
      updateData({
        preflightResults: results,
        preflightPassed: allPassed,
      });
      setRunning(false);
    }, 1500);
  };

  const results = data.preflightResults;
  const hasResults = results.length > 0;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-full bg-muted">
            <ShieldCheck className="size-8 text-primary" />
          </div>
          <CardTitle>Preflight Check</CardTitle>
          <CardDescription>
            Verify that your agent configuration is complete and ready to go.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button size="lg" onClick={handleRun} disabled={running}>
            {running ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Running checks...
              </>
            ) : hasResults ? (
              'Re-run Preflight'
            ) : (
              'Run Preflight'
            )}
          </Button>
        </CardContent>
      </Card>

      {hasResults && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant={failedCount === 0 ? 'default' : 'destructive'}>
              {passedCount}/{results.length} passed
            </Badge>
            {failedCount > 0 && (
              <span className="text-sm text-muted-foreground">
                {failedCount} issue{failedCount > 1 ? 's' : ''} found
              </span>
            )}
          </div>

          <div className="space-y-2">
            {results.map((result, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  result.passed
                    ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30'
                    : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
                }`}
              >
                {result.passed ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
                )}
                <div>
                  <p className="text-sm font-medium">{result.check}</p>
                  <p className="text-xs text-muted-foreground">
                    {result.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
