"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface Agent {
  id: string;
  name: string;
  role: string;
  emoji: string;
}

export interface AgentMessage {
  id: string;
  timestamp: string;
  from: string;
  to: string;
  content: string;
  type: "chat" | "task" | "result" | "delegation" | "question" | "update";
  taskId?: string;
}

export interface AgentTask {
  id: string;
  agent: string;
  agentName: string;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  status: "pending" | "in_progress" | "completed" | "failed" | "delegated";
  createdAt: string;
  updatedAt: string;
  progress: number;
  logs: { time: string; message: string }[];
  result?: string;
  parentTaskId?: string;
  childTaskIds?: string[];
  delegatedFrom?: string;
}

interface StreamEvent {
  type: "init" | "message" | "taskUpdate" | "heartbeat";
  messages?: AgentMessage[];
  tasks?: AgentTask[];
  agents?: Agent[];
  message?: AgentMessage;
  task?: AgentTask;
  timestamp: string;
}

interface UseAgentStreamReturn {
  messages: AgentMessage[];
  tasks: AgentTask[];
  agents: Agent[];
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

export function useAgentStream(): UseAgentStreamReturn {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    try {
      const eventSource = new EventSource("/api/agents/stream");
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const data: StreamEvent = JSON.parse(event.data);

          switch (data.type) {
            case "init":
              if (data.messages) setMessages(data.messages);
              if (data.tasks) setTasks(data.tasks);
              if (data.agents) setAgents(data.agents);
              break;

            case "message":
              if (data.message) {
                setMessages((prev) => {
                  // Avoid duplicates
                  if (prev.some((m) => m.id === data.message!.id)) {
                    return prev;
                  }
                  const updated = [...prev, data.message!];
                  // Keep last 200 messages
                  return updated.slice(-200);
                });
              }
              break;

            case "taskUpdate":
              if (data.task) {
                setTasks((prev) => {
                  const index = prev.findIndex((t) => t.id === data.task!.id);
                  if (index >= 0) {
                    const updated = [...prev];
                    updated[index] = data.task!;
                    return updated;
                  }
                  return [...prev, data.task!];
                });
              }
              break;

            case "heartbeat":
              // Connection is alive, nothing to do
              break;
          }
        } catch (err) {
          console.error("Error parsing SSE event:", err);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      setIsConnected(false);
    }
  }, []);

  const reconnect = useCallback(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return {
    messages,
    tasks,
    agents,
    isConnected,
    error,
    reconnect,
  };
}
