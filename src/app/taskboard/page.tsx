"use client";

import { useState } from "react";
import { useTaskboard } from "@/hooks/useTaskboard";
import type { Task, TaskStatus } from "@/types/taskboard";
import PageHeader from "@/components/shared/PageHeader";
import StatsBar from "@/components/shared/StatsBar";
import TaskColumn from "@/components/taskboard/TaskColumn";
import TaskForm from "@/components/taskboard/TaskForm";
import Modal from "@/components/shared/Modal";

const COLUMNS: TaskStatus[] = ["Backlog", "To Do", "In Progress", "In Review", "Done"];

export default function TaskboardPage() {
  const { boardData, isLoading, addTask, updateTask, deleteTask } = useTaskboard();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  if (isLoading || !boardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-muted">Loading task board...</div>
      </div>
    );
  }

  const { tasks } = boardData;
  const total = tasks.length;
  const inProgress = tasks.filter((t) => t.status === "In Progress").length;
  const done = tasks.filter((t) => t.status === "Done").length;
  const claudeTasks = tasks.filter((t) => t.assignee?.toLowerCase().includes("claude")).length;

  function handleEdit(task: Task) {
    setEditingTask(task);
    setModalOpen(true);
  }

  function handleAdd() {
    setEditingTask(null);
    setModalOpen(true);
  }

  async function handleSubmit(data: Omit<Task, "id">) {
    if (editingTask) {
      await updateTask(editingTask.id, data);
    } else {
      await addTask(data);
    }
    setModalOpen(false);
    setEditingTask(null);
  }

  async function handleDelete(id: number) {
    if (confirm("Delete this task?")) {
      await deleteTask(id);
      setModalOpen(false);
      setEditingTask(null);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Task Board"
          subtitle={`${boardData.project} project tracking`}
          meta={`Last updated: ${new Date(boardData.lastUpdated).toLocaleString()}`}
        />
        <button
          onClick={handleAdd}
          className="mt-1 bg-accent border border-accent text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#4393e6] transition-colors shrink-0"
        >
          + New Task
        </button>
      </div>

      <StatsBar
        stats={[
          { label: "Total Tasks", value: total },
          { label: "In Progress", value: inProgress, color: "#d29922" },
          { label: "Completed", value: done, color: "#3fb950" },
          { label: "Claude's Tasks", value: claudeTasks, color: "#bc8cff" },
        ]}
      />

      <div className="flex gap-4 mt-6 overflow-x-auto pb-4 min-h-[calc(100vh-320px)] items-start">
        {COLUMNS.map((col) => (
          <TaskColumn
            key={col}
            status={col}
            tasks={tasks.filter((t) => t.status === col)}
            onEditTask={handleEdit}
          />
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTask(null); }}
        title={editingTask ? `Edit: ${editingTask.title}` : "New Task"}
      >
        <TaskForm
          task={editingTask}
          onSubmit={handleSubmit}
          onDelete={editingTask ? handleDelete : undefined}
          onCancel={() => { setModalOpen(false); setEditingTask(null); }}
        />
      </Modal>
    </div>
  );
}
