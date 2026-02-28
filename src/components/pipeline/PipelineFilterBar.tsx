"use client";

import type { ContentType, ContentPriority } from "@/types/pipeline";

interface PipelineFilterBarProps {
  typeFilter: string;
  priorityFilter: string;
  assigneeFilter: string;
  searchFilter: string;
  assignees: string[];
  onTypeChange: (val: string) => void;
  onPriorityChange: (val: string) => void;
  onAssigneeChange: (val: string) => void;
  onSearchChange: (val: string) => void;
  onAdd: () => void;
}

const TYPES: { value: ContentType | ""; label: string }[] = [
  { value: "", label: "All Types" },
  { value: "youtube", label: "YouTube" },
  { value: "social", label: "Social" },
  { value: "blog", label: "Blog" },
  { value: "other", label: "Other" },
];

const PRIORITIES: { value: ContentPriority | ""; label: string }[] = [
  { value: "", label: "All Priorities" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

export default function PipelineFilterBar({
  typeFilter,
  priorityFilter,
  assigneeFilter,
  searchFilter,
  assignees,
  onTypeChange,
  onPriorityChange,
  onAssigneeChange,
  onSearchChange,
  onAdd,
}: PipelineFilterBarProps) {
  const selectClass =
    "bg-surface border border-border text-text px-2.5 py-1.5 rounded-md text-[13px] focus:outline-none focus:border-accent";

  return (
    <div className="flex items-center gap-3 flex-wrap mt-4">
      <select value={typeFilter} onChange={(e) => onTypeChange(e.target.value)} className={selectClass}>
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <select value={priorityFilter} onChange={(e) => onPriorityChange(e.target.value)} className={selectClass}>
        {PRIORITIES.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
      <select value={assigneeFilter} onChange={(e) => onAssigneeChange(e.target.value)} className={selectClass}>
        <option value="">All Assignees</option>
        {assignees.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
      <input
        type="text"
        value={searchFilter}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search titles..."
        className={`${selectClass} w-40`}
      />
      <button
        onClick={onAdd}
        className="ml-auto bg-accent border border-accent text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-[#4393e6] transition-colors"
      >
        + New Content
      </button>
    </div>
  );
}
