"use client";

import { useState, useMemo } from "react";
import { usePipeline } from "@/hooks/usePipeline";
import type { PipelineItem, PipelineStage } from "@/types/pipeline";
import PageHeader from "@/components/shared/PageHeader";
import StatsBar from "@/components/shared/StatsBar";
import PipelineFilterBar from "@/components/pipeline/PipelineFilterBar";
import PipelineColumn from "@/components/pipeline/PipelineColumn";
import PipelineForm from "@/components/pipeline/PipelineForm";
import Modal from "@/components/shared/Modal";

const STAGES: PipelineStage[] = ["Idea", "Research", "Outline", "Script/Draft", "Media/Design", "Review", "Scheduled", "Published"];

export default function PipelinePage() {
  const { pipelineData, isLoading, addItem, updateItem, deleteItem } = usePipeline();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PipelineItem | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  const items = pipelineData?.items ?? [];
  const assignees = useMemo(() => [...new Set(items.map((i) => i.assignee).filter(Boolean))], [items]);

  const filteredItems = useMemo(() => {
    let result = [...items];
    if (typeFilter) result = result.filter((i) => i.type === typeFilter);
    if (priorityFilter) result = result.filter((i) => i.priority === priorityFilter);
    if (assigneeFilter) result = result.filter((i) => i.assignee?.toLowerCase().includes(assigneeFilter.toLowerCase()));
    if (searchFilter) result = result.filter((i) => i.title.toLowerCase().includes(searchFilter.toLowerCase()));
    return result;
  }, [items, typeFilter, priorityFilter, assigneeFilter, searchFilter]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STAGES.forEach((s) => (counts[s] = 0));
    items.forEach((i) => { if (counts[i.stage] !== undefined) counts[i.stage]++; });
    return counts;
  }, [items]);

  if (isLoading || !pipelineData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-muted">Loading content pipeline...</div>
      </div>
    );
  }

  function handleEdit(item: PipelineItem) {
    setEditingItem(item);
    setModalOpen(true);
  }

  function handleAdd() {
    setEditingItem(null);
    setModalOpen(true);
  }

  async function handleSubmit(data: Omit<PipelineItem, "id" | "createdAt" | "updatedAt">) {
    if (editingItem) {
      await updateItem(editingItem.id, data);
    } else {
      await addItem(data as Omit<PipelineItem, "id">);
    }
    setModalOpen(false);
    setEditingItem(null);
  }

  async function handleDelete(id: number) {
    if (confirm("Delete this content piece?")) {
      await deleteItem(id);
      setModalOpen(false);
      setEditingItem(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Content Pipeline"
        subtitle="Multi-stage content workflow management"
        meta={`Last updated: ${new Date(pipelineData.lastUpdated).toLocaleString()}`}
      />

      <StatsBar
        stats={[
          { label: "Total", value: items.length, color: "#58a6ff" },
          ...STAGES.map((s) => ({ label: s, value: stageCounts[s] })),
        ]}
      />

      <PipelineFilterBar
        typeFilter={typeFilter}
        priorityFilter={priorityFilter}
        assigneeFilter={assigneeFilter}
        searchFilter={searchFilter}
        assignees={assignees}
        onTypeChange={setTypeFilter}
        onPriorityChange={setPriorityFilter}
        onAssigneeChange={setAssigneeFilter}
        onSearchChange={setSearchFilter}
        onAdd={handleAdd}
      />

      <div className="flex gap-3 mt-5 overflow-x-auto pb-4 min-h-[calc(100vh-380px)] items-start">
        {STAGES.map((stage) => (
          <PipelineColumn
            key={stage}
            stage={stage}
            items={filteredItems.filter((i) => i.stage === stage)}
            onEdit={handleEdit}
          />
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingItem(null); }}
        title={editingItem ? `Edit: ${editingItem.title}` : "New Content"}
      >
        <PipelineForm
          item={editingItem}
          onSubmit={handleSubmit}
          onDelete={editingItem ? handleDelete : undefined}
          onCancel={() => { setModalOpen(false); setEditingItem(null); }}
        />
      </Modal>
    </div>
  );
}
