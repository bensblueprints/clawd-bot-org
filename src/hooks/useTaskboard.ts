import useSWR from "swr";
import type { TaskboardData, Task } from "@/types/taskboard";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useTaskboard() {
  const { data, error, isLoading, mutate } = useSWR<TaskboardData>(
    "/api/taskboard",
    fetcher
  );

  async function addTask(task: Omit<Task, "id">) {
    await fetch("/api/taskboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });
    mutate();
  }

  async function updateTask(id: number, updates: Partial<Task>) {
    await fetch(`/api/taskboard/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    mutate();
  }

  async function deleteTask(id: number) {
    await fetch(`/api/taskboard/${id}`, { method: "DELETE" });
    mutate();
  }

  return {
    boardData: data,
    isLoading,
    isError: !!error,
    addTask,
    updateTask,
    deleteTask,
    mutate,
  };
}
