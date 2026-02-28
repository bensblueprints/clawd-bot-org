import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const CLICKUP_FILE = path.join(DATA_DIR, "clickup-sync.json");

// ClickUp API configuration
const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY || "pk_306728756_UCIUFUSGICE8SIV1FBB03JPJRENMIML4";
const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";

interface ClickUpTask {
  id: string;
  name: string;
  description: string;
  status: {
    status: string;
    type: string;
  };
  priority?: {
    priority: string;
  };
  assignees: Array<{ username: string }>;
  due_date?: string;
  tags: Array<{ name: string }>;
  list: {
    id: string;
    name: string;
  };
  folder: {
    id: string;
    name: string;
  };
  space: {
    id: string;
  };
}

interface SyncedTask {
  clickupId: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  assignedAgent?: string;
  executionStatus: "pending" | "in_progress" | "completed" | "failed";
  lastSynced: string;
  projectId?: string;
}

interface ClickUpData {
  syncedTasks: SyncedTask[];
  workspaces: Array<{ id: string; name: string }>;
  lastSync: string;
  autoExecuteEnabled: boolean;
}

// Agent mapping based on task tags or keywords
const AGENT_MAPPING: Record<string, string[]> = {
  quill: ["content", "blog", "write", "copy", "social", "article", "post"],
  builder: ["code", "develop", "website", "landing", "component", "api", "build"],
  pixel: ["design", "ui", "graphics", "creative", "mockup", "visual"],
  scout: ["research", "analyze", "competitor", "market", "data"],
  herald: ["outreach", "email", "sales", "proposal", "client"],
  archie: ["plan", "strategy", "architecture", "scope"],
  sentinel: ["review", "qa", "test", "check", "optimize"],
};

async function loadClickUpData(): Promise<ClickUpData> {
  try {
    const raw = await fs.readFile(CLICKUP_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {
      syncedTasks: [],
      workspaces: [],
      lastSync: new Date().toISOString(),
      autoExecuteEnabled: false,
    };
  }
}

async function saveClickUpData(data: ClickUpData): Promise<void> {
  data.lastSync = new Date().toISOString();
  await fs.writeFile(CLICKUP_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// Determine which agent should handle a task
function determineAgent(task: ClickUpTask): string {
  const text = `${task.name} ${task.description || ""} ${task.tags.map(t => t.name).join(" ")}`.toLowerCase();

  for (const [agent, keywords] of Object.entries(AGENT_MAPPING)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return agent;
      }
    }
  }

  // Default to quill for content tasks
  return "quill";
}

// Fetch workspaces from ClickUp
async function fetchWorkspaces(): Promise<Array<{ id: string; name: string }>> {
  try {
    const res = await fetch(`${CLICKUP_API_BASE}/team`, {
      headers: { Authorization: CLICKUP_API_KEY },
    });
    const data = await res.json();
    return data.teams?.map((t: { id: string; name: string }) => ({
      id: t.id,
      name: t.name,
    })) || [];
  } catch (error) {
    console.error("Failed to fetch workspaces:", error);
    return [];
  }
}

// Fetch spaces in a workspace
async function fetchSpaces(teamId: string): Promise<Array<{ id: string; name: string }>> {
  try {
    const res = await fetch(`${CLICKUP_API_BASE}/team/${teamId}/space`, {
      headers: { Authorization: CLICKUP_API_KEY },
    });
    const data = await res.json();
    return data.spaces || [];
  } catch (error) {
    console.error("Failed to fetch spaces:", error);
    return [];
  }
}

// Fetch tasks from a space (with "to do" or "in progress" status)
async function fetchTasks(spaceId: string): Promise<ClickUpTask[]> {
  try {
    // Get all lists in the space first
    const foldersRes = await fetch(`${CLICKUP_API_BASE}/space/${spaceId}/folder`, {
      headers: { Authorization: CLICKUP_API_KEY },
    });
    const foldersData = await foldersRes.json();

    const allTasks: ClickUpTask[] = [];

    // Get folderless lists
    const folderlessRes = await fetch(`${CLICKUP_API_BASE}/space/${spaceId}/list`, {
      headers: { Authorization: CLICKUP_API_KEY },
    });
    const folderlessData = await folderlessRes.json();

    for (const list of folderlessData.lists || []) {
      const tasksRes = await fetch(
        `${CLICKUP_API_BASE}/list/${list.id}/task?statuses[]=to%20do&statuses[]=in%20progress&statuses[]=open`,
        { headers: { Authorization: CLICKUP_API_KEY } }
      );
      const tasksData = await tasksRes.json();
      allTasks.push(...(tasksData.tasks || []));
    }

    // Get tasks from folders
    for (const folder of foldersData.folders || []) {
      for (const list of folder.lists || []) {
        const tasksRes = await fetch(
          `${CLICKUP_API_BASE}/list/${list.id}/task?statuses[]=to%20do&statuses[]=in%20progress&statuses[]=open`,
          { headers: { Authorization: CLICKUP_API_KEY } }
        );
        const tasksData = await tasksRes.json();
        allTasks.push(...(tasksData.tasks || []));
      }
    }

    return allTasks;
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return [];
  }
}

// Update task status in ClickUp
async function updateTaskStatus(taskId: string, status: string): Promise<boolean> {
  try {
    const res = await fetch(`${CLICKUP_API_BASE}/task/${taskId}`, {
      method: "PUT",
      headers: {
        Authorization: CLICKUP_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    return res.ok;
  } catch (error) {
    console.error("Failed to update task status:", error);
    return false;
  }
}

// Add comment to ClickUp task
async function addTaskComment(taskId: string, comment: string): Promise<boolean> {
  try {
    const res = await fetch(`${CLICKUP_API_BASE}/task/${taskId}/comment`, {
      method: "POST",
      headers: {
        Authorization: CLICKUP_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment_text: comment }),
    });
    return res.ok;
  } catch (error) {
    console.error("Failed to add comment:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, workspaceId, spaceId, taskId } = body;

    // Sync tasks from ClickUp
    if (action === "sync") {
      const data = await loadClickUpData();

      // Fetch workspaces if not provided
      if (!workspaceId) {
        const workspaces = await fetchWorkspaces();
        data.workspaces = workspaces;
        await saveClickUpData(data);
        return NextResponse.json({
          success: true,
          workspaces,
          message: "Select a workspace to sync tasks from",
        });
      }

      // Fetch spaces in workspace
      if (!spaceId) {
        const spaces = await fetchSpaces(workspaceId);
        return NextResponse.json({
          success: true,
          spaces,
          message: "Select a space to sync tasks from",
        });
      }

      // Fetch and sync tasks
      const tasks = await fetchTasks(spaceId);
      const newSyncedTasks: SyncedTask[] = tasks.map(task => ({
        clickupId: task.id,
        name: task.name,
        description: task.description || "",
        status: task.status?.status || "unknown",
        priority: task.priority?.priority || "medium",
        assignedAgent: determineAgent(task),
        executionStatus: "pending",
        lastSynced: new Date().toISOString(),
      }));

      // Merge with existing synced tasks
      const existingIds = new Set(data.syncedTasks.map(t => t.clickupId));
      for (const task of newSyncedTasks) {
        if (!existingIds.has(task.clickupId)) {
          data.syncedTasks.push(task);
        } else {
          // Update existing
          const idx = data.syncedTasks.findIndex(t => t.clickupId === task.clickupId);
          if (idx >= 0) {
            data.syncedTasks[idx] = { ...data.syncedTasks[idx], ...task };
          }
        }
      }

      await saveClickUpData(data);

      return NextResponse.json({
        success: true,
        synced: newSyncedTasks.length,
        total: data.syncedTasks.length,
        tasks: newSyncedTasks,
      });
    }

    // Execute a synced task with the orchestrator
    if (action === "execute" && taskId) {
      const data = await loadClickUpData();
      const task = data.syncedTasks.find(t => t.clickupId === taskId);

      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      // Call the orchestrator to create a project
      const prompt = `Execute this task:\n\nTitle: ${task.name}\n\nDescription: ${task.description}\n\nAssigned Agent: ${task.assignedAgent}\n\nCreate the deliverables for this task.`;

      const orchestratorRes = await fetch(new URL("/api/orchestrator", request.url).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const orchestratorData = await orchestratorRes.json();

      if (orchestratorData.success) {
        // Update task status
        task.executionStatus = "in_progress";
        task.projectId = orchestratorData.project.id;

        // Execute all tasks in the project
        const executeRes = await fetch(new URL("/api/orchestrator", request.url).toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "execute_all",
            projectId: orchestratorData.project.id,
          }),
        });

        const executeData = await executeRes.json();

        if (executeData.success) {
          task.executionStatus = "completed";

          // Update ClickUp task status to "complete"
          await updateTaskStatus(taskId, "complete");

          // Add comment with deliverables
          const deliverables = executeData.deliverables?.join("\n- ") || "No files generated";
          await addTaskComment(
            taskId,
            `✅ Task completed by Clawd Bot Org!\n\nDeliverables:\n- ${deliverables}\n\nProject ID: ${task.projectId}`
          );
        } else {
          task.executionStatus = "failed";
        }

        await saveClickUpData(data);

        return NextResponse.json({
          success: true,
          task,
          project: orchestratorData.project,
          deliverables: executeData.deliverables,
        });
      } else {
        return NextResponse.json({
          success: false,
          error: orchestratorData.error,
        });
      }
    }

    // Execute all pending tasks
    if (action === "execute_all") {
      const data = await loadClickUpData();
      const pendingTasks = data.syncedTasks.filter(t => t.executionStatus === "pending");
      const results = [];

      for (const task of pendingTasks.slice(0, 5)) { // Limit to 5 at a time
        // Call execute for each task
        const res = await fetch(new URL("/api/clickup", request.url).toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "execute", taskId: task.clickupId }),
        });
        const result = await res.json();
        results.push(result);
      }

      return NextResponse.json({
        success: true,
        executed: results.length,
        results,
      });
    }

    // Toggle auto-execute
    if (action === "toggle_auto") {
      const data = await loadClickUpData();
      data.autoExecuteEnabled = !data.autoExecuteEnabled;
      await saveClickUpData(data);

      return NextResponse.json({
        success: true,
        autoExecuteEnabled: data.autoExecuteEnabled,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("ClickUp API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const data = await loadClickUpData();

  const stats = {
    totalSynced: data.syncedTasks.length,
    pending: data.syncedTasks.filter(t => t.executionStatus === "pending").length,
    inProgress: data.syncedTasks.filter(t => t.executionStatus === "in_progress").length,
    completed: data.syncedTasks.filter(t => t.executionStatus === "completed").length,
    failed: data.syncedTasks.filter(t => t.executionStatus === "failed").length,
    autoExecuteEnabled: data.autoExecuteEnabled,
  };

  return NextResponse.json({
    tasks: data.syncedTasks.slice(-50),
    workspaces: data.workspaces,
    stats,
    lastSync: data.lastSync,
  });
}
