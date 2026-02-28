"use client";

import { useState } from "react";
import type { CalendarEvent, EventType, EventStatus, Recurrence } from "@/types/calendar";

interface EventFormProps {
  event: CalendarEvent | null;
  defaultDate?: string;
  onSubmit: (data: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">) => void;
  onDelete?: (id: number) => void;
  onCancel: () => void;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function EventForm({ event, defaultDate, onSubmit, onDelete, onCancel }: EventFormProps) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [date, setDate] = useState(event?.date ?? defaultDate ?? todayStr());
  const [time, setTime] = useState(event?.time ?? "09:00");
  const [type, setType] = useState<EventType>(event?.type ?? "task");
  const [recurrence, setRecurrence] = useState<Recurrence>(event?.recurrence ?? "none");
  const [status, setStatus] = useState<EventStatus>(event?.status ?? "pending");
  const [assignee, setAssignee] = useState(event?.assignee ?? "Claude");
  const [linkedTaskId, setLinkedTaskId] = useState(event?.linkedTaskId?.toString() ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");

  const inputClass = "w-full bg-bg border border-border text-text px-3 py-2 rounded-md text-sm focus:outline-none focus:border-accent";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      date,
      time,
      type,
      recurrence,
      status,
      assignee: assignee.trim(),
      linkedTaskId: linkedTaskId ? parseInt(linkedTaskId) : null,
      notes: notes.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className={inputClass} />
        </div>

        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={2} className={`${inputClass} resize-y`} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as EventType)} className={inputClass}>
              <option value="task">Scheduled Task</option>
              <option value="cron">Cron Job</option>
              <option value="reminder">Reminder</option>
              <option value="deadline">Deadline</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">Recurrence</label>
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)} className={inputClass}>
              <option value="none">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as EventStatus)} className={inputClass}>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">Assignee</label>
            <input type="text" value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="e.g. Claude" className={inputClass} />
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">Linked Task ID</label>
          <input type="number" value={linkedTaskId} onChange={(e) => setLinkedTaskId(e.target.value)} placeholder="Optional task board ID" className={inputClass} />
        </div>

        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes" rows={2} className={`${inputClass} resize-y`} />
        </div>
      </div>

      <div className="flex gap-2 justify-end mt-6">
        {event && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(event.id)}
            className="mr-auto bg-red/15 text-red border border-red px-4 py-2 rounded-md text-sm font-medium hover:bg-red/30 transition-colors"
          >
            Delete
          </button>
        )}
        <button type="button" onClick={onCancel} className="bg-surface border border-border text-text px-4 py-2 rounded-md text-sm font-medium hover:border-accent transition-colors">
          Cancel
        </button>
        <button type="submit" className="bg-accent border border-accent text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#4393e6] transition-colors">
          Save
        </button>
      </div>
    </form>
  );
}
