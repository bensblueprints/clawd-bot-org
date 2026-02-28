import type { Task } from "@/types/taskboard";

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
}

const priorityClass: Record<string, string> = {
  High: "bg-red/15 text-red",
  Medium: "bg-yellow/15 text-yellow",
  Low: "bg-green/15 text-green",
};

const dotClass: Record<string, string> = {
  claude: "bg-purple",
  team: "bg-orange",
  unassigned: "bg-border",
};

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const assigneeType = !task.assignee
    ? "unassigned"
    : task.assignee.toLowerCase().includes("claude")
    ? "claude"
    : "team";

  return (
    <div
      className="bg-bg border border-border rounded-lg p-3.5 cursor-pointer transition-colors hover:border-accent"
      onClick={() => onClick(task)}
    >
      <div className="text-[11px] text-text-muted mb-1.5">#{task.id}</div>
      <div className="text-sm font-medium mb-2 leading-snug">{task.title}</div>
      {task.description && (
        <div className="text-[12px] text-text-muted mb-2 leading-snug line-clamp-2">
          {task.description}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded bg-accent/12 text-accent"
            >
              {tag}
            </span>
          ))}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${priorityClass[task.priority] || priorityClass.Medium}`}>
            {task.priority}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-text-muted">
          <span className={`w-[7px] h-[7px] rounded-full inline-block ${dotClass[assigneeType]}`} />
          {task.assignee || "Unassigned"}
        </div>
      </div>
    </div>
  );
}
