import type { Member, Department } from "@/types/team";
import MemberCard from "./MemberCard";

interface DepartmentGroupProps {
  department: Department;
  members: Member[];
  onEdit: (member: Member) => void;
  onDelete: (id: number) => void;
}

export default function DepartmentGroup({ department, members, onEdit, onDelete }: DepartmentGroupProps) {
  if (members.length === 0) return null;

  return (
    <div className="flex-1 min-w-[280px] max-w-[360px]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: department.color }} />
        <h3 className="font-semibold text-sm">{department.name}</h3>
        <span className="text-xs text-text-muted bg-border rounded-full px-2 py-0.5">
          {members.length}
        </span>
      </div>
      {/* Connector line from top */}
      <div className="w-px h-4 mx-auto bg-border mb-2" />
      <div className="space-y-2">
        {members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            department={department}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
