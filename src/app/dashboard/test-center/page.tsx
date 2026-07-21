"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Phone,
  PhoneOff,
  Play,
  CheckCircle2,
  XCircle,
  Minus,
  Send,
  FlaskConical,
  Loader2,
  History,
  Trash2,
  Mic,
  FileText,
  Wrench,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { LiveCallOrb, type LiveCallOrbState } from "@/components/shared/live-call-orb";

interface TestCall {
  id: string;
  status: string;
  duration_seconds: number | null;
  started_at: string;
  has_recording: boolean;
  has_transcript: boolean;
  tool_run_count: number;
  outcome_type: string | null;
  failed_reason: string | null;
}

interface AnalyzeResult {
  matched: boolean;
  intentName: string;
  intentCategory: string | null;
  confidence: number;
  suggestedResponse: string;
  note?: string;
}

// --- Mock data ---

interface Scenario {
  name: string;
  category: string;
  lastRun: string;
  result: "pass" | "fail" | "not_run";
}

const scenarios: Scenario[] = [
  {
    name: "Appointment booking flow",
    category: "Core",
    lastRun: "2 hours ago",
    result: "pass",
  },
  {
    name: "Insurance verification",
    category: "Core",
    lastRun: "2 hours ago",
    result: "pass",
  },
  {
    name: "Emergency escalation",
    category: "Safety",
    lastRun: "2 hours ago",
    result: "pass",
  },
  {
    name: "After-hours handling",
    category: "Routing",
    lastRun: "2 hours ago",
    result: "pass",
  },
  {
    name: "Spanish language",
    category: "Language",
    lastRun: "1 day ago",
    result: "fail",
  },
  {
    name: "Multiple intent",
    category: "NLU",
    lastRun: "1 day ago",
    result: "pass",
  },
  {
    name: "Angry caller",
    category: "Sentiment",
    lastRun: "3 days ago",
    result: "fail",
  },
  {
    name: "Transfer request",
    category: "Routing",
    lastRun: "Never",
    result: "not_run",
  },
];

const recentTests = [
  {
    timestamp: "Today, 2:30 PM",
    scenario: "Appointment booking flow",
    score: 95,
    passed: true,
  },
  {
    timestamp: "Today, 2:28 PM",
    scenario: "Insurance verification",
    score: 91,
    passed: true,
  },
  {
    timestamp: "Today, 2:25 PM",
    scenario: "Emergency escalation",
    score: 97,
    passed: true,
  },
  {
    timestamp: "Yesterday, 4:12 PM",
    scenario: "Spanish language",
    score: 62,
    passed: false,
  },
  {
    timestamp: "Yesterday, 4:10 PM",
    scenario: "Angry caller",
    score: 68,
    passed: false,
  },
];

const scoreBreakdown = [
  { label: "Intent Detection", score: 95 },
  { label: "Response Quality", score: 88 },
  { label: "Policy Compliance", score: 92 },
  { label: "Tool Usage", score: 90 },
  { label: "Conversation Flow", score: 89 },
];

const resultIcon: Record<Scenario["result"], React.ReactNode> = {
  pass: <CheckCircle2 className="size-4 text-success" />,
  fail: <XCircle className="size-4 text-destructive" />,
  not_run: <Minus className="size-4 text-muted-foreground" />,
};

const resultLabel: Record<Scenario["result"], string> = {
  pass: "Pass",
  fail: "Fail",
  not_run: "Not Run",
};

// --- Page ---

type BrowserCallStatus = "idle" | "connecting" | "ringing" | "in-call" | "ended" | "error";

function orbStateFor(status: BrowserCallStatus): LiveCallOrbState {
  if (status === "in-call") return "live";
  if (status === "connecting" || status === "ringing") return "ringing";
  return "idle";
}

export default function TestCenterPage() {
  const [callerInput, setCallerInput] = useState("");
  const [analyzedText, setAnalyzedText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  const [callStatus, setCallStatus] = useState<BrowserCallStatus>("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [callError, setCallError] = useState<string | null>(null);
  const deviceRef = useRef<import("@twilio/voice-sdk").Device | null>(null);
  const activeCallRef = useRef<import("@twilio/voice-sdk").Call | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [testCalls, setTestCalls] = useState<TestCall[]>([]);
  const [loadingTestCalls, setLoadingTestCalls] = useState(true);
  const [clearingTestData, setClearingTestData] = useState(false);

  async function loadTestCalls() {
    setLoadingTestCalls(true);
    try {
      const res = await fetch("/api/v1/test-center/calls");
      const body = await res.json();
      if (res.ok) setTestCalls(body.data ?? []);
    } catch {
      // Non-fatal — the section just stays empty; the live call itself isn't affected.
    } finally {
      setLoadingTestCalls(false);
    }
  }

  useEffect(() => {
    async function initialLoad() {
      await loadTestCalls();
    }
    initialLoad();
  }, []);

  async function handleClearTestData() {
    if (!confirm(`Delete all ${testCalls.length} test call(s) and everything they created (recordings, transcripts, bookings)? This can't be undone.`)) {
      return;
    }
    setClearingTestData(true);
    try {
      const res = await fetch("/api/v1/test-center/calls", { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Failed to clear test data.");
        return;
      }
      toast.success(`Cleared ${body.data.deleted_calls} test call(s).`);
      setTestCalls([]);
    } catch {
      toast.error("Failed to clear test data.");
    } finally {
      setClearingTestData(false);
    }
  }

  function formatTestCallDuration(seconds: number | null): string {
    if (seconds == null) return "--";
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  useEffect(() => {
    return () => {
      activeCallRef.current?.disconnect();
      deviceRef.current?.destroy();
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, []);

  function describeCallError(err: unknown): string {
    if (err instanceof Error && err.message) return err.message;
    if (err && typeof err === "object") {
      const anyErr = err as Record<string, unknown>;
      const parts = [anyErr.message, anyErr.code, anyErr.name]
        .filter((p) => typeof p === "string" && p.length > 0);
      if (parts.length > 0) return parts.join(", ");
      try {
        return JSON.stringify(err);
      } catch {
        // fall through
      }
    }
    return `Failed to start the call (unrecognized error: ${String(err)}).`;
  }

  async function handleStartBrowserCall() {
    setCallError(null);
    setCallStatus("connecting");
    try {
      const { Device } = await import("@twilio/voice-sdk");

      const res = await fetch("/api/v1/telephony/browser-token");
      const body = await res.json();
      if (!res.ok) {
        setCallStatus("error");
        setCallError(body.error ?? "Failed to get a calling token.");
        return;
      }

      const device = new Device(body.token, { logLevel: "debug" });
      deviceRef.current = device;

      device.on("error", (err: unknown) => {
        console.error("[live-test-call] Device error:", err);
        setCallStatus("error");
        setCallError(describeCallError(err));
      });
      device.on("tokenWillExpire", () => {
        console.warn("[live-test-call] Access token will expire soon");
      });

      const call = await device.connect({ params: { To: body.toNumber, IsTestCall: "true" } });
      activeCallRef.current = call;

      call.on("ringing", () => setCallStatus("ringing"));
      call.on("accept", () => {
        setCallStatus("in-call");
        setCallDuration(0);
        durationIntervalRef.current = setInterval(() => {
          setCallDuration((d) => d + 1);
        }, 1000);
      });
      call.on("disconnect", () => {
        setCallStatus("ended");
        if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
        // Give the call.ended webhook (recording/summary) a moment to land.
        setTimeout(loadTestCalls, 4000);
      });
      call.on("cancel", () => setCallStatus("ended"));
      call.on("reject", () => setCallStatus("ended"));
      call.on("error", (err: unknown) => {
        console.error("[live-test-call] Call error:", err);
        setCallStatus("error");
        setCallError(describeCallError(err));
      });
    } catch (err) {
      console.error("[live-test-call] handleStartBrowserCall threw:", err);
      setCallStatus("error");
      setCallError(describeCallError(err));
    }
  }

  function handleHangUp() {
    activeCallRef.current?.disconnect();
  }

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  async function handleAnalyze() {
    const text = callerInput.trim();
    if (!text) {
      toast.error("Enter a caller statement to analyze.");
      return;
    }

    setAnalyzing(true);
    try {
      const res = await fetch("/api/v1/test-center/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to analyze statement.");
        return;
      }

      setAnalyzedText(text);
      setResult(data as AnalyzeResult);
    } catch {
      toast.error("Failed to analyze statement. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Test Center</h1>
        <p className="text-muted-foreground">
          Test and evaluate your AI agent
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Text Simulator */}
        <Card>
          <CardHeader>
            <CardTitle>Text Simulator</CardTitle>
            <CardDescription>
              Test how your agent interprets caller statements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Type a caller statement..."
                value={callerInput}
                onChange={(e) => setCallerInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !analyzing) {
                    handleAnalyze();
                  }
                }}
              />
              <Button
                className="shrink-0 gap-2"
                onClick={handleAnalyze}
                disabled={analyzing || callerInput.trim().length === 0}
              >
                {analyzing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Analyze
              </Button>
            </div>

            <Separator />

            {/* Analysis result */}
            {result ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Detected Intent</span>
                  <Badge variant={result.matched ? "default" : "outline"}>
                    {result.intentName}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Confidence</span>
                  <span
                    className={`font-mono text-sm font-semibold tabular-nums ${
                      result.confidence >= 60
                        ? "text-success"
                        : result.confidence >= 30
                          ? "text-warning"
                          : "text-destructive"
                    }`}
                  >
                    {result.confidence}%
                  </span>
                </div>

                {/* Transcript bubbles (LiveCallOrb style) */}
                <div className="space-y-2">
                  {analyzedText ? (
                    <div className="flex justify-start">
                      <span className="inline-block rounded-lg bg-secondary px-3 py-2 text-sm leading-relaxed text-secondary-foreground">
                        {analyzedText}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-end">
                    <span className="inline-block rounded-lg border border-brand/20 bg-accent px-3 py-2 text-sm leading-relaxed text-accent-foreground">
                      {result.suggestedResponse}
                    </span>
                  </div>
                </div>

                {result.note && (
                  <p className="text-xs text-muted-foreground">{result.note}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Enter a caller statement above and click Analyze to see how
                your agent&apos;s active configuration would interpret it.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Live Browser Test Call */}
        <Card>
          <CardHeader>
            <CardTitle>Live Test Call</CardTitle>
            <CardDescription>
              Call your agent directly from this browser, a real call through your
              actual phone number and voice agent, no phone required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center rounded-lg border bg-muted/30 py-6">
              <LiveCallOrb
                size="md"
                state={orbStateFor(callStatus)}
                showTimer={false}
              />
            </div>

            {callStatus === "idle" || callStatus === "ended" || callStatus === "error" ? (
              <Button className="w-full gap-2" onClick={handleStartBrowserCall}>
                <Phone className="size-4" />
                Start Live Test Call
              </Button>
            ) : (
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={handleHangUp}
              >
                <PhoneOff className="size-4" />
                Hang Up
              </Button>
            )}

            <Separator />

            <div className="space-y-1 rounded-md border p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">
                  {callStatus === "in-call" ? "Connected" : callStatus.replace("-", " ")}
                </span>
              </div>
              {callStatus === "in-call" && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-mono tabular-nums">
                    {formatDuration(callDuration)}
                  </span>
                </div>
              )}
              {callStatus === "error" && callError && (
                <p className="text-sm text-destructive">{callError}</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Your browser will ask for microphone access. This routes through your
              real Twilio number and the same code path a real caller hits, just
              without dialing a phone.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Test Call History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="size-5" />
                Test Call History
              </CardTitle>
              <CardDescription>
                Recording, transcript, and every action your agent took during each Live
                Test Call — kept separate from real bookings and wipeable any time.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-2 text-destructive hover:text-destructive"
              onClick={handleClearTestData}
              disabled={clearingTestData || testCalls.length === 0}
            >
              {clearingTestData ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Clear Test Data
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTestCalls ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading test calls...
            </div>
          ) : testCalls.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No test calls yet — start a Live Test Call above and it will show up here
              with its recording, transcript, and any actions the agent took.
            </p>
          ) : (
            <div className="space-y-2">
              {testCalls.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/calls/${c.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">
                      {c.status.replace(/_/g, " ")}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(c.started_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {formatTestCallDuration(c.duration_seconds)}
                        {c.outcome_type ? ` · ${c.outcome_type.replace(/_/g, " ")}` : ""}
                      </p>
                      {c.failed_reason ? (
                        <p className="mt-0.5 max-w-md text-xs text-amber-600 dark:text-amber-500">
                          {c.failed_reason}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className={`flex items-center gap-1 ${c.has_recording ? "text-foreground" : ""}`}>
                      <Mic className="size-3.5" />
                      {c.has_recording ? "Recording" : "No recording"}
                    </span>
                    <span className={`flex items-center gap-1 ${c.has_transcript ? "text-foreground" : ""}`}>
                      <FileText className="size-3.5" />
                      {c.has_transcript ? "Transcript" : "No transcript"}
                    </span>
                    <span className={`flex items-center gap-1 ${c.tool_run_count > 0 ? "text-foreground" : ""}`}>
                      <Wrench className="size-3.5" />
                      {c.tool_run_count} action{c.tool_run_count === 1 ? "" : "s"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scenario Runner */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="size-5" />
                Scenario Runner
              </CardTitle>
              <CardDescription>
                Run predefined evaluation scenarios against your agent.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 font-medium">Scenario</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Last Run</th>
                  <th className="pb-2 text-right font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.name} className="border-b last:border-0">
                    <td className="py-2.5 font-medium">{s.name}</td>
                    <td className="py-2.5">
                      <Badge variant="outline">{s.category}</Badge>
                    </td>
                    <td className="py-2.5 font-mono text-muted-foreground">
                      {s.lastRun}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {resultIcon[s.result]}
                        <span
                          className={
                            s.result === "pass"
                              ? "text-success"
                              : s.result === "fail"
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }
                        >
                          {resultLabel[s.result]}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" className="gap-2">
              <Play className="size-4" />
              Run Selected
            </Button>
            <Button variant="brand" className="gap-2">
              <Play className="size-4" />
              Run All
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Test Results</CardTitle>
            <CardDescription>Latest evaluation runs.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTests.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">{t.scenario}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {t.timestamp}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      {t.score}/100
                    </span>
                    <Badge variant={t.passed ? "success" : "destructive"}>
                      {t.passed ? "Pass" : "Fail"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Score Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Score Breakdown</CardTitle>
            <CardDescription>
              Latest test score:{" "}
              <span className="font-mono font-semibold text-foreground">91/100</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {scoreBreakdown.map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-mono font-medium tabular-nums">
                    {item.score}%
                  </span>
                </div>
                <Progress value={item.score} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
