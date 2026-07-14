import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  PhoneIncoming,
  Clock,
  DollarSign,
  CheckCircle,
  Wrench,
} from "lucide-react";

const callMeta = {
  id: "call-001",
  dateTime: "Jul 14, 2026 at 2:34 PM",
  duration: "3:45",
  direction: "Inbound",
  phone: "+1 (555) 987-6543",
  caller: "Sarah Johnson",
  cost: "$0.12",
};

const summary =
  "The caller requested to schedule a follow-up appointment with Dr. Patel for next week. The AI agent verified the caller's identity, checked available time slots in the calendar system, and confirmed a Tuesday 10:00 AM appointment. The caller also asked about preparation instructions for their upcoming blood work, which the agent retrieved from the EHR system and communicated clearly.";

const timeline = [
  { time: "0:00", event: "Call Started", detail: "Inbound call connected" },
  { time: "0:03", event: "Greeting", detail: "Agent delivered welcome message" },
  { time: "0:15", event: "Intent Detected", detail: "Appointment scheduling identified" },
  { time: "0:42", event: "Tool Run: Check Appointment", detail: "Queried calendar for availability" },
  { time: "1:18", event: "Response Given", detail: "Offered Tuesday 10:00 AM slot" },
  { time: "2:05", event: "Tool Run: Book Appointment", detail: "Confirmed and booked appointment" },
  { time: "2:30", event: "Tool Run: Get Prep Instructions", detail: "Retrieved blood work preparation info from EHR" },
  { time: "3:20", event: "Response Given", detail: "Communicated prep instructions to caller" },
  { time: "3:45", event: "Call Ended", detail: "Caller confirmed and hung up" },
];

const transcript = [
  { speaker: "Agent", text: "Thank you for calling Greenfield Medical. My name is Alex, your virtual assistant. How can I help you today?" },
  { speaker: "Caller", text: "Hi, I'd like to schedule a follow-up appointment with Dr. Patel, please." },
  { speaker: "Agent", text: "Of course! I'd be happy to help you schedule that. Can I get your name and date of birth for verification?" },
  { speaker: "Caller", text: "Sure, it's Sarah Johnson, date of birth March 15, 1988." },
  { speaker: "Agent", text: "Thank you, Sarah. I've verified your account. Let me check Dr. Patel's availability for next week. One moment please." },
  { speaker: "Agent", text: "I have several openings. Would Tuesday at 10:00 AM or Thursday at 2:30 PM work for you?" },
  { speaker: "Caller", text: "Tuesday at 10 works perfectly." },
  { speaker: "Agent", text: "Great, I've booked you for Tuesday, July 21st at 10:00 AM with Dr. Patel. You'll receive a confirmation text shortly. Is there anything else I can help with?" },
  { speaker: "Caller", text: "Actually yes -- I have blood work scheduled before that. Are there any prep instructions?" },
  { speaker: "Agent", text: "Let me pull that up for you. For your comprehensive metabolic panel, you'll need to fast for 8 to 12 hours before the blood draw. Only water is permitted during the fasting period. Avoid alcohol for 24 hours prior." },
  { speaker: "Caller", text: "Got it, thank you so much!" },
  { speaker: "Agent", text: "You're welcome, Sarah! Have a great day." },
];

const toolRuns = [
  { name: "check_appointment_availability", input: "doctor: Dr. Patel, week: next", result: "3 slots available: Tue 10:00 AM, Thu 2:30 PM, Fri 9:00 AM" },
  { name: "book_appointment", input: "patient: Sarah Johnson, slot: Tue Jul 21 10:00 AM", result: "Appointment confirmed, confirmation SMS sent" },
  { name: "get_prep_instructions", input: "test: Comprehensive Metabolic Panel", result: "Fast 8-12 hours, water only, no alcohol 24h prior" },
];

const evalScores = {
  overall: 92,
  breakdown: [
    { label: "Accuracy", score: 95 },
    { label: "Tone", score: 88 },
    { label: "Resolution", score: 90 },
    { label: "Speed", score: 94 },
  ],
};

const policyEvents = [
  { name: "AI Disclosure", status: "Passed" },
  { name: "Recording Consent", status: "Passed" },
];

function scoreBarColor(score: number) {
  if (score >= 90) return "bg-green-500";
  if (score >= 75) return "bg-yellow-500";
  return "bg-red-500";
}

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Button variant="ghost" size="sm" render={<Link href="/dashboard/calls" className="gap-2" />}>
            <ArrowLeft className="size-4" />
            Back to Calls
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{callMeta.caller}</h1>
          <p className="text-muted-foreground">Call {id}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="default">Appointment</Badge>
          <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400">Resolved</Badge>
        </div>
      </div>

      {/* Call Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Call Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Date / Time</p>
                <p className="text-sm font-medium">{callMeta.dateTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-sm font-medium">{callMeta.duration}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PhoneIncoming className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Direction</p>
                <p className="text-sm font-medium">{callMeta.direction}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PhoneIncoming className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{callMeta.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Cost</p>
                <p className="text-sm font-medium">{callMeta.cost}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Event sequence during the call</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative ml-3 space-y-0">
              {timeline.map((entry, i) => (
                <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* Vertical line */}
                  {i < timeline.length - 1 && (
                    <div className="absolute left-[5px] top-3 h-full w-px bg-border" />
                  )}
                  {/* Dot */}
                  <div className="relative z-10 mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-primary bg-background" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{entry.time}</span>
                      <span className="text-sm font-medium">{entry.event}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{entry.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Evaluation Score + Policy */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Score</CardTitle>
              <CardDescription>AI performance assessment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 text-center">
                <span className="text-4xl font-bold">{evalScores.overall}</span>
                <span className="text-lg text-muted-foreground">/100</span>
              </div>
              <div className="space-y-3">
                {evalScores.breakdown.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{item.label}</span>
                      <span className="font-medium">{item.score}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full ${scoreBarColor(item.score)}`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Policy Events */}
          <Card>
            <CardHeader>
              <CardTitle>Policy Checks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {policyEvents.map((event) => (
                  <div key={event.name} className="flex items-center justify-between">
                    <span className="text-sm">{event.name}</span>
                    <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                      <CheckCircle className="size-4" />
                      <span className="text-sm font-medium">{event.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transcript */}
      <Card>
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transcript.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.speaker === "Agent" ? "" : "flex-row-reverse"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${
                    msg.speaker === "Agent"
                      ? "bg-muted"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  <p className="mb-1 text-xs font-semibold opacity-70">{msg.speaker}</p>
                  <p className="leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tool Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Tool Executions</CardTitle>
          <CardDescription>Functions called by the agent during this call</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {toolRuns.map((tool, i) => (
              <div key={i}>
                <div className="flex items-start gap-3">
                  <Wrench className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium font-mono">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">Input: {tool.input}</p>
                    <p className="text-xs text-muted-foreground">Result: {tool.result}</p>
                  </div>
                </div>
                {i < toolRuns.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audio Player */}
      <Card>
        <CardHeader>
          <CardTitle>Recording</CardTitle>
        </CardHeader>
        <CardContent>
          <audio controls className="w-full" src="#">
            Your browser does not support the audio element.
          </audio>
        </CardContent>
      </Card>
    </div>
  );
}
