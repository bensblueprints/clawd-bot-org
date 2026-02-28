import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/data";
import type { TaskboardData, Task } from "@/types/taskboard";

const FILE = "taskboard.json";

export async function GET() {
  const data = await readJsonFile<TaskboardData>(FILE);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Omit<Task, "id">;
  const data = await readJsonFile<TaskboardData>(FILE);

  const maxId = data.tasks.reduce((max, t) => Math.max(max, t.id), 0);
  const newTask: Task = { ...body, id: maxId + 1 };
  data.tasks.push(newTask);
  data.lastUpdated = new Date().toISOString();

  await writeJsonFile(FILE, data);
  return NextResponse.json(newTask, { status: 201 });
}
