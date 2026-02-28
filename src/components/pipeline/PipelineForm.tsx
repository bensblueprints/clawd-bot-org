"use client";

import { useState } from "react";
import type { PipelineItem, PipelineStage, ContentType, ContentPriority } from "@/types/pipeline";

interface PipelineFormProps {
  item: PipelineItem | null;
  onSubmit: (data: Omit<PipelineItem, "id" | "createdAt" | "updatedAt">) => void;
  onDelete?: (id: number) => void;
  onCancel: () => void;
}

const STAGES: PipelineStage[] = ["Idea", "Research", "Outline", "Script/Draft", "Media/Design", "Review", "Scheduled", "Published"];
const TYPES: ContentType[] = ["youtube", "social", "blog", "other"];
const PRIORITIES: ContentPriority[] = ["High", "Medium", "Low"];
const TABS = ["Script / Draft", "Outline", "Research", "Notes"];

export default function PipelineForm({ item, onSubmit, onDelete, onCancel }: PipelineFormProps) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [type, setType] = useState<ContentType>(item?.type ?? "youtube");
  const [stage, setStage] = useState<PipelineStage>(item?.stage ?? "Idea");
  const [priority, setPriority] = useState<ContentPriority>(item?.priority ?? "Medium");
  const [assignee, setAssignee] = useState(item?.assignee ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [script, setScript] = useState(item?.script ?? "");
  const [outline, setOutline] = useState(item?.outline ?? "");
  const [research, setResearch] = useState(item?.research ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [activeTab, setActiveTab] = useState(0);

  const inputClass = "w-full bg-bg border border-border text-text px-3 py-2.5 rounded-md text-sm focus:outline-none focus:border-accent";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      type,
      stage,
      priority,
      assignee: assignee.trim(),
      description: description.trim(),
      script,
      outline,
      research,
      notes,
      images: item?.images ?? [],
    });
  }

  const tabContent = [script, outline, research, notes];
  const tabSetters = [setScript, setOutline, setResearch, setNotes];
  const tabPlaceholders = [
    "Full script, draft, or article content...",
    "Content structure and outline...",
    "Research notes, references, links...",
    "Additional notes, comments, reminders...",
  ];

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Content title..." className={inputClass} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as ContentType)} className={inputClass}>
              <option value="youtube">YouTube</option>
              <option value="social">Social</option>
              <option value="blog">Blog / Article</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">Stage</label>
            <select value={stage} onChange={(e) => setStage(e.target.value as PipelineStage)} className={inputClass}>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as ContentPriority)} className={inputClass}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">Assignee</label>
          <input type="text" value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Claude, team member name..." className={inputClass} />
        </div>

        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief idea or concept description..." rows={3} className={`${inputClass} resize-y`} />
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              type="button"
              className={`px-4 py-2.5 text-[13px] border-b-2 transition-colors ${
                activeTab === i
                  ? "text-accent border-accent"
                  : "text-text-muted border-transparent hover:text-text"
              }`}
              onClick={() => setActiveTab(i)}
            >
              {tab}
            </button>
          ))}
        </div>

        <textarea
          value={tabContent[activeTab]}
          onChange={(e) => tabSetters[activeTab](e.target.value)}
          placeholder={tabPlaceholders[activeTab]}
          rows={activeTab === 0 ? 8 : 5}
          className={`${inputClass} resize-y`}
        />

        {item && (
          <div className="flex gap-4 text-[11px] text-text-muted pt-3 border-t border-border">
            <span>Created: {item.createdAt}</span>
            <span>Updated: {item.updatedAt}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end mt-6">
        {item && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(item.id)}
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
