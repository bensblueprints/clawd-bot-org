export type MemberStatus = "working" | "idle" | "offline";

export interface Department {
  id: string;
  name: string;
  color: string;
}

export interface Member {
  id: number;
  name: string;
  role: string;
  department: string;
  status: MemberStatus;
  avatarColor: string;
  initials: string;
  reportsTo: number | null;
  currentTask?: string;
}

export interface TeamData {
  team: string;
  lastUpdated: string;
  departments: Department[];
  members: Member[];
}
