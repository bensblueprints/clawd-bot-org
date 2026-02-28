"use client";

import { useState } from "react";
import { useTeam } from "@/hooks/useTeam";
import type { Member } from "@/types/team";
import PageHeader from "@/components/shared/PageHeader";
import StatsBar from "@/components/shared/StatsBar";
import FilterBar from "@/components/team/FilterBar";
import OrgChart from "@/components/team/OrgChart";
import Modal from "@/components/shared/Modal";
import MemberForm from "@/components/team/MemberForm";

export default function TeamPage() {
  const { teamData, isLoading, addMember, updateMember, deleteMember } = useTeam();
  const [filter, setFilter] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  if (isLoading || !teamData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-muted">Loading team data...</div>
      </div>
    );
  }

  const totalMembers = teamData.members.length;
  const working = teamData.members.filter((m) => m.status === "working").length;
  const deptCount = teamData.departments.filter((d) => d.id !== "leadership").length;

  function handleEdit(member: Member) {
    setEditingMember(member);
    setModalOpen(true);
  }

  function handleAdd() {
    setEditingMember(null);
    setModalOpen(true);
  }

  async function handleSubmit(data: Omit<Member, "id">) {
    if (editingMember) {
      await updateMember(editingMember.id, data);
    } else {
      await addMember(data);
    }
    setModalOpen(false);
    setEditingMember(null);
  }

  async function handleDelete(id: number) {
    if (confirm("Are you sure you want to remove this team member?")) {
      await deleteMember(id);
    }
  }

  return (
    <div>
      <PageHeader
        title="Team Structure"
        subtitle={`${teamData.team} organizational chart`}
        meta={`Last updated: ${new Date(teamData.lastUpdated).toLocaleString()}`}
      />

      <StatsBar
        stats={[
          { label: "Total Members", value: totalMembers, color: "#58a6ff" },
          { label: "Working", value: working, color: "#3fb950" },
          { label: "Departments", value: deptCount, color: "#bc8cff" },
        ]}
      />

      <div className="mt-6">
        <FilterBar
          departments={teamData.departments}
          active={filter}
          onFilter={setFilter}
          onAdd={handleAdd}
        />
      </div>

      <OrgChart
        teamData={teamData}
        filter={filter}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingMember(null); }}
        title={editingMember ? `Edit ${editingMember.name}` : "Add Team Member"}
      >
        <MemberForm
          member={editingMember}
          departments={teamData.departments}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditingMember(null); }}
        />
      </Modal>
    </div>
  );
}
