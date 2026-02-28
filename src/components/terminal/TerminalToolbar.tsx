"use client";

interface TerminalToolbarProps {
  onClear: () => void;
  onReset: () => void;
  messageCount: number;
  status: "online" | "offline" | "processing";
}

export default function TerminalToolbar({ onClear, onReset, messageCount, status }: TerminalToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-border">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${
            status === "online" ? "bg-green" : status === "processing" ? "bg-yellow animate-pulse" : "bg-red"
          }`} />
          <span className="text-sm font-medium">
            {status === "online" ? "Ready" : status === "processing" ? "Processing" : "Offline"}
          </span>
        </div>
        <div className="text-xs text-text-muted">
          {messageCount} messages in session
        </div>
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
          className="text-xs px-3 py-1.5 rounded bg-bg border border-border hover:border-red text-text-muted hover:text-red transition-colors"
        >
          Reset Session
        </button>
      </div>
    </div>
  );
}
