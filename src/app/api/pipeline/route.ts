import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/data";
import type { PipelineData, PipelineItem } from "@/types/pipeline";

const FILE = "content-data.json";

export async function GET() {
  const data = await readJsonFile<PipelineData>(FILE);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Omit<PipelineItem, "id">;
  const data = await readJsonFile<PipelineData>(FILE);

  const maxId = data.items.reduce((max, i) => Math.max(max, i.id), 0);
  const now = new Date().toISOString().split("T")[0];
  const newItem: PipelineItem = {
    ...body,
    id: maxId + 1,
    createdAt: body.createdAt || now,
    updatedAt: now,
  };
  data.items.push(newItem);
  data.lastUpdated = new Date().toISOString();

  await writeJsonFile(FILE, data);
  return NextResponse.json(newItem, { status: 201 });
}
