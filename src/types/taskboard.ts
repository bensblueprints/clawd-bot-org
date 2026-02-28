export type TaskPriority = "High" | "Medium" | "Low";
export type TaskStatus = "Backlog" | "To Do" | "In Progress" | "In Review" | "Done";

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  tags: string[];
}

export interface TaskboardData {
  project: string;
  lastUpdated: string;
  columns: TaskStatus[];
  members: string[];
  tasks: Task[];
}
