import type { Member } from "@/types/team";

interface QuickStatusBarProps {
  members: Member[];
}

const dotClass: Record<string, string> = {
  working: "bg-green",
  idle: "bg-yellow",
  offline: "bg-text-muted",
};

export default function QuickStatusBar({ members }: QuickStatusBarProps) {
  return (
    <div className="flex gap-2.5 flex-wrap items-center mt-4">
      {members.map((m) => (
        <div
          key={m.id}
          className="flex items-center gap-2 bg-surface border border-border rounded-full py-1.5 pl-2 pr-3.5 text-[13px]"
        >
          <div
            className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: m.avatarColor }}
          >
            {m.initials}
          </div>
          <span>{m.name}</span>
          <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass[m.status]}`} />
        </div>
      ))}
    </div>
  );
}
