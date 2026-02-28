import useSWR from "swr";
import type { CalendarData, CalendarEvent } from "@/types/calendar";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useCalendar() {
  const { data, error, isLoading, mutate } = useSWR<CalendarData>(
    "/api/calendar",
    fetcher
  );

  async function addEvent(event: Omit<CalendarEvent, "id">) {
    await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    mutate();
  }

  async function updateEvent(id: number, updates: Partial<CalendarEvent>) {
    await fetch(`/api/calendar/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    mutate();
  }

  async function deleteEvent(id: number) {
    await fetch(`/api/calendar/${id}`, { method: "DELETE" });
    mutate();
  }

  return {
    calendarData: data,
    isLoading,
    isError: !!error,
    addEvent,
    updateEvent,
    deleteEvent,
    mutate,
  };
}
