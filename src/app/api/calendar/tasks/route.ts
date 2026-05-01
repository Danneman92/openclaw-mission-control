import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function authOk(req: NextRequest) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return true; // dev: no secret configured = open
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

// GET /api/calendar/tasks  — list all scheduled tasks with agent info
export async function GET() {
  const tasks = await prisma.scheduledTask.findMany({
    include: { agent: { select: { name: true, emoji: true, role: true } } },
    orderBy: [{ nextRunAt: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(tasks);
}

// POST /api/calendar/tasks  — upsert a task (agent registers its schedule)
export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { agentId, name, type, schedule, description, lastRunAt, nextRunAt, status } = body;

  if (!agentId || !name) {
    return NextResponse.json({ error: "agentId and name are required" }, { status: 400 });
  }

  // Upsert based on agentId + name combo (stable identity for a recurring task)
  const existing = await prisma.scheduledTask.findFirst({ where: { agentId, name } });

  const data = {
    agentId,
    name,
    type: type ?? "cron",
    schedule: schedule ?? null,
    description: description ?? null,
    lastRunAt: lastRunAt ? new Date(lastRunAt) : undefined,
    nextRunAt: nextRunAt ? new Date(nextRunAt) : undefined,
    status: status ?? "active",
  };

  const task = existing
    ? await prisma.scheduledTask.update({ where: { id: existing.id }, data })
    : await prisma.scheduledTask.create({ data });

  return NextResponse.json(task);
}
