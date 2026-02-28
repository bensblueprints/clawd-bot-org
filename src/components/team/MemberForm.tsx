"use client";

import { useState, useEffect } from "react";
import type { Member, Department, MemberStatus } from "@/types/team";

interface MemberFormProps {
  member?: Member | null;
  departments: Department[];
  onSubmit: (data: Omit<Member, "id">) => void;
  onCancel: () => void;
}

export default function MemberForm({ member, departments, onSubmit, onCancel }: MemberFormProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState<MemberStatus>("idle");
  const [avatarColor, setAvatarColor] = useState("#58a6ff");

  useEffect(() => {
    if (member) {
      setName(member.name);
      setRole(member.role);
      setDepartment(member.department);
      setStatus(member.status);
      setAvatarColor(member.avatarColor);
    } else {
      setName("");
      setRole("");
      setDepartment(departments[1]?.id ?? "");
      setStatus("idle");
      setAvatarColor("#58a6ff");
    }
  }, [member, departments]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const initials = name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    onSubmit({
      name,
      role,
      department,
      status,
      avatarColor,
      initials,
      reportsTo: 1,
    });
  }

  const inputClass =
    "w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-text-muted mb-1.5">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          required
        />
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1.5">Role</label>
        <input
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={inputClass}
          required
        />
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1.5">Department</label>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className={inputClass}
          required
        >
          <option value="">Select department...</option>
          {departments
            .filter((d) => d.id !== "leadership")
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1.5">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as MemberStatus)}
          className={inputClass}
        >
          <option value="working">Working</option>
          <option value="idle">Idle</option>
          <option value="offline">Offline</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1.5">Avatar Color</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={avatarColor}
            onChange={(e) => setAvatarColor(e.target.value)}
            className="w-10 h-10 rounded border border-border cursor-pointer bg-transparent"
          />
          <span className="text-xs text-text-muted">{avatarColor}</span>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 bg-accent text-white py-2 rounded-lg text-sm font-medium hover:bg-accent/80 transition-colors"
        >
          {member ? "Save Changes" : "Add Member"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-border text-text py-2 rounded-lg text-sm font-medium hover:bg-border/80 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
