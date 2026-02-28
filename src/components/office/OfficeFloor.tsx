"use client";

import type { Member } from "@/types/team";
import Workstation from "./Workstation";

interface OfficeFloorProps {
  members: Member[];
  onEdit: (member: Member) => void;
  onAdd: () => void;
}

export default function OfficeFloor({ members, onEdit, onAdd }: OfficeFloorProps) {
  return (
    <div className="mt-8">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 max-w-[1400px] mx-auto">
        {members.map((member) => (
          <Workstation key={member.id} member={member} onClick={onEdit} />
        ))}

        {/* Add desk button */}
        <div
          className="bg-surface border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer flex flex-col items-center justify-center min-h-[240px] transition-colors hover:border-accent"
          onClick={onAdd}
        >
          <div className="text-[40px] text-text-muted mb-2">+</div>
          <div className="text-sm text-text-muted">Add Team Member</div>
        </div>
      </div>
    </div>
  );
}
