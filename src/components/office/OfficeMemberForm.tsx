"use client";

import { useState } from "react";
import type { Member, MemberStatus } from "@/types/team";

interface OfficeMemberFormProps {
  member: Member | null;
  onSubmit: (data: Partial<Member>) => void;
  onDelete?: (id: number) => void;
  onCancel: () => void;
}

const COLORS = [
  "#bc8cff", "#58a6ff", "#3fb950", "#f0883e", "#f85149",
  "#d29922", "#39d2c0", "#e06c9f", "#6cb4ee", "#b392f0",
];

export default function OfficeMemberForm({
  member,
  onSubmit,
  onDelete,
  onCancel,
}: OfficeMemberFormProps) {
  const [name, setName] = useState(member?.name ?? "");
  const [role, setRole] = useState(member?.role ?? "");
  const [status, setStatus] = useState<MemberStatus>(member?.status ?? "working");
  const [currentTask, setCurrentTask] = useState(member?.currentTask ?? "");
  const [avatarColor, setAvatarColor] = useState(
    member?.avatarColor ?? COLORS[Math.floor(Math.random() * COLORS.length)]
  );

  function getInitials(n: string) {
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.substring(0, 2).toUpperCase();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const data: Partial<Member> = {
      name: name.trim(),
      role: role.trim(),
      status,
      currentTask: currentTask.trim() || undefined,
      avatarColor,
      initials: getInitials(name.trim()),
    };

    if (!member) {
      // New member - need department and reportsTo defaults
      (data as Record<string, unknown>).department = "developers";
      (data as Record<string, unknown>).reportsTo = 1;
    }

    onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Team member name"
            className="w-full bg-bg border border-border text-text px-3 py-2 rounded-md text-sm focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">
            Role
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. AI Assistant, Developer"
            className="w-full bg-bg border border-border text-text px-3 py-2 rounded-md text-sm focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as MemberStatus)}
            className="w-full bg-bg border border-border text-text px-3 py-2 rounded-md text-sm focus:outline-none focus:border-accent"
          >
            <option value="working">Working</option>
            <option value="idle">Idle</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">
            Current Task
          </label>
          <input
            type="text"
            value={currentTask}
            onChange={(e) => setCurrentTask(e.target.value)}
            placeholder="What are they working on?"
            className="w-full bg-bg border border-border text-text px-3 py-2 rounded-md text-sm focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">
            Avatar Color
          </label>
          <div className="flex gap-2 flex-wrap mt-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`w-8 h-8 rounded-full border-[3px] transition-colors ${
                  c === avatarColor ? "border-text" : "border-transparent hover:border-text-muted"
                }`}
                style={{ backgroundColor: c }}
                onClick={() => setAvatarColor(c)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end mt-6">
        {member && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(member.id)}
            className="mr-auto bg-red/15 text-red border border-red px-4 py-2 rounded-md text-sm font-medium hover:bg-red/30 transition-colors"
          >
            Remove
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
