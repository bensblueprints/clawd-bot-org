"use client";

import { useState, useCallback } from "react";
import TerminalOutput from "@/components/terminal/TerminalOutput";
import TerminalInput from "@/components/terminal/TerminalInput";
import TerminalToolbar from "@/components/terminal/TerminalToolbar";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  status?: "pending" | "complete" | "error";
}

export default function TerminalPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addMessage = useCallback((role: Message["role"], content: string, status?: Message["status"]) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date().toISOString(),
      status,
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
    const userMsgId = addMessage("user", message);

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
        updateMessage(assistantMsgId, {
          content: data.response,
          status: "complete",
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
