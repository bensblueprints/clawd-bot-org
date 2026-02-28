"use client";

import { useState } from "react";
import { useTeam } from "@/hooks/useTeam";
import type { Member } from "@/types/team";
import PageHeader from "@/components/shared/PageHeader";
import StatsBar from "@/components/shared/StatsBar";
import QuickStatusBar from "@/components/office/QuickStatusBar";
import OfficeFloor from "@/components/office/OfficeFloor";
import Modal from "@/components/shared/Modal";
import OfficeMemberForm from "@/components/office/OfficeMemberForm";

export default function OfficePage() {
  const { teamData, isLoading, addMember, updateMember, deleteMember } = useTeam();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

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
      <PageHeader
        title="Digital Office"
        subtitle="Visual office floor plan with team status"
        meta={`Last updated: ${new Date(teamData.lastUpdated).toLocaleString()}`}
      />

      <StatsBar
        stats={[
          { label: "Team Members", value: members.length, color: "#58a6ff" },
          { label: "Working", value: working, color: "#3fb950" },
          { label: "Idle", value: idle, color: "#d29922" },
          { label: "Offline", value: offline },
        ]}
      />

      <QuickStatusBar members={members} />

      <OfficeFloor members={members} onEdit={handleEdit} onAdd={handleAdd} />

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
