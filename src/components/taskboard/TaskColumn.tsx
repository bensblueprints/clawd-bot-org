import type { Task, TaskStatus } from "@/types/taskboard";
import TaskCard from "./TaskCard";

interface TaskColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onEditTask: (task: Task) => void;
}

const colColors: Record<string, string> = {
  Backlog: "border-t-text-muted",
  "To Do": "border-t-accent",
  "In Progress": "border-t-yellow",
  "In Review": "border-t-purple",
  Done: "border-t-green",
};

export default function TaskColumn({ status, tasks, onEditTask }: TaskColumnProps) {
  return (
    <div className="bg-surface border border-border rounded-[10px] min-w-[280px] max-w-[320px] flex-1 flex flex-col">
      <div
        className={`px-4 py-3.5 border-b border-border flex items-center justify-between font-semibold text-sm border-t-[3px] rounded-t-[10px] ${colColors[status] || ""}`}
      >
        <span>{status}</span>
        <span className="bg-border rounded-[10px] px-2 py-0.5 text-xs text-text-muted">
          {tasks.length}
        </span>
      </div>
      <div className="p-3 flex flex-col gap-2.5 min-h-[80px]">
        {tasks.length === 0 && (
          <div className="text-text-muted text-[13px] text-center py-5 italic">No tasks</div>
        )}
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={onEditTask} />
        ))}
      </div>
    </div>
  );
}
