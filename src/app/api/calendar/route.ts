import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/data";
import type { CalendarData, CalendarEvent } from "@/types/calendar";

const FILE = "calendar-data.json";

export async function GET() {
  const data = await readJsonFile<CalendarData>(FILE);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Omit<CalendarEvent, "id">;
  const data = await readJsonFile<CalendarData>(FILE);

  const maxId = data.events.reduce((max, e) => Math.max(max, e.id), 0);
  const now = new Date().toISOString().split("T")[0];
  const newEvent: CalendarEvent = {
    ...body,
    id: maxId + 1,
    createdAt: body.createdAt || now,
    updatedAt: now,
  };
  data.events.push(newEvent);
  data.lastUpdated = new Date().toISOString();

  await writeJsonFile(FILE, data);
  return NextResponse.json(newEvent, { status: 201 });
}
