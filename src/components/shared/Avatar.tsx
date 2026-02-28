import type { MemberStatus } from "@/types/team";

interface AvatarProps {
  initials: string;
  color: string;
  size?: "sm" | "md" | "lg";
  status?: MemberStatus;
}

const sizeMap = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
};

const statusColorMap: Record<MemberStatus, string> = {
  working: "bg-green",
  idle: "bg-yellow",
  offline: "bg-text-muted",
};

export default function Avatar({ initials, color, size = "md", status }: AvatarProps) {
  return (
    <div className="relative inline-flex">
      <div
        className={`${sizeMap[size]} rounded-full flex items-center justify-center font-semibold text-white`}
        style={{ backgroundColor: color }}
      >
        {initials}
      </div>
      {status && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface ${statusColorMap[status]}`}
        />
      )}
    </div>
  );
}
