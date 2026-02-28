"use client";

interface CalendarToolbarProps {
  year: number;
  month: number;
  typeFilter: string;
  statusFilter: string;
  assigneeFilter: string;
  assignees: string[];
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onTypeChange: (val: string) => void;
  onStatusChange: (val: string) => void;
  onAssigneeChange: (val: string) => void;
  onAdd: () => void;
}

export default function CalendarToolbar({
  year,
  month,
  typeFilter,
  statusFilter,
  assigneeFilter,
  assignees,
  onPrev,
  onNext,
  onToday,
  onTypeChange,
  onStatusChange,
  onAssigneeChange,
  onAdd,
}: CalendarToolbarProps) {
  const monthTitle = new Date(year, month).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const btnClass = "bg-surface border border-border text-text px-3 py-1.5 rounded-md text-xs font-medium hover:border-accent transition-colors";
  const selectClass = "bg-surface border border-border text-text px-2.5 py-1.5 rounded-md text-xs focus:outline-none focus:border-accent";

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 items-center">
          <button onClick={onPrev} className={btnClass}>Prev</button>
          <button onClick={onToday} className={btnClass}>Today</button>
          <button onClick={onNext} className={btnClass}>Next</button>
        </div>
        <div className="text-xl font-semibold min-w-[200px] text-center">{monthTitle}</div>
        <button
          onClick={onAdd}
          className="ml-auto bg-accent border border-accent text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-[#4393e6] transition-colors"
        >
          + Add Event
        </button>
      </div>

      <div className="flex gap-2.5 flex-wrap">
        <select value={typeFilter} onChange={(e) => onTypeChange(e.target.value)} className={selectClass}>
          <option value="">All Types</option>
          <option value="task">Scheduled Task</option>
          <option value="cron">Cron Job</option>
          <option value="reminder">Reminder</option>
          <option value="deadline">Deadline</option>
        </select>
        <select value={statusFilter} onChange={(e) => onStatusChange(e.target.value)} className={selectClass}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={assigneeFilter} onChange={(e) => onAssigneeChange(e.target.value)} className={selectClass}>
          <option value="">All Assignees</option>
          {assignees.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
