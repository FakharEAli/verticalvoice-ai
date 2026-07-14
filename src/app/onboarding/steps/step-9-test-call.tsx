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
import { Separator } from '@/components/ui/separator';
import {
  Phone,
  PhoneCall,
  Loader2,
  MessageSquare,
  Target,
  Star,
} from 'lucide-react';
import type { StepProps } from '../types';

export function Step9TestCall({ data, updateData }: StepProps) {
  const [calling, setCalling] = useState(false);
  const [callDone, setCallDone] = useState(data.testCallCompleted);

  const canCall = data.preflightPassed;

  const handleCall = () => {
    setCalling(true);
    setTimeout(() => {
      setCalling(false);
      setCallDone(true);
      updateData({ testCallCompleted: true });
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-20 items-center justify-center rounded-full bg-muted">
            {calling ? (
              <PhoneCall className="size-10 animate-pulse text-primary" />
            ) : (
              <Phone className="size-10 text-primary" />
            )}
          </div>
          <CardTitle className="text-xl">
            {calling
              ? 'Calling your agent...'
              : callDone
                ? 'Test call complete!'
                : 'Test your AI agent'}
          </CardTitle>
          <CardDescription>
            {calling
              ? 'Please wait while we connect you to your configured agent.'
              : callDone
                ? 'Your agent handled the test call successfully.'
                : 'Make a simulated test call to hear your agent in action.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {!callDone ? (
            <>
              <Button
                size="lg"
                onClick={handleCall}
                disabled={!canCall || calling}
              >
                {calling ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Phone className="mr-2 size-4" />
                    Call My Agent
                  </>
                )}
              </Button>
              {!canCall && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Complete the preflight check first
                </p>
              )}
            </>
          ) : (
            <Button variant="outline" size="lg" onClick={handleCall}>
              <Phone className="mr-2 size-4" />
              Call Again
            </Button>
          )}
        </CardContent>
      </Card>

      {callDone && (
        <>
          <Separator />

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="size-4 text-primary" />
                  <CardTitle className="text-sm">Detected Intent</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Badge>Appointment Booking</Badge>
                <p className="mt-2 text-xs text-muted-foreground">
                  Confidence: 94%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Star className="size-4 text-primary" />
                  <CardTitle className="text-sm">Evaluation Score</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-primary">92</span>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Excellent performance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-primary" />
                  <CardTitle className="text-sm">Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Agent greeted caller, identified intent, collected required
                  information, and confirmed the appointment booking.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Call Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <Badge variant="outline" className="shrink-0">
                    Agent
                  </Badge>
                  <p>
                    Hello! Thank you for calling {data.businessName || 'us'}.
                    How can I help you today?
                  </p>
                </div>
                <div className="flex gap-3">
                  <Badge variant="secondary" className="shrink-0">
                    Caller
                  </Badge>
                  <p>
                    Hi, I would like to schedule an appointment for next week.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Badge variant="outline" className="shrink-0">
                    Agent
                  </Badge>
                  <p>
                    Of course! I would be happy to help you schedule an
                    appointment. Could you tell me your preferred date and time?
                  </p>
                </div>
                <div className="flex gap-3">
                  <Badge variant="secondary" className="shrink-0">
                    Caller
                  </Badge>
                  <p>How about Tuesday at 2pm?</p>
                </div>
                <div className="flex gap-3">
                  <Badge variant="outline" className="shrink-0">
                    Agent
                  </Badge>
                  <p>
                    Tuesday at 2pm works great. I have confirmed your
                    appointment. You will receive a confirmation shortly. Is
                    there anything else I can help with?
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
