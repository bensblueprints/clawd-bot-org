"use client";

import { useEffect, useRef, useState } from "react";
import { useAgentStream, AgentMessage, AgentTask } from "@/hooks/useAgentStream";
import { useTheme } from "@/contexts/ThemeContext";

interface AgentFeedProps {
  className?: string;
  showTasks?: boolean;
  maxHeight?: string;
}

const AGENT_EMOJIS: Record<string, string> = {
  claude: "🧠",
  scout: "🔍",
  builder: "🔧",
  solver: "💡",
  archie: "🏗️",
  pixel: "🎨",
  sentinel: "🛡️",
  linter: "📐",
  scribe: "📝",
  quill: "✍️",
  herald: "📣",
  echo: "🎧",
  user: "👤",
  broadcast: "📢",
};

const MESSAGE_TYPE_COLORS: Record<string, string> = {
  chat: "text-blue-400",
  task: "text-green-400",
  result: "text-emerald-400",
  delegation: "text-purple-400",
  question: "text-yellow-400",
  update: "text-gray-400",
};

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function MessageBubble({ message, colors }: { message: AgentMessage; colors: ReturnType<typeof useTheme>["colors"] }) {
  const fromEmoji = AGENT_EMOJIS[message.from] || "🤖";
  const toEmoji = AGENT_EMOJIS[message.to] || "📢";
  const typeColor = MESSAGE_TYPE_COLORS[message.type] || "text-gray-400";

  const isBroadcast = message.to === "broadcast";
  const isToUser = message.to === "user";

  return (
    <div
      className="px-3 py-2 rounded-lg mb-2 animate-in slide-in-from-bottom-2 duration-300"
      style={{
        background: `${colors.surface}cc`,
        borderLeft: `3px solid ${colors.accent}`,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{fromEmoji}</span>
        <span className="font-semibold text-sm" style={{ color: colors.text }}>
          {message.from.charAt(0).toUpperCase() + message.from.slice(1)}
        </span>
        <span style={{ color: colors.muted }}>→</span>
        <span className="text-lg">{toEmoji}</span>
        <span className="text-sm" style={{ color: colors.muted }}>
          {isBroadcast ? "Everyone" : isToUser ? "You" : message.to.charAt(0).toUpperCase() + message.to.slice(1)}
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${typeColor}`} style={{ background: `${colors.bg}80` }}>
          {message.type}
        </span>
        <span className="text-xs ml-auto" style={{ color: colors.muted }}>
          {formatTime(message.timestamp)}
        </span>
      </div>
      <p className="text-sm leading-relaxed pl-8" style={{ color: colors.text }}>
        {message.content}
      </p>
    </div>
  );
}

function TaskCard({ task, colors }: { task: AgentTask; colors: ReturnType<typeof useTheme>["colors"] }) {
  const agentEmoji = AGENT_EMOJIS[task.agent] || "🤖";

  const statusColors: Record<string, string> = {
    pending: colors.idle,
    in_progress: colors.working,
    completed: "#22c55e",
    failed: "#ef4444",
    delegated: colors.accent,
  };

  const statusColor = statusColors[task.status] || colors.muted;

  return (
    <div
      className="px-3 py-2 rounded-lg mb-2"
      style={{
        background: `${colors.surface}cc`,
        borderLeft: `3px solid ${statusColor}`,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{agentEmoji}</span>
        <span className="font-semibold text-sm" style={{ color: colors.text }}>
          {task.agentName}
        </span>
        <span
          className="text-xs px-1.5 py-0.5 rounded"
          style={{ background: statusColor, color: "#fff" }}
        >
          {task.status.replace("_", " ")}
        </span>
        <span className="text-xs ml-auto" style={{ color: colors.muted }}>
          {task.progress}%
        </span>
      </div>
      <p className="text-sm font-medium pl-8" style={{ color: colors.text }}>
        {task.title}
      </p>
      {task.logs.length > 0 && (
        <p className="text-xs pl-8 mt-1" style={{ color: colors.muted }}>
          {task.logs[task.logs.length - 1].message}
        </p>
      )}
      {task.status === "in_progress" && (
        <div className="pl-8 mt-2">
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: colors.border }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${task.progress}%`,
                background: statusColor,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentFeed({ className = "", showTasks = true, maxHeight = "400px" }: AgentFeedProps) {
  const { messages, tasks, isConnected, error, reconnect } = useAgentStream();
  const { colors } = useTheme();
  const feedRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, tasks, autoScroll]);

  // Detect manual scroll
  const handleScroll = () => {
    if (feedRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  const activeTasks = tasks.filter((t) => t.status === "in_progress" || t.status === "pending");

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: colors.border }}
      >
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? "animate-pulse" : ""}`}
            style={{ background: isConnected ? colors.working : colors.offline }}
          />
          <span className="text-sm font-medium" style={{ color: colors.text }}>
            Agent Activity Feed
          </span>
          {isConnected && (
            <span className="text-xs" style={{ color: colors.muted }}>
              Live
            </span>
          )}
        </div>
        {!isConnected && (
          <button
            onClick={reconnect}
            className="text-xs px-2 py-1 rounded"
            style={{ background: colors.accent, color: "#fff" }}
          >
            Reconnect
          </button>
        )}
      </div>

      {error && (
        <div className="px-3 py-2 text-sm" style={{ color: "#ef4444", background: "#ef444420" }}>
          {error}
        </div>
      )}

      {/* Feed content */}
      <div
        ref={feedRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-1"
        style={{ maxHeight, background: colors.bg }}
      >
        {/* Active Tasks Section */}
        {showTasks && activeTasks.length > 0 && (
          <div className="mb-4">
            <div
              className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2"
              style={{ color: colors.muted }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: colors.working }}
              />
              Active Tasks ({activeTasks.length})
            </div>
            {activeTasks.map((task) => (
              <TaskCard key={task.id} task={task} colors={colors} />
            ))}
          </div>
        )}

        {/* Messages Section */}
        <div>
          {messages.length > 0 && (
            <div
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: colors.muted }}
            >
              Agent Communications ({messages.length})
            </div>
          )}
          {messages.length === 0 ? (
            <div className="text-center py-8" style={{ color: colors.muted }}>
              <p className="text-sm">No agent activity yet</p>
              <p className="text-xs mt-1">Assign a task to see agents in action</p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} colors={colors} />
            ))
          )}
        </div>
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && messages.length > 0 && (
        <button
          onClick={() => {
            setAutoScroll(true);
            if (feedRef.current) {
              feedRef.current.scrollTop = feedRef.current.scrollHeight;
            }
          }}
          className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg"
          style={{ background: colors.accent, color: "#fff" }}
        >
          ↓ New messages
        </button>
      )}
    </div>
  );
}
