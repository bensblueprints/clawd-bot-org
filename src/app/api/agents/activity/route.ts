import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const ACTIVITY_FILE = path.join(process.cwd(), "data", "agent-activity.json");

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

// Simulated real-time agent data
function generateAgentActivity(): AgentActivity[] {
  const now = new Date();
  const randomProgress = () => Math.floor(Math.random() * 100);
  const randomMetric = (min: number, max: number) => Math.floor(Math.random() * (max - min) + min);

  return [
    {
      id: "claude",
      name: "Claude",
      role: "Lead AI & Project Director",
      status: "active",
      currentTask: "Coordinating team assignments and reviewing priorities",
      taskProgress: 65,
      taskStarted: new Date(now.getTime() - 300000).toISOString(),
      lastActive: now.toISOString(),
      tasksCompleted: 47,
      tasksToday: 12,
      queue: ["Review Builder's code changes", "Approve deployment plan"],
      recentLogs: [
        { time: new Date(now.getTime() - 60000).toISOString(), message: "Assigned SEO task to Quill" },
        { time: new Date(now.getTime() - 120000).toISOString(), message: "Reviewed Scout's codebase analysis" },
        { time: new Date(now.getTime() - 180000).toISOString(), message: "Updated project priorities" },
      ],
      metrics: {
        avgResponseTime: 1.2,
        successRate: 99,
        cpuUsage: randomMetric(20, 45),
        memoryUsage: randomMetric(30, 50),
      },
    },
    {
      id: "scout",
      name: "Scout",
      role: "Senior Codebase Explorer",
      status: "busy",
      currentTask: "Analyzing herbanbud.com Shopify theme structure",
      taskProgress: randomProgress(),
      taskStarted: new Date(now.getTime() - 600000).toISOString(),
      lastActive: now.toISOString(),
      tasksCompleted: 89,
      tasksToday: 8,
      queue: ["Map API endpoints for leadforge", "Review new dependencies"],
      recentLogs: [
        { time: new Date(now.getTime() - 30000).toISOString(), message: "Found 23 Liquid templates" },
        { time: new Date(now.getTime() - 90000).toISOString(), message: "Mapping component hierarchy" },
        { time: new Date(now.getTime() - 150000).toISOString(), message: "Indexing CSS variables" },
      ],
      metrics: {
        avgResponseTime: 0.8,
        successRate: 97,
        cpuUsage: randomMetric(40, 70),
        memoryUsage: randomMetric(35, 55),
      },
    },
    {
      id: "builder",
      name: "Builder",
      role: "Full-Stack Developer",
      status: "busy",
      currentTask: "Implementing Stripe webhook handler for ClawdBot",
      taskProgress: randomProgress(),
      taskStarted: new Date(now.getTime() - 900000).toISOString(),
      lastActive: now.toISOString(),
      tasksCompleted: 156,
      tasksToday: 6,
      queue: ["Add VNC setup to provisioning", "Fix mobile nav bug"],
      recentLogs: [
        { time: new Date(now.getTime() - 45000).toISOString(), message: "Created checkout session endpoint" },
        { time: new Date(now.getTime() - 100000).toISOString(), message: "Testing webhook signature verification" },
        { time: new Date(now.getTime() - 200000).toISOString(), message: "Deployed API changes to production" },
      ],
      metrics: {
        avgResponseTime: 2.1,
        successRate: 94,
        cpuUsage: randomMetric(50, 80),
        memoryUsage: randomMetric(45, 65),
      },
    },
    {
      id: "solver",
      name: "Solver",
      role: "General Purpose Developer",
      status: "active",
      currentTask: "Debugging React hydration mismatch in calendar page",
      taskProgress: randomProgress(),
      taskStarted: new Date(now.getTime() - 450000).toISOString(),
      lastActive: now.toISOString(),
      tasksCompleted: 203,
      tasksToday: 15,
      queue: ["Fix TypeScript errors", "Resolve CORS issue"],
      recentLogs: [
        { time: new Date(now.getTime() - 20000).toISOString(), message: "Identified SSR/client mismatch" },
        { time: new Date(now.getTime() - 80000).toISOString(), message: "Applied dynamic import fix" },
        { time: new Date(now.getTime() - 140000).toISOString(), message: "Running build verification" },
      ],
      metrics: {
        avgResponseTime: 1.5,
        successRate: 96,
        cpuUsage: randomMetric(35, 60),
        memoryUsage: randomMetric(40, 55),
      },
    },
    {
      id: "archie",
      name: "Archie",
      role: "Software Architect",
      status: "idle",
      currentTask: null,
      taskProgress: 0,
      taskStarted: null,
      lastActive: new Date(now.getTime() - 1800000).toISOString(),
      tasksCompleted: 34,
      tasksToday: 2,
      queue: ["Design microservices migration plan"],
      recentLogs: [
        { time: new Date(now.getTime() - 1800000).toISOString(), message: "Completed system diagram for ClawdBot" },
        { time: new Date(now.getTime() - 3600000).toISOString(), message: "Reviewed database schema proposal" },
      ],
      metrics: {
        avgResponseTime: 3.2,
        successRate: 100,
        cpuUsage: randomMetric(5, 15),
        memoryUsage: randomMetric(20, 30),
      },
    },
    {
      id: "pixel",
      name: "Pixel",
      role: "UI/UX Designer",
      status: "busy",
      currentTask: "Creating dark mode variants for Mission Control",
      taskProgress: randomProgress(),
      taskStarted: new Date(now.getTime() - 1200000).toISOString(),
      lastActive: now.toISOString(),
      tasksCompleted: 67,
      tasksToday: 4,
      queue: ["Design mobile dashboard", "Create icon set"],
      recentLogs: [
        { time: new Date(now.getTime() - 60000).toISOString(), message: "Updated color palette variables" },
        { time: new Date(now.getTime() - 300000).toISOString(), message: "Designed settings page layout" },
        { time: new Date(now.getTime() - 600000).toISOString(), message: "Created button hover states" },
      ],
      metrics: {
        avgResponseTime: 1.8,
        successRate: 98,
        cpuUsage: randomMetric(25, 50),
        memoryUsage: randomMetric(35, 50),
      },
    },
    {
      id: "sentinel",
      name: "Sentinel",
      role: "Senior Code Reviewer",
      status: "active",
      currentTask: "Reviewing PR #47: Settings API implementation",
      taskProgress: randomProgress(),
      taskStarted: new Date(now.getTime() - 180000).toISOString(),
      lastActive: now.toISOString(),
      tasksCompleted: 312,
      tasksToday: 18,
      queue: ["Review security patches", "Audit auth middleware"],
      recentLogs: [
        { time: new Date(now.getTime() - 15000).toISOString(), message: "Checking input validation" },
        { time: new Date(now.getTime() - 45000).toISOString(), message: "Reviewing error handling patterns" },
        { time: new Date(now.getTime() - 90000).toISOString(), message: "Approved PR #46" },
      ],
      metrics: {
        avgResponseTime: 0.9,
        successRate: 99,
        cpuUsage: randomMetric(30, 55),
        memoryUsage: randomMetric(25, 40),
      },
    },
    {
      id: "linter",
      name: "Linter",
      role: "Code Quality Analyst",
      status: "active",
      currentTask: "Running ESLint on mission-control codebase",
      taskProgress: randomProgress(),
      taskStarted: new Date(now.getTime() - 120000).toISOString(),
      lastActive: now.toISOString(),
      tasksCompleted: 445,
      tasksToday: 24,
      queue: ["Check TypeScript strict mode", "Validate Tailwind classes"],
      recentLogs: [
        { time: new Date(now.getTime() - 10000).toISOString(), message: "Scanned 47 files" },
        { time: new Date(now.getTime() - 30000).toISOString(), message: "Found 2 unused imports" },
        { time: new Date(now.getTime() - 50000).toISOString(), message: "Auto-fixed formatting issues" },
      ],
      metrics: {
        avgResponseTime: 0.5,
        successRate: 100,
        cpuUsage: randomMetric(45, 75),
        memoryUsage: randomMetric(30, 45),
      },
    },
    {
      id: "scribe",
      name: "Scribe",
      role: "Technical Writer",
      status: "idle",
      currentTask: null,
      taskProgress: 0,
      taskStarted: null,
      lastActive: new Date(now.getTime() - 3600000).toISOString(),
      tasksCompleted: 78,
      tasksToday: 1,
      queue: ["Update API documentation", "Write deployment guide"],
      recentLogs: [
        { time: new Date(now.getTime() - 3600000).toISOString(), message: "Generated README for settings API" },
        { time: new Date(now.getTime() - 7200000).toISOString(), message: "Updated changelog" },
      ],
      metrics: {
        avgResponseTime: 2.8,
        successRate: 97,
        cpuUsage: randomMetric(5, 15),
        memoryUsage: randomMetric(15, 25),
      },
    },
    {
      id: "quill",
      name: "Quill",
      role: "Content Writer",
      status: "busy",
      currentTask: "Writing SEO blog post: 'Best CBD Products for Sleep 2026'",
      taskProgress: randomProgress(),
      taskStarted: new Date(now.getTime() - 1500000).toISOString(),
      lastActive: now.toISOString(),
      tasksCompleted: 234,
      tasksToday: 3,
      queue: ["Social media copy for launch", "Product descriptions"],
      recentLogs: [
        { time: new Date(now.getTime() - 120000).toISOString(), message: "Completed keyword research" },
        { time: new Date(now.getTime() - 300000).toISOString(), message: "Outlined 8 section headings" },
        { time: new Date(now.getTime() - 600000).toISOString(), message: "Writing introduction paragraph" },
      ],
      metrics: {
        avgResponseTime: 4.5,
        successRate: 95,
        cpuUsage: randomMetric(35, 60),
        memoryUsage: randomMetric(40, 55),
      },
    },
    {
      id: "herald",
      name: "Herald",
      role: "Client Liaison",
      status: "idle",
      currentTask: null,
      taskProgress: 0,
      taskStarted: null,
      lastActive: new Date(now.getTime() - 2400000).toISOString(),
      tasksCompleted: 156,
      tasksToday: 5,
      queue: ["Send weekly report to Herban Bud", "Schedule client call"],
      recentLogs: [
        { time: new Date(now.getTime() - 2400000).toISOString(), message: "Sent project update email" },
        { time: new Date(now.getTime() - 4800000).toISOString(), message: "Updated client dashboard" },
      ],
      metrics: {
        avgResponseTime: 1.1,
        successRate: 99,
        cpuUsage: randomMetric(5, 20),
        memoryUsage: randomMetric(15, 30),
      },
    },
    {
      id: "echo",
      name: "Echo",
      role: "Support Specialist",
      status: "active",
      currentTask: "Monitoring support channels for incoming requests",
      taskProgress: 100,
      taskStarted: new Date(now.getTime() - 28800000).toISOString(),
      lastActive: now.toISOString(),
      tasksCompleted: 523,
      tasksToday: 7,
      queue: [],
      recentLogs: [
        { time: new Date(now.getTime() - 300000).toISOString(), message: "Resolved ticket #1247" },
        { time: new Date(now.getTime() - 900000).toISOString(), message: "Answered Discord question" },
        { time: new Date(now.getTime() - 1500000).toISOString(), message: "Updated FAQ entry" },
      ],
      metrics: {
        avgResponseTime: 0.7,
        successRate: 98,
        cpuUsage: randomMetric(15, 35),
        memoryUsage: randomMetric(20, 35),
      },
    },
  ];
}

export async function GET() {
  const agents = generateAgentActivity();

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
  };

  return NextResponse.json({
    agents,
    stats,
    timestamp: new Date().toISOString(),
  });
}
