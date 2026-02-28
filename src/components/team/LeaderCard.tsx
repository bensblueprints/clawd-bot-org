import type { Member } from "@/types/team";
import Avatar from "@/components/shared/Avatar";

interface LeaderCardProps {
  member: Member;
  onEdit: (member: Member) => void;
}

export default function LeaderCard({ member, onEdit }: LeaderCardProps) {
  return (
    <div className="bg-surface border-2 border-purple rounded-xl p-6 max-w-sm mx-auto text-center">
      <div className="flex justify-center mb-3">
        <Avatar initials={member.initials} color={member.avatarColor} size="lg" status={member.status} />
      </div>
      <h3 className="text-lg font-semibold">{member.name}</h3>
      <p className="text-text-muted text-sm mt-1">{member.role}</p>
      <div className="mt-3 flex justify-center gap-2">
        <span className="text-xs px-2.5 py-1 rounded-full bg-purple/15 text-purple font-medium">
          Leadership
        </span>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
          member.status === "working"
            ? "bg-green/15 text-green"
            : member.status === "idle"
            ? "bg-yellow/15 text-yellow"
            : "bg-text-muted/15 text-text-muted"
        }`}>
          {member.status}
        </span>
      </div>
      <button
        onClick={() => onEdit(member)}
        className="mt-4 text-xs text-text-muted hover:text-accent transition-colors"
      >
        Edit
      </button>
    </div>
  );
}
