import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const CRON_FILE = path.join(process.cwd(), "data", "cron-jobs.json");

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  command: string;
  agent: string;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
  status: "idle" | "running" | "success" | "failed";
  logs: string[];
}

// Default cron jobs
const DEFAULT_CRON_JOBS: CronJob[] = [
  {
    id: "cron-1",
    name: "Daily SEO Content Generation",
    schedule: "0 9 * * *",
    command: "Generate SEO blog post for herbanbud.com",
    agent: "Quill",
    enabled: true,
    lastRun: null,
    nextRun: "2026-03-01T09:00:00Z",
    status: "idle",
    logs: [],
  },
  {
    id: "cron-2",
    name: "Code Quality Scan",
    schedule: "0 */6 * * *",
    command: "Run linting and code quality checks on all active projects",
    agent: "Linter",
    enabled: true,
    lastRun: "2026-02-28T06:00:00Z",
    nextRun: "2026-02-28T12:00:00Z",
    status: "success",
    logs: ["Scanned 12 projects", "Found 3 warnings", "No critical issues"],
  },
  {
    id: "cron-3",
    name: "System Health Check",
    schedule: "*/15 * * * *",
    command: "Check server health, API endpoints, and bot status",
    agent: "Sentinel",
    enabled: true,
    lastRun: "2026-02-28T09:45:00Z",
    nextRun: "2026-02-28T10:00:00Z",
    status: "running",
    logs: ["Checking API endpoints...", "Verifying bot connections..."],
  },
  {
    id: "cron-4",
    name: "Weekly Architecture Review",
    schedule: "0 10 * * 1",
    command: "Review system architecture and generate improvement recommendations",
    agent: "Archie",
    enabled: true,
    lastRun: "2026-02-24T10:00:00Z",
    nextRun: "2026-03-03T10:00:00Z",
    status: "success",
    logs: ["Reviewed 5 microservices", "Generated 2 optimization suggestions"],
  },
  {
    id: "cron-5",
    name: "Documentation Sync",
    schedule: "0 18 * * *",
    command: "Update documentation from code changes",
    agent: "Scribe",
    enabled: false,
    lastRun: "2026-02-27T18:00:00Z",
    nextRun: null,
    status: "idle",
    logs: [],
  },
  {
    id: "cron-6",
    name: "Client Report Generation",
    schedule: "0 8 * * 1",
    command: "Generate weekly performance reports for all clients",
    agent: "Herald",
    enabled: true,
    lastRun: "2026-02-24T08:00:00Z",
    nextRun: "2026-03-03T08:00:00Z",
    status: "success",
    logs: ["Generated 8 client reports", "Sent via email"],
  },
];

async function loadCronJobs(): Promise<CronJob[]> {
  try {
    const data = await fs.readFile(CRON_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    // Create default file
    await fs.mkdir(path.dirname(CRON_FILE), { recursive: true });
    await fs.writeFile(CRON_FILE, JSON.stringify(DEFAULT_CRON_JOBS, null, 2));
    return DEFAULT_CRON_JOBS;
  }
}

async function saveCronJobs(jobs: CronJob[]): Promise<void> {
  await fs.mkdir(path.dirname(CRON_FILE), { recursive: true });
  await fs.writeFile(CRON_FILE, JSON.stringify(jobs, null, 2));
}

// Parse cron expression to human readable
function parseCronExpression(cron: string): string {
  const parts = cron.split(" ");
  if (parts.length !== 5) return cron;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  if (minute.startsWith("*/")) {
    return `Every ${minute.slice(2)} minutes`;
  }
  if (hour.startsWith("*/")) {
    return `Every ${hour.slice(2)} hours`;
  }
  if (dayOfWeek !== "*" && dayOfMonth === "*") {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return `Weekly on ${days[parseInt(dayOfWeek)]} at ${hour}:${minute.padStart(2, "0")}`;
  }
  if (dayOfMonth === "*" && month === "*") {
    return `Daily at ${hour}:${minute.padStart(2, "0")}`;
  }

  return cron;
}

export async function GET() {
  const jobs = await loadCronJobs();

  // Add human-readable schedule
  const jobsWithReadable = jobs.map(job => ({
    ...job,
    scheduleReadable: parseCronExpression(job.schedule),
  }));

  return NextResponse.json({
    jobs: jobsWithReadable,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, jobId, job } = body;

    const jobs = await loadCronJobs();

    switch (action) {
      case "toggle": {
        const idx = jobs.findIndex(j => j.id === jobId);
        if (idx !== -1) {
          jobs[idx].enabled = !jobs[idx].enabled;
          jobs[idx].nextRun = jobs[idx].enabled ? new Date(Date.now() + 3600000).toISOString() : null;
        }
        break;
      }
      case "run": {
        const idx = jobs.findIndex(j => j.id === jobId);
        if (idx !== -1) {
          jobs[idx].status = "running";
          jobs[idx].lastRun = new Date().toISOString();
          jobs[idx].logs = [`Started at ${new Date().toLocaleTimeString()}`, "Processing..."];

          // Simulate completion after a delay (in production, this would be actual execution)
          setTimeout(async () => {
            const currentJobs = await loadCronJobs();
            const jobIdx = currentJobs.findIndex(j => j.id === jobId);
            if (jobIdx !== -1) {
              currentJobs[jobIdx].status = "success";
              currentJobs[jobIdx].logs.push(`Completed at ${new Date().toLocaleTimeString()}`);
              await saveCronJobs(currentJobs);
            }
          }, 5000);
        }
        break;
      }
      case "create": {
        const newJob: CronJob = {
          id: `cron-${Date.now()}`,
          name: job.name,
          schedule: job.schedule,
          command: job.command,
          agent: job.agent,
          enabled: true,
          lastRun: null,
          nextRun: new Date(Date.now() + 3600000).toISOString(),
          status: "idle",
          logs: [],
        };
        jobs.push(newJob);
        break;
      }
      case "delete": {
        const idx = jobs.findIndex(j => j.id === jobId);
        if (idx !== -1) {
          jobs.splice(idx, 1);
        }
        break;
      }
      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }

    await saveCronJobs(jobs);
    return NextResponse.json({ success: true, jobs });
  } catch (error) {
    console.error("Cron API error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
