"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TestBadge } from "@/components/shared/test-badge";
import { cn } from "@/lib/utils";

/** One plain-English label/value pair shown in an operations detail sheet. */
export interface DetailField {
  label: string;
  value: string;
}

export interface DetailLineItem {
  name: string;
  quantity: number;
  price?: string;
  note?: string;
}

/**
 * The Operations tab is about the *operation* — the order, the reservation,
 * the maintenance request — not the call it arrived on. Clicking a row opens
 * this drawer with that item's own details in plain English; the call detail
 * page is one deliberate click further, for anyone who wants it.
 */
export function OperationsItem({
  triggerContent,
  title,
  subtitle,
  fields,
  lineItems,
  callId,
  isTest = false,
  triggerClassName,
}: {
  triggerContent: ReactNode;
  title: string;
  subtitle?: string;
  fields: DetailField[];
  lineItems?: DetailLineItem[];
  callId: string | null;
  isTest?: boolean;
  triggerClassName?: string;
}) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            type="button"
            className={cn(
              "cursor-pointer text-left hover:underline focus-visible:underline focus-visible:outline-none",
              triggerClassName,
            )}
          />
        }
      >
        {triggerContent}
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {title}
            {isTest && <TestBadge />}
          </SheetTitle>
          {subtitle ? <SheetDescription>{subtitle}</SheetDescription> : null}
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 px-4 pb-4">
          {fields.length > 0 && (
            <dl className="grid gap-3">
              {fields.map((f) => (
                <div key={f.label} className="grid gap-0.5">
                  <dt className="text-xs text-muted-foreground">{f.label}</dt>
                  <dd className="text-sm text-foreground">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {lineItems && lineItems.length > 0 && (
            <div className="grid gap-2">
              <p className="text-xs text-muted-foreground">Items ordered</p>
              <ul className="grid gap-2 rounded-lg border p-3">
                {lineItems.map((item, i) => (
                  <li key={`${item.name}-${i}`} className="flex items-start justify-between gap-3 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium">
                        {item.quantity} × {item.name}
                      </span>
                      {item.note ? (
                        <span className="block text-xs text-muted-foreground">{item.note}</span>
                      ) : null}
                    </span>
                    {item.price ? <span className="shrink-0 tabular-nums">{item.price}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {callId && (
            <>
              <Separator />
              <Button
                variant="outline"
                className="w-full"
                render={<Link href={`/dashboard/calls/${callId}`} />}
              >
                View call details
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
