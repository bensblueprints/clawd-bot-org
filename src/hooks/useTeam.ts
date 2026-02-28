import useSWR from "swr";
import type { TeamData, Member } from "@/types/team";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useTeam() {
  const { data, error, isLoading, mutate } = useSWR<TeamData>(
    "/api/team",
    fetcher
  );

  async function addMember(member: Omit<Member, "id">) {
    await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(member),
    });
    mutate();
  }

  async function updateMember(id: number, updates: Partial<Member>) {
    await fetch(`/api/team/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    mutate();
  }

  async function deleteMember(id: number) {
    await fetch(`/api/team/${id}`, { method: "DELETE" });
    mutate();
  }

  return {
    teamData: data,
    isLoading,
    isError: !!error,
    addMember,
    updateMember,
    deleteMember,
    mutate,
  };
}
