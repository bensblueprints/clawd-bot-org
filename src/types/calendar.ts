export type EventType = "task" | "cron" | "reminder" | "deadline";
export type EventStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type Recurrence = "none" | "daily" | "weekly" | "monthly";

export interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  type: EventType;
  recurrence: Recurrence;
  status: EventStatus;
  assignee: string;
  linkedTaskId: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarData {
  lastUpdated: string;
  events: CalendarEvent[];
}
