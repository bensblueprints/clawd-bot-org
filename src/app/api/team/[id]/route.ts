import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/data";
import type { TeamData, Member } from "@/types/team";

const FILE = "team-data.json";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await readJsonFile<TeamData>(FILE);
  const member = data.members.find((m) => m.id === Number(id));
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(member);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as Partial<Member>;
  const data = await readJsonFile<TeamData>(FILE);
  const index = data.members.findIndex((m) => m.id === Number(id));

  if (index === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  data.members[index] = { ...data.members[index], ...body, id: Number(id) };
  data.lastUpdated = new Date().toISOString();
  await writeJsonFile(FILE, data);

  return NextResponse.json(data.members[index]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await readJsonFile<TeamData>(FILE);
  const index = data.members.findIndex((m) => m.id === Number(id));

  if (index === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  data.members.splice(index, 1);
  data.lastUpdated = new Date().toISOString();
  await writeJsonFile(FILE, data);

  return NextResponse.json({ success: true });
}
