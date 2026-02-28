export interface TerminalMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  status?: "pending" | "complete" | "error";
}

export interface TerminalSession {
  id: string;
  messages: TerminalMessage[];
  createdAt: string;
  lastActivity: string;
}

export interface AgentTask {
  id: string;
  description: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  assignedTo: string;
  createdAt: string;
  completedAt?: string;
  result?: string;
}
