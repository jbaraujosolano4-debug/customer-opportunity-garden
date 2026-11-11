import { cn } from "@/lib/utils";
import { TONE_CLASSES, stageInfo } from "@/lib/crm/model";

export function StageBadge({ estado, className }: { estado: string; className?: string | undefined }) {
  const stage = stageInfo(estado);
  const tone = TONE_CLASSES[stage.tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        tone.badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone.dot)} />
      {stage.label}
    </span>
  );
}
