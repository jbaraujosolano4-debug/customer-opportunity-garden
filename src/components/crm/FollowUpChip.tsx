import { CalendarClock } from "lucide-react";

import { cn } from "@/lib/utils";
import { followUpStatus, formatDate, relativeDay } from "@/lib/crm/model";

const STYLES = {
  overdue: "bg-destructive/10 text-destructive",
  today: "bg-warning/20 text-warning-foreground",
  upcoming: "bg-secondary text-secondary-foreground",
  none: "text-muted-foreground",
} as const;

export function FollowUpChip({ date, today, showDate = false }: { date: string; today: string; showDate?: boolean | undefined }) {
  const status = followUpStatus(date, today);
  if (status === "none") return <span className="text-xs text-muted-foreground">Sin agendar</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        STYLES[status],
      )}
      title={formatDate(date)}
    >
      <CalendarClock className="size-3" />
      {relativeDay(date, today)}
      {showDate && <span className="opacity-70">· {formatDate(date)}</span>}
    </span>
  );
}
