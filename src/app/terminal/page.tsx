"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import TerminalOutput from "@/components/terminal/TerminalOutput";
import TerminalInput from "@/components/terminal/TerminalInput";
import TerminalToolbar from "@/components/terminal/TerminalToolbar";
import AgentFeed from "@/components/terminal/AgentFeed";
import { useTheme } from "@/contexts/ThemeContext";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  status?: "pending" | "complete" | "error";
  tasksCreated?: Array<{
    id: string;
    agent: string;
    title: string;
    priority: string;
  }>;
  isNotification?: boolean;
}

interface AIStatus {
  available: boolean;
  provider: string;
  message: string;
}

export default function TerminalPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [showAgentFeed, setShowAgentFeed] = useState(true);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { colors } = useTheme();

  // Check AI status and start worker on mount
  useEffect(() => {
    async function checkAIStatus() {
      try {
        const res = await fetch("/api/settings/status");
        const data = await res.json();
        setAiStatus(data.ai);

        // Auto-start the worker if AI is available
        if (data.ai?.available) {
          fetch("/api/agents/worker", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "start" }),
          }).catch(console.error);
        }
      } catch (error) {
        console.error("Failed to check AI status:", error);
      }
    }
    checkAIStatus();
  }, []);

  // Load conversation history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch("/api/terminal");
        const data = await res.json();

        if (data.conversation && data.conversation.length > 0) {
          const loadedMessages: Message[] = data.conversation.map((msg: { role: string; content: string; timestamp: string; isSystemNotification?: boolean }, index: number) => ({
            id: `loaded-${index}`,
            role: msg.role as "user" | "assistant",
            content: msg.content.replace(/\[TASK_ASSIGN\][\s\S]*?\[\/TASK_ASSIGN\]/g, '').trim(),
            timestamp: msg.timestamp,
            status: "complete" as const,
            isNotification: msg.isSystemNotification,
          }));
          setMessages(loadedMessages);
          setCommandHistory(
            loadedMessages
              .filter(m => m.role === "user")
              .map(m => m.content)
          );
        }

        setPendingTasks(data.pendingNotifications || 0);
      } catch (error) {
        console.error("Failed to load conversation history:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, []);

  // Poll for task completions
  useEffect(() => {
    async function checkCompletions() {
      if (isProcessing) return;

      try {
        const res = await fetch("/api/terminal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkCompletions: true }),
        });

        const data = await res.json();

        if (data.hasCompletions && data.fullMessage) {
          const notificationMsg: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.fullMessage,
            timestamp: new Date().toISOString(),
            status: "complete",
            isNotification: true,
          };

          setMessages(prev => [...prev, notificationMsg]);

          if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "granted") {
              new Notification("Task Completed", {
                body: `${data.completedTasks?.length || 1} task(s) finished`,
                icon: "/favicon.ico",
              });
            }
          }
        }
      } catch (error) {
        console.error("Error checking completions:", error);
      }
    }

    pollIntervalRef.current = setInterval(checkCompletions, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isProcessing]);

  const addMessage = useCallback((role: Message["role"], content: string, status?: Message["status"], tasksCreated?: Message["tasksCreated"]) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date().toISOString(),
      status,
      tasksCreated,
    };
    setMessages((prev) => [...prev, msg]);
    return msg.id;
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
    );
  }, []);

  async function handleSubmit(message: string) {
    setCommandHistory((prev) => [...prev, message]);
    addMessage("user", message);

    setIsProcessing(true);
    const assistantMsgId = addMessage("assistant", "", "pending");

    try {
      const response = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      if (data.error) {
        updateMessage(assistantMsgId, {
          content: `Error: ${data.error}`,
          status: "error",
        });
      } else {
        let responseContent = data.response;

        if (data.tasksCreated && data.tasksCreated.length > 0) {
          responseContent += "\n\n---\n**Tasks Dispatched:**\n";
          for (const task of data.tasksCreated) {
            responseContent += `- [${task.priority}] **${task.title}** → Assigned to ${task.agent}\n`;
          }
          responseContent += "\n*Watch the Agent Feed to see them work in real-time!*";
          setPendingTasks(prev => prev + data.tasksCreated.length);
        }

        updateMessage(assistantMsgId, {
          content: responseContent,
          status: "complete",
          tasksCreated: data.tasksCreated,
        });
      }
    } catch (error) {
      updateMessage(assistantMsgId, {
        content: `Connection error: ${error instanceof Error ? error.message : "Unknown error"}`,
        status: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleReset() {
    try {
      await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      setMessages([]);
      setCommandHistory([]);
      setPendingTasks(0);
      addMessage("system", "Session reset. All context cleared. Ready for new tasks.");
    } catch {
      addMessage("system", "Failed to reset session.");
    }
  }

  function handleClear() {
    setMessages([]);
  }

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-2rem)] flex flex-col bg-bg rounded-xl border border-border overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col gap-4">
      {/* AI Not Configured Warning */}
      {aiStatus && !aiStatus.available && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/50 bg-red-500/10">
          <div className="p-2 rounded-lg bg-red-500/20">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-red-400">AI Provider Not Configured</h3>
            <p className="text-sm text-red-400/70">
              {aiStatus.message}
            </p>
          </div>
          <a
            href="/settings"
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
          >
            Configure in Settings
          </a>
        </div>
      )}

      {/* AI Ready Banner */}
      {aiStatus && aiStatus.available && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-green-500/30 bg-green-500/5">
          <div className="p-1.5 rounded-lg bg-green-500/20">
            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-sm text-green-400">
            AI Ready: <span className="font-medium">{aiStatus.provider}</span>
          </span>
          <span className="text-xs text-green-400/50">Agents can execute tasks</span>
        </div>
      )}

      <div className="flex gap-4 flex-1 min-h-0">
      {/* Main Terminal */}
      <div
        className={`flex-1 flex flex-col rounded-xl border overflow-hidden transition-all duration-300 ${showAgentFeed ? 'w-1/2' : 'w-full'}`}
        style={{ background: colors.bg, borderColor: colors.border }}
      >
        <TerminalToolbar
          onClear={handleClear}
          onReset={handleReset}
          messageCount={messages.length}
          status={isProcessing ? "processing" : "online"}
          pendingTasks={pendingTasks}
        />
        <TerminalOutput messages={messages} />
        <TerminalInput
          onSubmit={handleSubmit}
          disabled={isProcessing}
          commandHistory={commandHistory}
        />
      </div>

      {/* Agent Feed Sidebar */}
      <div
        className={`flex flex-col rounded-xl border overflow-hidden transition-all duration-300 ${showAgentFeed ? 'w-[480px]' : 'w-12'}`}
        style={{ background: colors.bg, borderColor: colors.border }}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setShowAgentFeed(!showAgentFeed)}
          className="flex items-center justify-center gap-2 px-3 py-2 border-b transition-colors hover:opacity-80"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          {showAgentFeed ? (
            <>
              <span className="text-sm font-medium" style={{ color: colors.text }}>
                Agent Activity
              </span>
              <span style={{ color: colors.muted }}>→</span>
            </>
          ) : (
            <span className="text-lg">🤖</span>
          )}
        </button>

        {/* Feed Content */}
        {showAgentFeed && (
          <AgentFeed
            className="flex-1 relative"
            showTasks={true}
            maxHeight="calc(100vh - 8rem)"
          />
        )}
      </div>
      </div>
    </div>
  );
}
