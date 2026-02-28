import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const TASKS_FILE = path.join(DATA_DIR, "agent-tasks.json");

export interface AgentActivity {
  id: string;
  name: string;
  role: string;
  status: "active" | "idle" | "busy" | "offline";
  currentTask: string | null;
  taskProgress: number;
  taskStarted: string | null;
  lastActive: string;
  tasksCompleted: number;
  tasksToday: number;
  queue: string[];
  recentLogs: { time: string; message: string }[];
  metrics: {
    avgResponseTime: number;
    successRate: number;
    cpuUsage: number;
    memoryUsage: number;
  };
}

interface AgentTask {
  id: string;
  agent: string;
  agentName: string;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  status: "pending" | "in_progress" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  progress: number;
  logs: { time: string; message: string }[];
}

interface TasksData {
  tasks: AgentTask[];
  lastUpdated: string;
}

async function loadTasks(): Promise<AgentTask[]> {
  try {
    const raw = await fs.readFile(TASKS_FILE, "utf-8");
    const data: TasksData = JSON.parse(raw);
    return data.tasks || [];
  } catch {
    return [];
  }
}

const AGENT_BASE_DATA: Record<string, { name: string; role: string }> = {
  claude: { name: "Claude", role: "Lead AI & Project Director" },
  scout: { name: "Scout", role: "Senior Codebase Explorer" },
  builder: { name: "Builder", role: "Full-Stack Developer" },
  solver: { name: "Solver", role: "General Purpose Developer" },
  archie: { name: "Archie", role: "Software Architect" },
  pixel: { name: "Pixel", role: "UI/UX Designer" },
  sentinel: { name: "Sentinel", role: "Senior Code Reviewer" },
  linter: { name: "Linter", role: "Code Quality Analyst" },
  scribe: { name: "Scribe", role: "Technical Writer" },
  quill: { name: "Quill", role: "Content Writer" },
  herald: { name: "Herald", role: "Client Liaison" },
  echo: { name: "Echo", role: "Support Specialist" },
};

function generateAgentActivity(tasks: AgentTask[]): AgentActivity[] {
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

  const agents: AgentActivity[] = [];

  for (const [agentId, baseData] of Object.entries(AGENT_BASE_DATA)) {
    const agentTasks = tasksByAgent[agentId] || [];
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
      name: baseData.name,
      role: baseData.role,
      status,
      currentTask: currentTask?.title || null,
      taskProgress: currentTask?.progress || 0,
      taskStarted: currentTask?.createdAt || null,
      lastActive: currentTask?.updatedAt || now.toISOString(),
      tasksCompleted: completedTasks.length,
      tasksToday,
      queue,
      recentLogs,
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
  const agents = generateAgentActivity(tasks);

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
  };

  return NextResponse.json({
    agents,
    stats,
    recentTasks: tasks.slice(-10).reverse(),
    timestamp: new Date().toISOString(),
  });
}
