import type { PipelineItem } from "@/types/pipeline";

interface PipelineCardProps {
  item: PipelineItem;
  onClick: (item: PipelineItem) => void;
}

const priorityClass: Record<string, string> = {
  High: "bg-red/15 text-red",
  Medium: "bg-yellow/15 text-yellow",
  Low: "bg-green/15 text-green",
};

const typeClass: Record<string, string> = {
  youtube: "bg-red/15 text-red",
  social: "bg-purple/15 text-purple",
  blog: "bg-accent/15 text-accent",
  other: "bg-text-muted/15 text-text-muted",
};

const typeLabel: Record<string, string> = {
  youtube: "YT",
  social: "Social",
  blog: "Blog",
  other: "Other",
};

const dotClass: Record<string, string> = {
  claude: "bg-purple",
  team: "bg-orange",
  unassigned: "bg-border",
};

export default function PipelineCard({ item, onClick }: PipelineCardProps) {
  const assigneeType = !item.assignee
    ? "unassigned"
    : item.assignee.toLowerCase().includes("claude")
    ? "claude"
    : "team";

  return (
    <div
      className="bg-bg border border-border rounded-lg p-3 cursor-pointer transition-colors hover:border-accent"
      onClick={() => onClick(item)}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-text-muted">#{item.id}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeClass[item.type] || typeClass.other}`}>
          {typeLabel[item.type] || "Other"}
        </span>
      </div>
      <div className="text-[13px] font-medium mb-1.5 leading-snug">{item.title}</div>
      {item.description && (
        <div className="text-[11px] text-text-muted mb-2 leading-snug line-clamp-2">
          {item.description}
        </div>
      )}
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${priorityClass[item.priority] || priorityClass.Medium}`}>
          {item.priority}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-text-muted">
          <span className={`w-[7px] h-[7px] rounded-full inline-block ${dotClass[assigneeType]}`} />
          {item.assignee || "Unassigned"}
        </span>
      </div>
    </div>
  );
}
