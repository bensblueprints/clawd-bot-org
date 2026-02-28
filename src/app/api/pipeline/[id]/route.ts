import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/data";
import type { PipelineData } from "@/types/pipeline";

const FILE = "content-data.json";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updates = await request.json();
  const data = await readJsonFile<PipelineData>(FILE);

  const idx = data.items.findIndex((i) => i.id === parseInt(id));
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  data.items[idx] = { ...data.items[idx], ...updates, updatedAt: new Date().toISOString().split("T")[0] };
  data.lastUpdated = new Date().toISOString();

  await writeJsonFile(FILE, data);
  return NextResponse.json(data.items[idx]);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await readJsonFile<PipelineData>(FILE);

  data.items = data.items.filter((i) => i.id !== parseInt(id));
  data.lastUpdated = new Date().toISOString();

  await writeJsonFile(FILE, data);
  return NextResponse.json({ success: true });
}
