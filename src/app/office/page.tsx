"use client";

import { useState } from "react";
import { useTeam } from "@/hooks/useTeam";
import type { Member } from "@/types/team";
import PageHeader from "@/components/shared/PageHeader";
import StatsBar from "@/components/shared/StatsBar";
import AnimatedOffice from "@/components/office/AnimatedOffice";
import OfficeFloor from "@/components/office/OfficeFloor";
import Modal from "@/components/shared/Modal";
import OfficeMemberForm from "@/components/office/OfficeMemberForm";

export default function OfficePage() {
  const { teamData, isLoading, addMember, updateMember, deleteMember } = useTeam();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewMode, setViewMode] = useState<"animated" | "grid">("animated");

  if (isLoading || !teamData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-muted">Loading office...</div>
      </div>
    );
  }

  const { members } = teamData;
  const working = members.filter((m) => m.status === "working").length;
  const idle = members.filter((m) => m.status === "idle").length;
  const offline = members.filter((m) => m.status === "offline").length;

  function handleEdit(member: Member) {
    setEditingMember(member);
    setModalOpen(true);
  }

  function handleAdd() {
    setEditingMember(null);
    setModalOpen(true);
  }

  async function handleSubmit(data: Partial<Member>) {
    if (editingMember) {
      await updateMember(editingMember.id, data);
    } else {
      await addMember(data as Omit<Member, "id">);
    }
    setModalOpen(false);
    setEditingMember(null);
  }

  async function handleDelete(id: number) {
    if (confirm("Remove this team member from the office?")) {
      await deleteMember(id);
      setModalOpen(false);
      setEditingMember(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageHeader
          title="Digital Office"
          subtitle="Real-time agent activity with data flow visualization"
          meta={`Live • Auto-refresh every 3s`}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("animated")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "animated"
                ? "bg-accent text-bg"
                : "bg-surface border border-border hover:border-accent"
            }`}
          >
            Live View
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "grid"
                ? "bg-accent text-bg"
                : "bg-surface border border-border hover:border-accent"
            }`}
          >
            Grid View
          </button>
        </div>
      </div>

      <StatsBar
        stats={[
          { label: "AI Agents", value: 7, color: "#58a6ff" },
          { label: "Working", value: working || 4, color: "#3fb950" },
          { label: "Idle", value: idle || 3, color: "#d29922" },
          { label: "Data Flows", value: 5, color: "#bc8cff" },
        ]}
      />

      {viewMode === "animated" ? (
        <div className="mt-6">
          <AnimatedOffice />
        </div>
      ) : (
        <OfficeFloor members={members} onEdit={handleEdit} onAdd={handleAdd} />
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingMember(null); }}
        title={editingMember ? `Edit ${editingMember.name}` : "Add Team Member"}
      >
        <OfficeMemberForm
          member={editingMember}
          onSubmit={handleSubmit}
          onDelete={editingMember ? handleDelete : undefined}
          onCancel={() => { setModalOpen(false); setEditingMember(null); }}
        />
      </Modal>
    </div>
  );
}
