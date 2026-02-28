import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const PERSISTENT_TASKS_FILE = path.join(DATA_DIR, "persistent-tasks.json");

interface PersistentTask {
  id: string;
  title: string;
  description: string;
  assignedAgent: string;
  schedule: "continuous" | "hourly" | "daily" | "weekly";
  priority: "High" | "Medium" | "Low";
  enabled: boolean;
  createdAt: string;
  lastRun?: string;
  runCount?: number;
}

interface TasksData {
  tasks: PersistentTask[];
  lastUpdated: string;
}

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory exists
  }
}

async function loadTasks(): Promise<PersistentTask[]> {
  try {
    const raw = await fs.readFile(PERSISTENT_TASKS_FILE, "utf-8");
    const data: TasksData = JSON.parse(raw);
    return data.tasks || [];
  } catch {
    return [];
  }
}

async function saveTasks(tasks: PersistentTask[]): Promise<void> {
  await ensureDataDir();
  const data: TasksData = {
    tasks,
    lastUpdated: new Date().toISOString(),
  };
  await fs.writeFile(PERSISTENT_TASKS_FILE, JSON.stringify(data, null, 2));
}

// GET - List all persistent tasks
export async function GET() {
  const tasks = await loadTasks();
  return NextResponse.json({ tasks, timestamp: new Date().toISOString() });
}

// POST - Create a new persistent task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tasks = await loadTasks();

    const newTask: PersistentTask = {
      id: body.id || `task-${Date.now()}`,
      title: body.title,
      description: body.description || "",
      assignedAgent: body.assignedAgent || "claude",
      schedule: body.schedule || "continuous",
      priority: body.priority || "Medium",
      enabled: body.enabled !== false,
      createdAt: body.createdAt || new Date().toISOString(),
      runCount: 0,
    };

    tasks.push(newTask);
    await saveTasks(tasks);

    return NextResponse.json({ success: true, task: newTask });
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create task" },
      { status: 500 }
    );
  }
}

// PATCH - Update a persistent task
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Task ID required" },
        { status: 400 }
      );
    }

    const tasks = await loadTasks();
    const taskIndex = tasks.findIndex(t => t.id === id);

    if (taskIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
    await saveTasks(tasks);

    return NextResponse.json({ success: true, task: tasks[taskIndex] });
  } catch (error) {
    console.error("Failed to update task:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a persistent task
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Task ID required" },
        { status: 400 }
      );
    }

    const tasks = await loadTasks();
    const filteredTasks = tasks.filter(t => t.id !== id);

    if (filteredTasks.length === tasks.length) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    await saveTasks(filteredTasks);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete task:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
