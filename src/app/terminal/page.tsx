"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import TerminalOutput from "@/components/terminal/TerminalOutput";
import TerminalInput from "@/components/terminal/TerminalInput";
import TerminalToolbar from "@/components/terminal/TerminalToolbar";

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

export default function TerminalPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingTasks, setPendingTasks] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

        // Set initial pending count
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
          // Add completion notification to messages
          const notificationMsg: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.fullMessage,
            timestamp: new Date().toISOString(),
            status: "complete",
            isNotification: true,
          };

          setMessages(prev => [...prev, notificationMsg]);

          // Play notification sound or visual indicator
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

    // Start polling every 5 seconds
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
          responseContent += "\n*I'll notify you when they're complete.*";
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
    } catch (error) {
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
    <div className="h-[calc(100vh-2rem)] flex flex-col bg-bg rounded-xl border border-border overflow-hidden">
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
  );
}
