"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Phone,
  Play,
  CheckCircle2,
  XCircle,
  Minus,
  Send,
  FlaskConical,
  Loader2,
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
  pass: <CheckCircle2 className="size-4 text-green-500" />,
  fail: <XCircle className="size-4 text-red-500" />,
  not_run: <Minus className="size-4 text-muted-foreground" />,
};

const resultLabel: Record<Scenario["result"], string> = {
  pass: "Pass",
  fail: "Fail",
  not_run: "Not Run",
};

// --- Page ---

export default function TestCenterPage() {
  const [callerInput, setCallerInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);

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
                className="gap-2 shrink-0"
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
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Detected Intent</span>
                  <Badge variant={result.matched ? "default" : "outline"}>
                    {result.intentName}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Confidence</span>
                  <span
                    className={`text-sm font-semibold ${
                      result.confidence >= 60
                        ? "text-green-600"
                        : result.confidence >= 30
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  >
                    {result.confidence}%
                  </span>
                </div>
                <div className="space-y-1.5">
                  <span className="text-sm font-medium">Suggested Response</span>
                  <div className="rounded-md border p-3 text-sm text-muted-foreground bg-muted/50">
                    &quot;{result.suggestedResponse}&quot;
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

        {/* Test Call */}
        <Card>
          <CardHeader>
            <CardTitle>Test Call</CardTitle>
            <CardDescription>
              Initiate a live test call to evaluate your agent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="Phone number for test call" />
              <Button className="gap-2 shrink-0">
                <Phone className="size-4" />
                Initiate Test Call
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Last Test Call</p>
              <div className="rounded-md border p-3 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Time</span>
                  <span>2 hours ago</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span>1:23</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Score</span>
                  <span className="font-semibold">91/100</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Scenario</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Last Run</th>
                  <th className="pb-2 font-medium text-right">Result</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.name} className="border-b last:border-0">
                    <td className="py-2.5 font-medium">{s.name}</td>
                    <td className="py-2.5">
                      <Badge variant="outline">{s.category}</Badge>
                    </td>
                    <td className="py-2.5 text-muted-foreground">
                      {s.lastRun}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {resultIcon[s.result]}
                        <span
                          className={
                            s.result === "pass"
                              ? "text-green-600"
                              : s.result === "fail"
                                ? "text-red-600"
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

          <div className="flex gap-2 justify-end">
            <Button variant="outline" className="gap-2">
              <Play className="size-4" />
              Run Selected
            </Button>
            <Button className="gap-2">
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
                    <p className="text-xs text-muted-foreground">
                      {t.timestamp}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{t.score}/100</span>
                    <Badge
                      variant={t.passed ? "default" : "destructive"}
                    >
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
              <span className="font-semibold text-foreground">91/100</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {scoreBreakdown.map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.score}%</span>
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
