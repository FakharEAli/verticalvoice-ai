"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Hash, Loader2, Plus, Search, Star, Trash2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPhoneNumber, formatDateTime, humanize } from "@/lib/calls/display";

interface PhoneNumber {
  id: string;
  number: string;
  provider: string;
  status: string;
  created_at: string;
  is_default: boolean;
}

interface AvailableNumber {
  number: string;
  locality: string | null;
  region: string | null;
}

const TH =
  "px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground";

function StatusBadge({ isDefault, status }: { isDefault: boolean; status: string }) {
  if (isDefault) {
    return (
      <Badge className="gap-1">
        <Star className="size-3" aria-hidden="true" />
        Default
      </Badge>
    );
  }
  return <Badge variant="outline">{humanize(status)}</Badge>;
}

export function PhoneNumbersClient() {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);

  // Buy flow
  const [getOpen, setGetOpen] = useState(false);
  const [country, setCountry] = useState("US");
  const [areaCode, setAreaCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [available, setAvailable] = useState<AvailableNumber[] | null>(null);
  const [buyingNumber, setBuyingNumber] = useState<string | null>(null);

  // Release + default flow
  const [releaseTarget, setReleaseTarget] = useState<PhoneNumber | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [defaulting, setDefaulting] = useState<string | null>(null);

  async function fetchNumbers(): Promise<PhoneNumber[]> {
    const res = await fetch("/api/v1/telephony/numbers");
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Failed to load your phone numbers.");
    return body.data ?? [];
  }

  async function reload() {
    try {
      setNumbers(await fetchNumbers());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load your phone numbers.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchNumbers();
        if (!cancelled) setNumbers(data);
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Failed to load your phone numbers.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSearch() {
    setSearching(true);
    setAvailable(null);
    try {
      const params = new URLSearchParams({ country: country.trim() || "US" });
      if (areaCode.trim()) params.set("areaCode", areaCode.trim());
      const res = await fetch(`/api/v1/telephony/numbers/available?${params.toString()}`);
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Couldn't search for numbers.");
        return;
      }
      setAvailable(body.data ?? []);
    } catch {
      toast.error("Couldn't search for numbers.");
    } finally {
      setSearching(false);
    }
  }

  async function handleBuy(number: string) {
    setBuyingNumber(number);
    try {
      const res = await fetch("/api/v1/telephony/numbers/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Couldn't buy that number.");
        return;
      }
      toast.success(`${formatPhoneNumber(number)} is now yours.`);
      // Drop the bought number from the available list so it can't be clicked twice.
      setAvailable((list) => (list ? list.filter((n) => n.number !== number) : list));
      setGetOpen(false);
      await reload();
    } catch {
      toast.error("Couldn't buy that number.");
    } finally {
      setBuyingNumber(null);
    }
  }

  async function handleMakeDefault(target: PhoneNumber) {
    setDefaulting(target.id);
    // Optimistic: reflect the new default immediately.
    const previous = numbers;
    setNumbers((rows) =>
      rows.map((r) => ({
        ...r,
        is_default: r.id === target.id,
        status: r.id === target.id ? "active" : "inactive",
      })),
    );
    try {
      const res = await fetch(`/api/v1/telephony/numbers/${target.id}/make-default`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json();
        setNumbers(previous);
        toast.error(body.error ?? "Couldn't set that as the default.");
        return;
      }
      toast.success(`${formatPhoneNumber(target.number)} is now your default number.`);
      await reload();
    } catch {
      setNumbers(previous);
      toast.error("Couldn't set that as the default.");
    } finally {
      setDefaulting(null);
    }
  }

  async function handleRelease() {
    if (!releaseTarget) return;
    setReleasing(true);
    try {
      const res = await fetch(`/api/v1/telephony/numbers/${releaseTarget.id}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Couldn't release that number.");
        return;
      }
      toast.success(`${formatPhoneNumber(releaseTarget.number)} has been released.`);
      setReleaseTarget(null);
      await reload();
    } catch {
      toast.error("Couldn't release that number.");
    } finally {
      setReleasing(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-end">
        <Button
          onClick={() => {
            setAvailable(null);
            setGetOpen(true);
          }}
        >
          <Plus className="mr-2 size-4" aria-hidden="true" />
          Get a number
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className={TH}>Number</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Provider</th>
                  <th className={TH}>Added</th>
                  <th className={TH}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      <Loader2 className="mx-auto mb-2 size-5 animate-spin" aria-hidden="true" />
                      Loading phone numbers...
                    </td>
                  </tr>
                )}

                {!loading && numbers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <Hash
                        className="mx-auto mb-3 size-8 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <p className="font-medium">No phone numbers yet.</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Get your first number so your AI has a line to answer and call from.
                      </p>
                    </td>
                  </tr>
                )}

                {!loading &&
                  numbers.map((n) => (
                    <tr key={n.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono tabular-nums">
                        {formatPhoneNumber(n.number)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge isDefault={n.is_default} status={n.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{humanize(n.provider)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(n.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {!n.is_default && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={defaulting === n.id}
                              onClick={() => handleMakeDefault(n)}
                            >
                              {defaulting === n.id ? (
                                <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" />
                              ) : (
                                <Star className="mr-1.5 size-4" aria-hidden="true" />
                              )}
                              Make default
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setReleaseTarget(n)}
                            aria-label={`Release ${n.number}`}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {!loading && numbers.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {numbers.length} number{numbers.length === 1 ? "" : "s"}
        </p>
      )}

      {/* Get a number */}
      <Dialog open={getOpen} onOpenChange={setGetOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Get a number</DialogTitle>
            <DialogDescription>
              Search available numbers by country and, optionally, area code. Buying a number costs
              about $1/month.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-end gap-2">
            <div className="w-24 space-y-1.5">
              <Label htmlFor="pn-country">Country</Label>
              <Input
                id="pn-country"
                placeholder="US"
                maxLength={2}
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="pn-area">Area code (optional)</Label>
              <Input
                id="pn-area"
                placeholder="361"
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
            </div>
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="mr-2 size-4" aria-hidden="true" />
              )}
              Search
            </Button>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {available === null && !searching && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Search to see numbers you can buy.
              </p>
            )}
            {available !== null && available.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No numbers available for that search. Try a different area code or country.
              </p>
            )}
            {available && available.length > 0 && (
              <ul className="divide-y divide-border">
                {available.map((n) => (
                  <li key={n.number} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <div className="font-mono tabular-nums">{formatPhoneNumber(n.number)}</div>
                      <div className="text-xs text-muted-foreground">
                        {[n.locality, n.region].filter(Boolean).join(", ") || "Location unavailable"}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={buyingNumber !== null}
                      onClick={() => handleBuy(n.number)}
                    >
                      {buyingNumber === n.number ? (
                        <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Plus className="mr-1.5 size-4" aria-hidden="true" />
                      )}
                      Buy
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Release confirm */}
      <Dialog open={releaseTarget !== null} onOpenChange={(open) => !open && setReleaseTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Release this number?</DialogTitle>
            <DialogDescription>
              {releaseTarget && (
                <>
                  {formatPhoneNumber(releaseTarget.number)} will be given up and can&apos;t be
                  recovered. Your AI will no longer answer or call from it.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseTarget(null)} disabled={releasing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRelease} disabled={releasing}>
              {releasing && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              Release number
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
