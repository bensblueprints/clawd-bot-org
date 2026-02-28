"use client";

import { useState } from "react";
import type { Task, TaskStatus, TaskPriority } from "@/types/taskboard";

interface TaskFormProps {
  task: Task | null;
  onSubmit: (data: Omit<Task, "id">) => void;
  onDelete?: (id: number) => void;
  onCancel: () => void;
}

const STATUSES: TaskStatus[] = ["Backlog", "To Do", "In Progress", "In Review", "Done"];
const PRIORITIES: TaskPriority[] = ["High", "Medium", "Low"];

export default function TaskForm({ task, onSubmit, onDelete, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "To Do");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "Medium");
  const [assignee, setAssignee] = useState(task?.assignee ?? "Claude");
  const [tags, setTags] = useState(task?.tags.join(", ") ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assignee: assignee.trim(),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="w-full bg-bg border border-border text-text px-3 py-2 rounded-md text-sm focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Task description..."
            rows={3}
            className="w-full bg-bg border border-border text-text px-3 py-2 rounded-md text-sm focus:outline-none focus:border-accent resize-y"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full bg-bg border border-border text-text px-3 py-2 rounded-md text-sm focus:outline-none focus:border-accent"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full bg-bg border border-border text-text px-3 py-2 rounded-md text-sm focus:outline-none focus:border-accent"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">Assignee</label>
            <input
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Assignee name"
              className="w-full bg-bg border border-border text-text px-3 py-2 rounded-md text-sm focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">Tags (comma-separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. tool, migration, bug"
            className="w-full bg-bg border border-border text-text px-3 py-2 rounded-md text-sm focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end mt-6">
        {task && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            className="mr-auto bg-red/15 text-red border border-red px-4 py-2 rounded-md text-sm font-medium hover:bg-red/30 transition-colors"
          >
            Delete
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="bg-surface border border-border text-text px-4 py-2 rounded-md text-sm font-medium hover:border-accent transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-accent border border-accent text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#4393e6] transition-colors"
        >
          Save
        </button>
      </div>
    </form>
  );
}
