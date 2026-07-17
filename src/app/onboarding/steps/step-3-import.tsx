'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Globe, Upload, FileText, Loader2, Info } from 'lucide-react';
import type { StepProps } from '../types';

export function Step3Import({ data, updateData }: StepProps) {
  const [importing, setImporting] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const url = data.smartImportUrl;
  const setUrl = (value: string) => updateData({ smartImportUrl: value });

  const handleImport = () => {
    setImportMessage(null);
    setImporting(true);
    // There is no website-scraping backend wired up yet. Rather than
    // fabricating plausible-looking business data with fake confidence
    // scores, fail honestly and let the user fill fields in manually.
    setTimeout(() => {
      setImporting(false);
      setImportMessage(
        "We couldn't find enough information at this URL. Smart import isn't able to extract data automatically yet — you can fill these fields in manually in the next steps."
      );
    }, 1200);
  };

  const toggleReview = (key: string) => {
    const current = data.importedData[key];
    if (!current) return;
    updateData({
      importedData: {
        ...data.importedData,
        [key]: { ...current, needsReview: !current.needsReview },
      },
    });
  };

  const importedEntries = Object.entries(data.importedData);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="size-5 text-primary" />
            <CardTitle>Import from Website</CardTitle>
          </div>
          <CardDescription>
            We will scan your website and extract business information
            automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="https://your-business.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleImport}
              disabled={importing || !url.trim()}
            >
              {importing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import'
              )}
            </Button>
          </div>
          {importMessage && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <Info className="mt-0.5 size-4 shrink-0" />
              <p>{importMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="size-5 text-primary" />
            <CardTitle>Upload Files</CardTitle>
          </div>
          <CardDescription>
            Drag and drop files or click to browse. Supports PDF, CSV, DOCX.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-6 py-10 text-center transition-colors hover:border-primary/50">
            <Upload className="mb-3 size-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              Drop files here or click to upload
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, CSV, DOCX up to 10MB
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            <CardTitle>Paste Text</CardTitle>
          </div>
          <CardDescription>
            Paste any text containing business information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Paste business information, menu items, service descriptions..."
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            className="min-h-24"
          />
        </CardContent>
      </Card>

      {importedEntries.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-base font-semibold">Extracted Fields</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium">Field</th>
                    <th className="px-4 py-2 text-left font-medium">Value</th>
                    <th className="px-4 py-2 text-left font-medium">Source</th>
                    <th className="px-4 py-2 text-left font-medium">
                      Confidence
                    </th>
                    <th className="px-4 py-2 text-center font-medium">
                      Needs Review
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {importedEntries.map(([key, field]) => (
                    <tr key={key} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </td>
                      <td className="px-4 py-2">{field.value}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline">{field.source}</Badge>
                      </td>
                      <td className="px-4 py-2">
                        <Badge
                          variant={
                            field.confidence >= 0.9
                              ? 'default'
                              : field.confidence >= 0.75
                                ? 'secondary'
                                : 'destructive'
                          }
                        >
                          {Math.round(field.confidence * 100)}%
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={field.needsReview}
                            onCheckedChange={() => toggleReview(key)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
