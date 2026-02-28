"use client";

import { useState, useMemo } from "react";
import { useCalendar } from "@/hooks/useCalendar";
import type { CalendarEvent } from "@/types/calendar";
import PageHeader from "@/components/shared/PageHeader";
import StatsBar from "@/components/shared/StatsBar";
import CalendarToolbar from "@/components/calendar/CalendarToolbar";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import EventForm from "@/components/calendar/EventForm";
import Modal from "@/components/shared/Modal";

export default function CalendarPage() {
  const { calendarData, isLoading, addEvent, updateEvent, deleteEvent } = useCalendar();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");

  if (isLoading || !calendarData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-muted">Loading calendar...</div>
      </div>
    );
  }

  const { events } = calendarData;
  const assignees = [...new Set(events.map((e) => e.assignee).filter(Boolean))];

  const filteredEvents = useMemo(() => {
    let result = [...events];
    if (typeFilter) result = result.filter((e) => e.type === typeFilter);
    if (statusFilter) result = result.filter((e) => e.status === statusFilter);
    if (assigneeFilter) result = result.filter((e) => e.assignee === assigneeFilter);
    return result;
  }, [events, typeFilter, statusFilter, assigneeFilter]);

  const upcoming = events.filter((e) => e.status === "pending" || e.status === "running").length;
  const completed = events.filter((e) => e.status === "completed").length;
  const cronJobs = events.filter((e) => e.type === "cron" && e.status !== "cancelled").length;

  function handlePrev() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  }

  function handleNext() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  }

  function handleToday() {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
  }

  function handleDayClick(dateStr: string) {
    setEditingEvent(null);
    setDefaultDate(dateStr);
    setModalOpen(true);
  }

  function handleEventClick(event: CalendarEvent) {
    setEditingEvent(event);
    setDefaultDate("");
    setModalOpen(true);
  }

  function handleAdd() {
    setEditingEvent(null);
    const d = new Date();
    setDefaultDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    setModalOpen(true);
  }

  async function handleSubmit(data: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">) {
    if (editingEvent) {
      await updateEvent(editingEvent.id, data);
    } else {
      await addEvent(data as Omit<CalendarEvent, "id">);
    }
    setModalOpen(false);
    setEditingEvent(null);
  }

  async function handleDelete(id: number) {
    if (confirm("Delete this event?")) {
      await deleteEvent(id);
      setModalOpen(false);
      setEditingEvent(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Scheduled tasks, cron jobs, and event tracking"
        meta={`Last updated: ${new Date(calendarData.lastUpdated).toLocaleString()}`}
      />

      <StatsBar
        stats={[
          { label: "Total Events", value: events.length, color: "#58a6ff" },
          { label: "Upcoming", value: upcoming, color: "#d29922" },
          { label: "Completed", value: completed, color: "#3fb950" },
          { label: "Active Cron Jobs", value: cronJobs, color: "#bc8cff" },
        ]}
      />

      <CalendarToolbar
        year={year}
        month={month}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        assigneeFilter={assigneeFilter}
        assignees={assignees}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onTypeChange={setTypeFilter}
        onStatusChange={setStatusFilter}
        onAssigneeChange={setAssigneeFilter}
        onAdd={handleAdd}
      />

      <CalendarGrid
        year={year}
        month={month}
        events={filteredEvents}
        onDayClick={handleDayClick}
        onEventClick={handleEventClick}
      />

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEvent(null); }}
        title={editingEvent ? `Edit: ${editingEvent.title}` : "Add Event"}
      >
        <EventForm
          event={editingEvent}
          defaultDate={defaultDate}
          onSubmit={handleSubmit}
          onDelete={editingEvent ? handleDelete : undefined}
          onCancel={() => { setModalOpen(false); setEditingEvent(null); }}
        />
      </Modal>
    </div>
  );
}
