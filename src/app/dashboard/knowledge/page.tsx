"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Plus,
  Globe,
  FileText,
  PenLine,
  HelpCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Upload,
  Link,
  Database,
  Clock,
  Search,
  Loader2,
} from "lucide-react";

const sources = [
  {
    name: "acmeclinic.com",
    type: "Website Crawl",
    typeIcon: Globe,
    status: "Synced" as const,
    lastUpdated: "10 minutes ago",
    docCount: 47,
  },
  {
    name: "Insurance Guide",
    type: "PDF",
    typeIcon: FileText,
    status: "Processing" as const,
    lastUpdated: "1 hour ago",
    docCount: 12,
  },
  {
    name: "Office Hours",
    type: "Manual Entry",
    typeIcon: PenLine,
    status: "Synced" as const,
    lastUpdated: "3 days ago",
    docCount: 8,
  },
  {
    name: "FAQ Document",
    type: "FAQ",
    typeIcon: HelpCircle,
    status: "Error" as const,
    lastUpdated: "1 week ago",
    docCount: 89,
  },
];

const facts = [
  {
    field: "Business Name",
    value: "Acme Health Clinic",
    source: "Website Crawl",
    confidence: 98,
    verified: true,
  },
  {
    field: "Phone",
    value: "(555) 123-4567",
    source: "Website Crawl",
    confidence: 95,
    verified: true,
  },
  {
    field: "Hours",
    value: "Mon-Fri 8am-6pm",
    source: "Manual Entry",
    confidence: 100,
    verified: true,
  },
  {
    field: "Address",
    value: "123 Health Ave, Suite 200",
    source: "Website Crawl",
    confidence: 92,
    verified: true,
  },
  {
    field: "Insurance Accepted",
    value: "BlueCross, Aetna, United",
    source: "PDF",
    confidence: 88,
    verified: false,
  },
  {
    field: "Emergency Line",
    value: "(555) 999-0000",
    source: "Manual Entry",
    confidence: 100,
    verified: true,
  },
  {
    field: "Cancellation Policy",
    value: "24 hours notice required",
    source: "FAQ Document",
    confidence: 75,
    verified: false,
  },
  {
    field: "New Patient Forms",
    value: "Available online at portal",
    source: "Website Crawl",
    confidence: 82,
    verified: false,
  },
];

const conflicts = [
  {
    field: "Saturday Hours",
    sourceA: "Website Crawl",
    valueA: "9am-1pm",
    sourceB: "Manual Entry",
    valueB: "Closed",
  },
  {
    field: "Fax Number",
    sourceA: "PDF",
    valueA: "(555) 123-4568",
    sourceB: "Website Crawl",
    valueB: "(555) 123-9999",
  },
];

function getStatusBadge(status: "Synced" | "Processing" | "Error") {
  switch (status) {
    case "Synced":
      return (
        <Badge
          variant="outline"
          className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
        >
          <CheckCircle2 className="mr-1 size-3" />
          Synced
        </Badge>
      );
    case "Processing":
      return (
        <Badge
          variant="outline"
          className="border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400"
        >
          <Loader2 className="mr-1 size-3 animate-spin" />
          Processing
        </Badge>
      );
    case "Error":
      return (
        <Badge
          variant="outline"
          className="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
        >
          <XCircle className="mr-1 size-3" />
          Error
        </Badge>
      );
  }
}

function getConfidenceColor(confidence: number) {
  if (confidence >= 90) return "text-green-600";
  if (confidence >= 75) return "text-yellow-600";
  return "text-red-600";
}

export default function KnowledgePage() {
  const [addTab, setAddTab] = useState("url");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Manage sources, facts, and data that power your AI agent.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          Add Source
        </Button>
      </div>

      {/* Import Status */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Last sync:{" "}
                  <span className="font-medium text-foreground">
                    5 minutes ago
                  </span>
                </span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2">
                <Database className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    156 facts
                  </span>{" "}
                  indexed
                </span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-yellow-600" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    2 conflicts
                  </span>{" "}
                  found
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 size-4" />
              Sync Now
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sources List - takes 2 cols */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="size-5" />
                Sources
              </CardTitle>
              <CardDescription>
                Connected data sources for your knowledge base.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sources.map((source) => (
                  <div
                    key={source.name}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                        <source.typeIcon className="size-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{source.name}</p>
                          <Badge variant="secondary" className="text-xs">
                            {source.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Updated {source.lastUpdated} &middot;{" "}
                          {source.docCount} documents
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(source.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Facts Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="size-5" />
                    Extracted Facts
                  </CardTitle>
                  <CardDescription>
                    Key information extracted from your sources.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3 text-left font-medium text-muted-foreground">
                        Field
                      </th>
                      <th className="pb-3 text-left font-medium text-muted-foreground">
                        Value
                      </th>
                      <th className="pb-3 text-left font-medium text-muted-foreground">
                        Source
                      </th>
                      <th className="pb-3 text-left font-medium text-muted-foreground">
                        Confidence
                      </th>
                      <th className="pb-3 text-center font-medium text-muted-foreground">
                        Verified
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {facts.map((fact) => (
                      <tr key={fact.field} className="border-b last:border-0">
                        <td className="py-3 font-medium">{fact.field}</td>
                        <td className="py-3 text-muted-foreground">
                          {fact.value}
                        </td>
                        <td className="py-3">
                          <Badge variant="secondary" className="text-xs">
                            {fact.source}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <span
                            className={`font-medium ${getConfidenceColor(fact.confidence)}`}
                          >
                            {fact.confidence}%
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          {fact.verified ? (
                            <CheckCircle2 className="mx-auto size-4 text-green-600" />
                          ) : (
                            <XCircle className="mx-auto size-4 text-muted-foreground" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Add Source */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-5" />
                Add Source
              </CardTitle>
              <CardDescription>
                Import new data into your knowledge base.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={addTab} onValueChange={setAddTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="url" className="flex-1">
                    <Link className="mr-1.5 size-3.5" />
                    URL
                  </TabsTrigger>
                  <TabsTrigger value="file" className="flex-1">
                    <Upload className="mr-1.5 size-3.5" />
                    File
                  </TabsTrigger>
                  <TabsTrigger value="text" className="flex-1">
                    <PenLine className="mr-1.5 size-3.5" />
                    Text
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="url-input">Website URL</Label>
                    <Input
                      id="url-input"
                      placeholder="https://example.com"
                      type="url"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="crawl-depth">Crawl Depth</Label>
                    <Input
                      id="crawl-depth"
                      placeholder="3"
                      type="number"
                      defaultValue={3}
                    />
                  </div>
                  <Button className="w-full">
                    <Globe className="mr-2 size-4" />
                    Start Crawl
                  </Button>
                </TabsContent>

                <TabsContent value="file" className="mt-4 space-y-4">
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center">
                    <Upload className="mb-3 size-8 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Drop files here or click to browse
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      PDF, DOCX, TXT, CSV up to 10MB
                    </p>
                  </div>
                  <Button className="w-full">
                    <Upload className="mr-2 size-4" />
                    Upload File
                  </Button>
                </TabsContent>

                <TabsContent value="text" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="text-title">Title</Label>
                    <Input id="text-title" placeholder="e.g. Office Hours" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="text-content">Content</Label>
                    <Textarea
                      id="text-content"
                      placeholder="Enter facts or information..."
                      rows={5}
                    />
                  </div>
                  <Button className="w-full">
                    <PenLine className="mr-2 size-4" />
                    Save Entry
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Conflicts Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-yellow-600" />
                Conflicts
              </CardTitle>
              <CardDescription>
                Conflicting values that need resolution.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conflicts.map((conflict) => (
                  <div
                    key={conflict.field}
                    className="space-y-3 rounded-lg border border-yellow-200 bg-yellow-50/50 p-4 dark:border-yellow-900 dark:bg-yellow-950/30"
                  >
                    <p className="text-sm font-medium">{conflict.field}</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {conflict.sourceA}
                        </Badge>
                        <span className="text-right font-medium">
                          {conflict.valueA}
                        </span>
                      </div>
                      <div className="text-center text-muted-foreground">
                        vs
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {conflict.sourceB}
                        </Badge>
                        <span className="text-right font-medium">
                          {conflict.valueB}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      Resolve
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
