"use client";

import type { Member } from "@/types/team";

interface WorkstationProps {
  member: Member;
  onClick: (member: Member) => void;
}

const screenClass: Record<string, string> = {
  working: "bg-gradient-to-br from-[#1a3a1a] to-[#2a5a2a]",
  idle: "bg-gradient-to-br from-[#3a3a1a] to-[#5a5a2a]",
  offline: "bg-[#161b22]",
};

const badgeClass: Record<string, string> = {
  working: "bg-green/15 text-green",
  idle: "bg-yellow/15 text-yellow",
  offline: "bg-text-muted/15 text-text-muted",
};

const dotClass: Record<string, string> = {
  working: "bg-green",
  idle: "bg-yellow",
  offline: "bg-text-muted",
};

const ringClass: Record<string, string> = {
  working: "border-green",
  idle: "border-yellow",
  offline: "border-text-muted",
};

export default function Workstation({ member, onClick }: WorkstationProps) {
  const statusLabel = member.status.charAt(0).toUpperCase() + member.status.slice(1);

  return (
    <div
      className={`bg-surface border border-border rounded-xl p-6 text-center cursor-pointer transition-all hover:border-accent relative ${
        member.status === "working" ? "animate-work-pulse" : ""
      }`}
      onClick={() => onClick(member)}
    >
      {/* Desk scene */}
      <div className="flex flex-col items-center mb-4">
        {/* Avatar */}
        <div className="relative mb-3 z-[2]">
          <div
            className={`absolute -inset-1 rounded-full border-[3px] ${ringClass[member.status]}`}
          />
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-[22px] font-bold text-white"
            style={{ backgroundColor: member.avatarColor }}
          >
            {member.initials}
          </div>
        </div>

        {/* Desk with monitor */}
        <div className="relative w-full max-w-[200px] h-10 bg-[#21262d] rounded-t-lg rounded-b-sm flex items-center justify-center z-[1]">
          <div className="absolute -top-[30px] w-[60px] h-7 bg-bg border-2 border-[#444c56] rounded-t flex items-center justify-center">
            <div className={`w-12 h-4 rounded-sm ${screenClass[member.status]}`} />
          </div>
          <div className="absolute -top-0.5 w-4 h-1.5 bg-[#444c56] rounded-b-sm" />
        </div>
      </div>

      {/* Member info */}
      <div className="font-semibold text-base mb-0.5">{member.name}</div>
      <div className="text-xs text-text-muted mb-2">{member.role}</div>
      <div
        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-[10px] mb-2 ${badgeClass[member.status]}`}
      >
        <span className={`w-2 h-2 rounded-full ${dotClass[member.status]}`} />
        {statusLabel}
      </div>
      <div className="text-xs text-accent min-h-[16px] mt-1">
        {member.currentTask || "\u2014"}
      </div>
    </div>
  );
}
