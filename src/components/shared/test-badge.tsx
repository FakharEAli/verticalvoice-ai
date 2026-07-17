import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Marks a call — or a booking/lead a call produced — as originating from a
 * Test Center Live Test Call rather than a real customer. Test data is shown
 * everywhere real data is, so this badge is the single visual signal that
 * keeps the two distinguishable at a glance.
 */
export function TestBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-warning/40 text-warning [&>svg]:size-3",
        className,
      )}
    >
      <FlaskConical aria-hidden="true" />
      Test
    </Badge>
  );
}
