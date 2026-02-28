"use client";

interface TerminalToolbarProps {
  onClear: () => void;
  onReset: () => void;
  messageCount: number;
  status: "online" | "offline" | "processing";
  pendingTasks?: number;
}

export default function TerminalToolbar({ onClear, onReset, messageCount, status, pendingTasks = 0 }: TerminalToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-border">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${
            status === "online" ? "bg-green-400" : status === "processing" ? "bg-yellow-400 animate-pulse" : "bg-red-400"
          }`} />
          <span className="text-sm font-medium">
            {status === "online" ? "Ready" : status === "processing" ? "Processing" : "Offline"}
          </span>
        </div>
        <div className="text-xs text-text-muted">
          {messageCount} messages
        </div>
        {pendingTasks > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            {pendingTasks} task{pendingTasks > 1 ? 's' : ''} in progress
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onClear}
          className="text-xs px-3 py-1.5 rounded bg-bg border border-border hover:border-accent text-text-muted hover:text-text transition-colors"
        >
          Clear Display
        </button>
        <button
          onClick={onReset}
          className="text-xs px-3 py-1.5 rounded bg-bg border border-border hover:border-red-500 text-text-muted hover:text-red-400 transition-colors"
        >
          Reset Session
        </button>
      </div>
    </div>
  );
}
