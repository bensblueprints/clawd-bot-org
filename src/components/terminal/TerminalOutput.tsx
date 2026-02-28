"use client";

import { useEffect, useRef } from "react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  status?: "pending" | "complete" | "error";
}

interface TerminalOutputProps {
  messages: Message[];
}

function formatContent(content: string) {
  // Basic markdown-like formatting
  return content
    .split("\n")
    .map((line, i) => {
      // Headers
      if (line.startsWith("### ")) {
        return <div key={i} className="text-accent font-semibold mt-3 mb-1">{line.slice(4)}</div>;
      }
      if (line.startsWith("## ")) {
        return <div key={i} className="text-accent font-bold text-lg mt-4 mb-2">{line.slice(3)}</div>;
      }
      if (line.startsWith("# ")) {
        return <div key={i} className="text-accent font-bold text-xl mt-4 mb-2">{line.slice(2)}</div>;
      }
      // Bold
      if (line.startsWith("**") && line.endsWith("**")) {
        return <div key={i} className="font-semibold text-purple">{line.slice(2, -2)}</div>;
      }
      // List items
      if (line.startsWith("- ")) {
        return <div key={i} className="pl-4 before:content-['•'] before:mr-2 before:text-accent">{line.slice(2)}</div>;
      }
      // Numbered lists
      if (/^\d+\.\s/.test(line)) {
        return <div key={i} className="pl-4">{line}</div>;
      }
      // Code blocks
      if (line.startsWith("```") || line.startsWith("`")) {
        return <code key={i} className="bg-bg px-2 py-0.5 rounded text-green font-mono text-sm">{line.replace(/`/g, "")}</code>;
      }
      // Empty lines
      if (line.trim() === "") {
        return <div key={i} className="h-2" />;
      }
      return <div key={i}>{line}</div>;
    });
}

export default function TerminalOutput({ messages }: TerminalOutputProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm">
      {messages.length === 0 && (
        <div className="text-text-muted">
          <div className="text-green mb-4">
            ╔══════════════════════════════════════════════════════════════╗
            <br />
            ║&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;CLAWD BOT ORG - MISSION CONTROL&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;║
            <br />
            ║&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Agent Command Terminal&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;║
            <br />
            ╚══════════════════════════════════════════════════════════════╝
          </div>
          <div className="space-y-1">
            <div><span className="text-purple">Lead Agent:</span> Claude (Project Director)</div>
            <div><span className="text-purple">Team Size:</span> 11 agents ready</div>
            <div><span className="text-purple">Status:</span> <span className="text-green">Online</span></div>
          </div>
          <div className="mt-4 text-text-muted">
            Type a task or command to begin. Examples:
            <div className="pl-4 mt-2 space-y-1 text-accent">
              <div>&gt; Assign Scout to analyze the current codebase</div>
              <div>&gt; What is the team status?</div>
              <div>&gt; Create a new landing page for the product</div>
              <div>&gt; Review all pending tasks</div>
            </div>
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <div key={msg.id} className={`${msg.role === "user" ? "border-l-2 border-accent" : msg.role === "system" ? "border-l-2 border-yellow" : "border-l-2 border-green"} pl-3`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold uppercase ${
              msg.role === "user" ? "text-accent" : msg.role === "system" ? "text-yellow" : "text-green"
            }`}>
              {msg.role === "user" ? "You" : msg.role === "system" ? "System" : "Claude"}
            </span>
            <span className="text-xs text-text-muted">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
            {msg.status === "pending" && (
              <span className="text-xs text-yellow animate-pulse">Processing...</span>
            )}
          </div>
          <div className="text-text leading-relaxed">
            {msg.role === "user" ? (
              <span className="text-white">{msg.content}</span>
            ) : (
              formatContent(msg.content)
            )}
          </div>
        </div>
      ))}

      <div ref={bottomRef} />
    </div>
  );
}
