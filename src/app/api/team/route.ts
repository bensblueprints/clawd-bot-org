import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/data";
import type { TeamData, Member } from "@/types/team";

const FILE = "team-data.json";

export async function GET() {
  const data = await readJsonFile<TeamData>(FILE);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Omit<Member, "id">;
  const data = await readJsonFile<TeamData>(FILE);

  const maxId = data.members.reduce((max, m) => Math.max(max, m.id), 0);
  const newMember: Member = { ...body, id: maxId + 1 };
  data.members.push(newMember);
  data.lastUpdated = new Date().toISOString();

  await writeJsonFile(FILE, data);
  return NextResponse.json(newMember, { status: 201 });
}
