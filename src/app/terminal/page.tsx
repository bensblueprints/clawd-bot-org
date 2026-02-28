"use client";

import { useState, useCallback, useEffect } from "react";
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
}

export default function TerminalPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load conversation history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch("/api/terminal");
        const data = await res.json();

        if (data.conversation && data.conversation.length > 0) {
          const loadedMessages: Message[] = data.conversation.map((msg: { role: string; content: string; timestamp: string }, index: number) => ({
            id: `loaded-${index}`,
            role: msg.role as "user" | "assistant",
            content: msg.content.replace(/\[TASK_ASSIGN\][\s\S]*?\[\/TASK_ASSIGN\]/g, '').trim(),
            timestamp: msg.timestamp,
            status: "complete" as const,
          }));
          setMessages(loadedMessages);
          setCommandHistory(
            loadedMessages
              .filter(m => m.role === "user")
              .map(m => m.content)
          );
        }
      } catch (error) {
        console.error("Failed to load conversation history:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, []);

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

        // Add task notification if tasks were created
        if (data.tasksCreated && data.tasksCreated.length > 0) {
          responseContent += "\n\n---\n**Tasks Dispatched:**\n";
          for (const task of data.tasksCreated) {
            responseContent += `- [${task.priority}] **${task.title}** → Assigned to ${task.agent}\n`;
          }
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
      addMessage("system", "Session reset. All context cleared. Ready for new tasks.");
    } catch (error) {
      addMessage("system", "Failed to reset session.");
    }
  }

  function handleClear() {
    setMessages([]);
  }

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
