import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/data";
import type { CalendarData } from "@/types/calendar";

const FILE = "calendar-data.json";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updates = await request.json();
  const data = await readJsonFile<CalendarData>(FILE);

  const idx = data.events.findIndex((e) => e.id === parseInt(id));
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  data.events[idx] = { ...data.events[idx], ...updates, updatedAt: new Date().toISOString().split("T")[0] };
  data.lastUpdated = new Date().toISOString();

  await writeJsonFile(FILE, data);
  return NextResponse.json(data.events[idx]);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await readJsonFile<CalendarData>(FILE);

  data.events = data.events.filter((e) => e.id !== parseInt(id));
  data.lastUpdated = new Date().toISOString();

  await writeJsonFile(FILE, data);
  return NextResponse.json({ success: true });
}
