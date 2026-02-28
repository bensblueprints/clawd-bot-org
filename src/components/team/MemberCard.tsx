import type { Member, Department } from "@/types/team";
import Avatar from "@/components/shared/Avatar";

interface MemberCardProps {
  member: Member;
  department?: Department;
  onEdit: (member: Member) => void;
  onDelete: (id: number) => void;
}

export default function MemberCard({ member, department, onEdit, onDelete }: MemberCardProps) {
  return (
    <div className="bg-bg border border-border rounded-lg p-4 hover:border-accent/50 transition-colors group">
      <div className="flex items-start gap-3">
        <Avatar initials={member.initials} color={member.avatarColor} status={member.status} />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{member.name}</h4>
          <p className="text-text-muted text-xs mt-0.5 truncate">{member.role}</p>
          <div className="flex items-center gap-2 mt-2">
            {department && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: department.color + "20",
                  color: department.color,
                }}
              >
                {department.name}
              </span>
            )}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              member.status === "working"
                ? "bg-green/15 text-green"
                : member.status === "idle"
                ? "bg-yellow/15 text-yellow"
                : "bg-text-muted/15 text-text-muted"
            }`}>
              {member.status}
            </span>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(member)}
            className="text-text-muted hover:text-accent text-xs p-1 transition-colors"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(member.id)}
            className="text-text-muted hover:text-red text-xs p-1 transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
