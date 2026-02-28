import useSWR from "swr";
import type { PipelineData, PipelineItem } from "@/types/pipeline";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePipeline() {
  const { data, error, isLoading, mutate } = useSWR<PipelineData>(
    "/api/pipeline",
    fetcher
  );

  async function addItem(item: Omit<PipelineItem, "id">) {
    await fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    mutate();
  }

  async function updateItem(id: number, updates: Partial<PipelineItem>) {
    await fetch(`/api/pipeline/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    mutate();
  }

  async function deleteItem(id: number) {
    await fetch(`/api/pipeline/${id}`, { method: "DELETE" });
    mutate();
  }

  return {
    pipelineData: data,
    isLoading,
    isError: !!error,
    addItem,
    updateItem,
    deleteItem,
    mutate,
  };
}
