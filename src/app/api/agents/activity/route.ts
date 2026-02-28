import { NextResponse } from "next/server";
import { loadTasks, loadMessages, AGENTS, AgentTask, AgentMessage } from "@/lib/agents/engine";

export interface AgentActivity {
  id: string;
  name: string;
  role: string;
  emoji: string;
  status: "active" | "idle" | "busy" | "offline";
  currentTask: string | null;
  taskProgress: number;
  taskStarted: string | null;
  lastActive: string;
  tasksCompleted: number;
  tasksToday: number;
  queue: string[];
  recentLogs: { time: string; message: string }[];
  recentMessages: AgentMessage[];
  metrics: {
    avgResponseTime: number;
    successRate: number;
    cpuUsage: number;
    memoryUsage: number;
  };
}

function generateAgentActivity(tasks: AgentTask[], messages: AgentMessage[]): AgentActivity[] {
  const now = new Date();
  const randomMetric = (min: number, max: number) => Math.floor(Math.random() * (max - min) + min);

  // Group tasks by agent
  const tasksByAgent: Record<string, AgentTask[]> = {};
  for (const task of tasks) {
    if (!tasksByAgent[task.agent]) {
      tasksByAgent[task.agent] = [];
    }
    tasksByAgent[task.agent].push(task);
  }

  // Group messages by agent
  const messagesByAgent: Record<string, AgentMessage[]> = {};
  for (const msg of messages) {
    if (!messagesByAgent[msg.from]) {
      messagesByAgent[msg.from] = [];
    }
    messagesByAgent[msg.from].push(msg);
  }

  const agents: AgentActivity[] = [];

  for (const [agentId, agentData] of Object.entries(AGENTS)) {
    const agentTasks = tasksByAgent[agentId] || [];
    const agentMessages = messagesByAgent[agentId] || [];
    const activeTasks = agentTasks.filter(t => t.status === "in_progress" || t.status === "pending");
    const completedTasks = agentTasks.filter(t => t.status === "completed");
    const currentTask = activeTasks.find(t => t.status === "in_progress") || activeTasks[0];

    // Calculate tasks completed today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tasksToday = completedTasks.filter(t => new Date(t.updatedAt) >= todayStart).length;

    // Determine status based on active tasks
    let status: "active" | "idle" | "busy" | "offline" = "idle";
    if (currentTask) {
      status = currentTask.status === "in_progress" ? "busy" : "active";
    }

    // Special case for Claude - always active as the lead
    if (agentId === "claude") {
      status = "active";
    }

    // Get queue (pending tasks)
    const queue = activeTasks
      .filter(t => t.status === "pending" || (t.status === "in_progress" && t !== currentTask))
      .map(t => t.title);

    // Get recent logs from current task or generate default
    const recentLogs: { time: string; message: string }[] = [];
    if (currentTask) {
      recentLogs.push(...currentTask.logs.slice(-3));
    }
    if (recentLogs.length === 0 && completedTasks.length > 0) {
      const lastCompleted = completedTasks[completedTasks.length - 1];
      recentLogs.push({
        time: lastCompleted.updatedAt,
        message: `Completed: ${lastCompleted.title}`,
      });
    }

    agents.push({
      id: agentId,
      name: agentData.name,
      role: agentData.role,
      emoji: agentData.emoji,
      status,
      currentTask: currentTask?.title || null,
      taskProgress: currentTask?.progress || 0,
      taskStarted: currentTask?.createdAt || null,
      lastActive: currentTask?.updatedAt || now.toISOString(),
      tasksCompleted: completedTasks.length,
      tasksToday,
      queue,
      recentLogs,
      recentMessages: agentMessages.slice(-5),
      metrics: {
        avgResponseTime: randomMetric(5, 30) / 10,
        successRate: randomMetric(94, 100),
        cpuUsage: status === "busy" ? randomMetric(40, 80) : randomMetric(5, 25),
        memoryUsage: status === "busy" ? randomMetric(35, 65) : randomMetric(15, 35),
      },
    });
  }

  return agents;
}

export async function GET() {
  const tasks = await loadTasks();
  const messages = await loadMessages();
  const agents = generateAgentActivity(tasks, messages);

  // Calculate team stats
  const stats = {
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === "active" || a.status === "busy").length,
    idleAgents: agents.filter(a => a.status === "idle").length,
    offlineAgents: agents.filter(a => a.status === "offline").length,
    totalTasksToday: agents.reduce((sum, a) => sum + a.tasksToday, 0),
    totalTasksCompleted: agents.reduce((sum, a) => sum + a.tasksCompleted, 0),
    avgSuccessRate: Math.round(agents.reduce((sum, a) => sum + a.metrics.successRate, 0) / agents.length),
    avgCpuUsage: Math.round(agents.reduce((sum, a) => sum + a.metrics.cpuUsage, 0) / agents.length),
    avgMemoryUsage: Math.round(agents.reduce((sum, a) => sum + a.metrics.memoryUsage, 0) / agents.length),
    pendingTasks: tasks.filter(t => t.status === "pending").length,
    inProgressTasks: tasks.filter(t => t.status === "in_progress").length,
    totalMessages: messages.length,
  };

  return NextResponse.json({
    agents,
    stats,
    recentTasks: tasks.slice(-10).reverse(),
    recentMessages: messages.slice(-20).reverse(),
    timestamp: new Date().toISOString(),
  });
}
