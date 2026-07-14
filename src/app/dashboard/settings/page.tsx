"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Clock,
  ShieldCheck,
  Bell,
  AlertTriangle,
  Plus,
  Calendar,
  Trash2,
  Download,
  Power,
} from "lucide-react";

const operatingHours = [
  { day: "Monday", open: true, openTime: "8:00 AM", closeTime: "6:00 PM" },
  { day: "Tuesday", open: true, openTime: "8:00 AM", closeTime: "6:00 PM" },
  { day: "Wednesday", open: true, openTime: "8:00 AM", closeTime: "6:00 PM" },
  { day: "Thursday", open: true, openTime: "8:00 AM", closeTime: "6:00 PM" },
  { day: "Friday", open: true, openTime: "8:00 AM", closeTime: "6:00 PM" },
  { day: "Saturday", open: true, openTime: "9:00 AM", closeTime: "1:00 PM" },
  { day: "Sunday", open: false, openTime: "", closeTime: "" },
];

const holidays = [
  { date: "Dec 25", name: "Christmas" },
  { date: "Jan 1", name: "New Year's Day" },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your business profile, hours, compliance, and notifications.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <Building2 className="mr-1.5 size-4" />
            Business Profile
          </TabsTrigger>
          <TabsTrigger value="hours">
            <Clock className="mr-1.5 size-4" />
            Operating Hours
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <ShieldCheck className="mr-1.5 size-4" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-1.5 size-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="danger">
            <AlertTriangle className="mr-1.5 size-4" />
            Danger Zone
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Business Profile */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Business Profile</CardTitle>
              <CardDescription>
                Your business information used across the platform and in caller
                interactions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="business-name">Business Name</Label>
                <Input
                  id="business-name"
                  defaultValue="Acme Health Clinic"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="industry">Industry</Label>
                <div className="flex h-9 w-full items-center rounded-lg border border-input bg-transparent px-3 text-sm text-muted-foreground">
                  Healthcare
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    defaultValue="+1 (555) 123-4567"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue="info@acmeclinic.com"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  defaultValue="https://acmeclinic.com"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  defaultValue="123 Medical Drive, Suite 100, San Francisco, CA 94102"
                  className="min-h-20"
                />
              </div>

              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Operating Hours */}
        <TabsContent value="hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Operating Hours</CardTitle>
              <CardDescription>
                Set your business hours so the AI agent knows when to handle
                calls differently.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {operatingHours.map((item) => (
                  <div
                    key={item.day}
                    className="flex items-center gap-4 rounded-lg border p-3"
                  >
                    <span className="w-24 text-sm font-medium">
                      {item.day}
                    </span>
                    <div className="flex items-center gap-2">
                      <Switch defaultChecked={item.open} />
                      <span className="text-xs text-muted-foreground">
                        {item.open ? "Open" : "Closed"}
                      </span>
                    </div>
                    {item.open ? (
                      <div className="flex items-center gap-2 ml-auto">
                        <Input
                          defaultValue={item.openTime}
                          className="w-28 text-center text-sm"
                        />
                        <span className="text-sm text-muted-foreground">
                          to
                        </span>
                        <Input
                          defaultValue={item.closeTime}
                          className="w-28 text-center text-sm"
                        />
                      </div>
                    ) : (
                      <span className="ml-auto text-sm text-muted-foreground">
                        Closed all day
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <Separator />

              {/* Holiday Closures */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Holiday Closures</h4>
                    <p className="text-sm text-muted-foreground">
                      Days when the office is closed.
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-1.5 size-4" />
                    Add Holiday
                  </Button>
                </div>
                <div className="space-y-2">
                  {holidays.map((h) => (
                    <div
                      key={h.date}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2"
                    >
                      <Calendar className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{h.date}</span>
                      <span className="text-sm text-muted-foreground">
                        {h.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* After-hours message */}
              <div className="grid gap-2">
                <Label htmlFor="after-hours-msg">After-Hours Message</Label>
                <Textarea
                  id="after-hours-msg"
                  defaultValue="Thank you for calling. Our office is currently closed. Please leave a message and we will return your call during business hours, or call 911 if this is a medical emergency."
                  className="min-h-24"
                />
              </div>

              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Compliance */}
        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Settings</CardTitle>
              <CardDescription>
                Configure compliance and data handling requirements for your AI
                agent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Recording Consent</Label>
                  <p className="text-sm text-muted-foreground">
                    Require caller consent before recording
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>AI Disclosure</Label>
                  <p className="text-sm text-muted-foreground">
                    Inform callers they are speaking with an AI agent
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Data Retention Period</Label>
                  <p className="text-sm text-muted-foreground">
                    How long call data is stored before automatic deletion
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">90 days</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>HIPAA Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable HIPAA-compliant data handling
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Do Not Call List</Label>
                  <p className="text-sm text-muted-foreground">
                    Respect Do Not Call registry
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Choose which email notifications you want to receive.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Call Summary Emails</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a summary email after each call
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Daily Digest</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a daily summary of all call activity
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Escalation Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified immediately when a call is escalated
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Weekly Analytics Report</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a weekly report on call analytics and trends
                  </p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>System Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Important system notifications and downtime alerts
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="grid gap-2">
                <Label htmlFor="notification-email">Notification Email</Label>
                <Input
                  id="notification-email"
                  type="email"
                  defaultValue="admin@acmeclinic.com"
                />
              </div>

              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Danger Zone */}
        <TabsContent value="danger" className="space-y-4">
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that affect your account and data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-4">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-medium">Deactivate Agent</h4>
                  <p className="text-sm text-muted-foreground">
                    Temporarily disable the AI agent. No calls will be handled
                    until reactivated.
                  </p>
                </div>
                <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10">
                  <Power className="mr-1.5 size-4" />
                  Deactivate Agent
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-4">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-medium">Export Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Download all your call recordings, transcripts, and
                    analytics data as a ZIP file.
                  </p>
                </div>
                <Button variant="outline">
                  <Download className="mr-1.5 size-4" />
                  Export All Data
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-4">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-medium">Delete All Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete all call data, recordings, and
                    transcripts. This action cannot be undone.
                  </p>
                </div>
                <Button variant="destructive">
                  <Trash2 className="mr-1.5 size-4" />
                  Delete All Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
