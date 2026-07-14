"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart,
  UtensilsCrossed,
  Building2,
  CalendarCheck,
  Clock,
  Pill,
  ShieldCheck,
  Users,
  ChefHat,
  ClipboardList,
  Megaphone,
  Home,
  Eye,
  Wrench,
} from "lucide-react";

// ── Healthcare mock data ──────────────────────────────────────────────

const appointments = [
  { patient: "Sarah Johnson", date: "Jul 15", time: "9:00 AM", type: "Follow-up", status: "Confirmed" },
  { patient: "Michael Chen", date: "Jul 15", time: "10:30 AM", type: "New Patient", status: "Pending" },
  { patient: "Emily Davis", date: "Jul 15", time: "1:00 PM", type: "Annual Check", status: "Confirmed" },
  { patient: "Robert Wilson", date: "Jul 16", time: "11:00 AM", type: "Consultation", status: "Cancelled" },
  { patient: "Lisa Thompson", date: "Jul 16", time: "2:30 PM", type: "Follow-up", status: "Pending" },
];

const waitlist = [
  { patient: "James Brown", requestedDate: "Jul 14", priority: "High" },
  { patient: "Amanda Lee", requestedDate: "Jul 15", priority: "Medium" },
  { patient: "David Park", requestedDate: "Jul 17", priority: "Low" },
];

const refillRequests = [
  { patient: "Karen White", medication: "Lisinopril 10mg", status: "Approved" },
  { patient: "Tom Garcia", medication: "Metformin 500mg", status: "Pending" },
  { patient: "Nancy Hall", medication: "Atorvastatin 20mg", status: "Approved" },
  { patient: "Chris Martin", medication: "Omeprazole 20mg", status: "Denied" },
];

const insuranceQueue = [
  { patient: "Julia Roberts", provider: "Blue Cross", status: "Verified" },
  { patient: "Mark Stevens", provider: "Aetna", status: "Pending" },
  { patient: "Sandra Kim", provider: "United Health", status: "Failed" },
];

// ── Restaurant mock data ──────────────────────────────────────────────

const reservations = [
  { name: "Smith Party", size: 4, datetime: "Jul 15, 7:00 PM", status: "Confirmed", notes: "Window seat" },
  { name: "Johnson", size: 2, datetime: "Jul 15, 7:30 PM", status: "Confirmed", notes: "Anniversary" },
  { name: "Williams Group", size: 8, datetime: "Jul 15, 8:00 PM", status: "Waitlisted", notes: "Private room" },
  { name: "Davis", size: 3, datetime: "Jul 16, 6:30 PM", status: "Confirmed", notes: "" },
  { name: "Brown Family", size: 6, datetime: "Jul 16, 7:00 PM", status: "Cancelled", notes: "Rescheduling" },
];

const orders = [
  { id: "#1042", items: 3, status: "Preparing", time: "12 min ago" },
  { id: "#1043", items: 5, status: "Ready", time: "8 min ago" },
  { id: "#1044", items: 2, status: "Preparing", time: "5 min ago" },
  { id: "#1045", items: 4, status: "Delivered", time: "2 min ago" },
];

const cateringLeads = [
  { name: "Corporate Event Co.", eventDate: "Aug 5", partySize: 50, status: "Proposal Sent" },
  { name: "Maria's Wedding", eventDate: "Sep 12", partySize: 120, status: "Initial Inquiry" },
  { name: "Tech Startup Lunch", eventDate: "Jul 28", partySize: 25, status: "Confirmed" },
];

// ── Real Estate mock data ──────────────────────────────────────────────

const leads = [
  { name: "Alex Turner", interest: "3BR Family Home", budget: "$450K", source: "Website", status: "Hot" },
  { name: "Priya Patel", interest: "Downtown Condo", budget: "$320K", source: "Zillow", status: "Warm" },
  { name: "Jake Morrison", interest: "Investment Property", budget: "$600K", source: "Referral", status: "Hot" },
  { name: "Carol White", interest: "Starter Home", budget: "$250K", source: "Call-In", status: "Cold" },
  { name: "Sam Nguyen", interest: "Luxury Estate", budget: "$1.2M", source: "Website", status: "Warm" },
];

const showings = [
  { property: "123 Oak St", client: "Alex Turner", datetime: "Jul 15, 2:00 PM", agent: "Sarah M." },
  { property: "456 Pine Ave", client: "Priya Patel", datetime: "Jul 15, 4:00 PM", agent: "John D." },
  { property: "789 Elm Dr", client: "Jake Morrison", datetime: "Jul 16, 10:00 AM", agent: "Sarah M." },
  { property: "321 Maple Ln", client: "Sam Nguyen", datetime: "Jul 16, 1:00 PM", agent: "Lisa K." },
];

const listings = [
  { address: "123 Oak Street, Apt 4B", price: "$425,000", status: "Active" },
  { address: "456 Pine Avenue", price: "$675,000", status: "Pending" },
  { address: "789 Elm Drive", price: "$350,000", status: "Active" },
];

const maintenance = [
  { property: "321 Maple Ln, Unit 2", issue: "Leaking faucet", priority: "Medium", status: "In Progress" },
  { property: "123 Oak St, Apt 7A", issue: "HVAC not cooling", priority: "High", status: "Scheduled" },
  { property: "456 Pine Ave", issue: "Garage door sensor", priority: "Low", status: "Open" },
];

// ── Helpers ──────────────────────────────────────────────────

function statusBadge(status: string) {
  const variants: Record<string, string> = {
    Confirmed: "border-green-500 text-green-600",
    Verified: "border-green-500 text-green-600",
    Approved: "border-green-500 text-green-600",
    Active: "border-green-500 text-green-600",
    Ready: "border-green-500 text-green-600",
    Delivered: "border-green-500 text-green-600",
    Pending: "border-amber-500 text-amber-600",
    Waitlisted: "border-amber-500 text-amber-600",
    "In Progress": "border-amber-500 text-amber-600",
    "Proposal Sent": "border-amber-500 text-amber-600",
    "Initial Inquiry": "border-blue-500 text-blue-600",
    Scheduled: "border-blue-500 text-blue-600",
    Preparing: "border-blue-500 text-blue-600",
    Cancelled: "border-red-500 text-red-600",
    Denied: "border-red-500 text-red-600",
    Failed: "border-red-500 text-red-600",
    Open: "border-muted-foreground text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={variants[status] ?? ""}>
      {status}
    </Badge>
  );
}

function priorityBadge(priority: string) {
  const variants: Record<string, string> = {
    High: "border-red-500 text-red-600",
    Medium: "border-amber-500 text-amber-600",
    Low: "border-muted-foreground text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={variants[priority] ?? ""}>
      {priority}
    </Badge>
  );
}

function leadStatusBadge(status: string) {
  const variants: Record<string, string> = {
    Hot: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    Warm: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    Cold: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  };
  return (
    <Badge className={variants[status] ?? ""}>
      {status}
    </Badge>
  );
}

// ── Page ──────────────────────────────────────────────────

export default function OperationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Industry Operations</h1>
        <p className="text-muted-foreground">
          Manage industry-specific workflows handled by your AI agent.
        </p>
      </div>

      <Tabs defaultValue="healthcare" className="space-y-6">
        <TabsList>
          <TabsTrigger value="healthcare" className="flex items-center gap-1.5">
            <Heart className="size-4" />
            Healthcare
          </TabsTrigger>
          <TabsTrigger value="restaurant" className="flex items-center gap-1.5">
            <UtensilsCrossed className="size-4" />
            Restaurant
          </TabsTrigger>
          <TabsTrigger value="realestate" className="flex items-center gap-1.5">
            <Building2 className="size-4" />
            Real Estate
          </TabsTrigger>
        </TabsList>

        {/* ── Healthcare ── */}
        <TabsContent value="healthcare" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Appointments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarCheck className="size-5" />
                  Appointments
                </CardTitle>
                <CardDescription>Upcoming scheduled appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Patient</th>
                        <th className="pb-2 font-medium">Date</th>
                        <th className="pb-2 font-medium">Time</th>
                        <th className="pb-2 font-medium">Type</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((a, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 font-medium">{a.patient}</td>
                          <td className="py-2">{a.date}</td>
                          <td className="py-2">{a.time}</td>
                          <td className="py-2">{a.type}</td>
                          <td className="py-2">{statusBadge(a.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Waitlist */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="size-5" />
                  Waitlist
                </CardTitle>
                <CardDescription>Patients waiting for openings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {waitlist.map((w, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{w.patient}</p>
                      <p className="text-xs text-muted-foreground">Requested: {w.requestedDate}</p>
                    </div>
                    {priorityBadge(w.priority)}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Refill Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="size-5" />
                  Refill Requests
                </CardTitle>
                <CardDescription>Prescription refill queue</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {refillRequests.map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{r.patient}</p>
                      <p className="text-xs text-muted-foreground">{r.medication}</p>
                    </div>
                    {statusBadge(r.status)}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Insurance Queue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-5" />
                  Insurance Queue
                </CardTitle>
                <CardDescription>Verification requests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {insuranceQueue.map((q, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{q.patient}</p>
                      <p className="text-xs text-muted-foreground">{q.provider}</p>
                    </div>
                    {statusBadge(q.status)}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Restaurant ── */}
        <TabsContent value="restaurant" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Reservations */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-5" />
                  Reservations
                </CardTitle>
                <CardDescription>Upcoming table reservations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Name</th>
                        <th className="pb-2 font-medium">Party Size</th>
                        <th className="pb-2 font-medium">Date/Time</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservations.map((r, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 font-medium">{r.name}</td>
                          <td className="py-2">{r.size}</td>
                          <td className="py-2">{r.datetime}</td>
                          <td className="py-2">{statusBadge(r.status)}</td>
                          <td className="py-2 text-muted-foreground">{r.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Active Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="size-5" />
                  Active Orders
                </CardTitle>
                <CardDescription>Current order queue</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {orders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{o.id}</p>
                      <p className="text-xs text-muted-foreground">{o.items} items &middot; {o.time}</p>
                    </div>
                    {statusBadge(o.status)}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Menu + Catering */}
            <div className="space-y-6">
              {/* Menu Sync */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="size-5" />
                    Menu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">48</p>
                      <p className="text-xs text-muted-foreground">Menu items synced</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Last sync</p>
                      <p className="text-sm font-medium">2 hours ago</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Catering Leads */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="size-5" />
                    Catering Leads
                  </CardTitle>
                  <CardDescription>Incoming catering inquiries</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cateringLeads.map((c, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.eventDate} &middot; {c.partySize} guests
                        </p>
                      </div>
                      {statusBadge(c.status)}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Real Estate ── */}
        <TabsContent value="realestate" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Leads */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-5" />
                  Leads
                </CardTitle>
                <CardDescription>Incoming buyer and seller leads</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Name</th>
                        <th className="pb-2 font-medium">Interest</th>
                        <th className="pb-2 font-medium">Budget</th>
                        <th className="pb-2 font-medium">Source</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((l, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 font-medium">{l.name}</td>
                          <td className="py-2">{l.interest}</td>
                          <td className="py-2">{l.budget}</td>
                          <td className="py-2">{l.source}</td>
                          <td className="py-2">{leadStatusBadge(l.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Showings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="size-5" />
                  Upcoming Showings
                </CardTitle>
                <CardDescription>Scheduled property viewings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {showings.map((s, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{s.property}</p>
                      <p className="text-xs text-muted-foreground">{s.agent}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.client} &middot; {s.datetime}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Listings + Maintenance */}
            <div className="space-y-6">
              {/* Listings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="size-5" />
                    Active Listings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {listings.map((l, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{l.address}</p>
                        <p className="text-sm text-muted-foreground">{l.price}</p>
                      </div>
                      {statusBadge(l.status)}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Maintenance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="size-5" />
                    Maintenance Requests
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {maintenance.map((m, i) => (
                    <div key={i} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{m.property}</p>
                        {priorityBadge(m.priority)}
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{m.issue}</p>
                        {statusBadge(m.status)}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
