import type { PipelineItem, PipelineStage } from "@/types/pipeline";
import PipelineCard from "./PipelineCard";

interface PipelineColumnProps {
  stage: PipelineStage;
  items: PipelineItem[];
  onEdit: (item: PipelineItem) => void;
}

const stageColors: Record<string, string> = {
  Idea: "border-t-purple",
  Research: "border-t-teal",
  Outline: "border-t-accent",
  "Script/Draft": "border-t-yellow",
  "Media/Design": "border-t-pink",
  Review: "border-t-orange",
  Scheduled: "border-t-red",
  Published: "border-t-green",
};

export default function PipelineColumn({ stage, items, onEdit }: PipelineColumnProps) {
  return (
    <div className="bg-surface border border-border rounded-[10px] min-w-[220px] max-w-[260px] flex-1 flex flex-col">
      <div
        className={`px-3.5 py-3 border-b border-border flex items-center justify-between font-semibold text-[13px] border-t-[3px] rounded-t-[10px] ${stageColors[stage] || ""}`}
      >
        <span>{stage}</span>
        <span className="bg-border rounded-[10px] px-2 py-0.5 text-[11px] text-text-muted">
          {items.length}
        </span>
      </div>
      <div className="p-2.5 flex flex-col gap-2 min-h-[60px]">
        {items.length === 0 && (
          <div className="text-text-muted text-[12px] text-center py-5 italic">No content</div>
        )}
        {items.map((item) => (
          <PipelineCard key={item.id} item={item} onClick={onEdit} />
        ))}
      </div>
    </div>
  );
}
