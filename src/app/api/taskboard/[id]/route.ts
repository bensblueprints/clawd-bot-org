import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/data";
import type { TaskboardData } from "@/types/taskboard";

const FILE = "taskboard.json";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updates = await request.json();
  const data = await readJsonFile<TaskboardData>(FILE);

  const idx = data.tasks.findIndex((t) => t.id === parseInt(id));
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  data.tasks[idx] = { ...data.tasks[idx], ...updates };
  data.lastUpdated = new Date().toISOString();

  await writeJsonFile(FILE, data);
  return NextResponse.json(data.tasks[idx]);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await readJsonFile<TaskboardData>(FILE);

  data.tasks = data.tasks.filter((t) => t.id !== parseInt(id));
  data.lastUpdated = new Date().toISOString();

  await writeJsonFile(FILE, data);
  return NextResponse.json({ success: true });
}
