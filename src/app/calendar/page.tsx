import { prisma } from "@/lib/prisma";
import { Calendar, Clock, RefreshCw, Pause, AlertCircle, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

type TaskWithAgent = Awaited<ReturnType<typeof getTasks>>[number];

async function getTasks() {
  return prisma.scheduledTask.findMany({
    include: { agent: { select: { name: true, emoji: true, role: true } } },
    orderBy: [{ nextRunAt: "asc" }, { createdAt: "desc" }],
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; Icon: typeof CheckCircle2 }> = {
    active:  { label: "Active",  color: "#22c55e", Icon: CheckCircle2 },
    paused:  { label: "Paused",  color: "#f59e0b", Icon: Pause },
    failed:  { label: "Failed",  color: "#ef4444", Icon: AlertCircle },
  };
  const cfg = map[status] ?? map.active;
  const { label, color, Icon } = cfg;
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: `${color}18`, color }}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; Icon: typeof Clock }> = {
    cron:      { label: "Cron",      Icon: Clock },
    heartbeat: { label: "Heartbeat", Icon: RefreshCw },
    "one-off": { label: "One-off",  Icon: Calendar },
  };
  const cfg = map[type] ?? { label: type, Icon: Clock };
  const { label, Icon } = cfg;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-[var(--ink-3)] font-mono">
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function fmt(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function EmptyState() {
  return (
    <div
      className="p-12 rounded-xl text-center"
      style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
    >
      <Calendar className="w-8 h-8 mx-auto mb-3 text-[var(--ink-3)]" />
      <p className="text-[var(--ink-2)] text-sm mb-1 font-medium">No scheduled tasks yet</p>
      <p className="text-[var(--ink-3)] text-xs max-w-sm mx-auto">
        Have your OpenClaw agents POST their cron jobs and heartbeats to{" "}
        <code className="font-mono">/api/calendar/tasks</code> and they&apos;ll appear here.
      </p>
    </div>
  );
}

export default async function CalendarPage() {
  const tasks = await getTasks();

  const active  = tasks.filter((t) => t.status === "active").length;
  const paused  = tasks.filter((t) => t.status === "paused").length;
  const failed  = tasks.filter((t) => t.status === "failed").length;

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[32px] font-semibold tracking-[-0.02em] mb-1">Calendar</h1>
        <p className="text-[var(--ink-2)] text-sm">
          Cron jobs, heartbeats, and scheduled runs across all your OpenClaw agents.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total tasks",   value: tasks.length, color: "var(--ink)" },
          { label: "Active",        value: active,       color: "#22c55e" },
          { label: "Needs attention", value: paused + failed, color: failed > 0 ? "#ef4444" : "#f59e0b" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-5"
            style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
          >
            <p className="text-[12px] text-[var(--ink-3)] mb-1">{s.label}</p>
            <p className="text-[28px] font-semibold tracking-tight" style={{ color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Task table */}
      {tasks.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--line)" }}
        >
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: "var(--panel)", borderBottom: "1px solid var(--line)" }}>
                {["Agent", "Task", "Type", "Schedule", "Last run", "Next run", "Status"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-medium tracking-wide text-[var(--ink-3)] uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task: TaskWithAgent, i: number) => (
                <tr
                  key={task.id}
                  className="transition-colors hover:bg-[var(--panel)]"
                  style={{
                    borderBottom: i < tasks.length - 1 ? "1px solid var(--line)" : undefined,
                  }}
                >
                  {/* Agent */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">{task.agent.emoji ?? "🤖"}</span>
                      <div>
                        <p className="font-medium text-[var(--ink)]">{task.agent.name}</p>
                        {task.agent.role && (
                          <p className="text-[11px] text-[var(--ink-3)]">{task.agent.role}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Task name + description */}
                  <td className="px-4 py-3 max-w-[240px]">
                    <p className="font-medium text-[var(--ink)] truncate">{task.name}</p>
                    {task.description && (
                      <p className="text-[11px] text-[var(--ink-3)] truncate">{task.description}</p>
                    )}
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">
                    <TypeBadge type={task.type} />
                  </td>

                  {/* Schedule expression */}
                  <td className="px-4 py-3">
                    {task.schedule ? (
                      <code className="text-[11px] font-mono text-[var(--ink-2)] bg-[var(--panel)] px-1.5 py-0.5 rounded">
                        {task.schedule}
                      </code>
                    ) : (
                      <span className="text-[var(--ink-3)]">—</span>
                    )}
                  </td>

                  {/* Last run */}
                  <td className="px-4 py-3 text-[var(--ink-2)] whitespace-nowrap">
                    {fmt(task.lastRunAt)}
                  </td>

                  {/* Next run */}
                  <td className="px-4 py-3 text-[var(--ink-2)] whitespace-nowrap">
                    {fmt(task.nextRunAt)}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={task.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Wire-up hint */}
      <div
        className="mt-6 p-4 rounded-xl text-[12px] text-[var(--ink-3)]"
        style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
      >
        <strong className="text-[var(--ink-2)]">Wiring agents:</strong> have each agent{" "}
        <code className="font-mono">POST /api/calendar/tasks</code> with{" "}
        <code className="font-mono">agentId</code>, <code className="font-mono">name</code>,{" "}
        <code className="font-mono">type</code> (<code className="font-mono">cron</code> /{" "}
        <code className="font-mono">heartbeat</code> / <code className="font-mono">one-off</code>),{" "}
        <code className="font-mono">schedule</code> (cron expr or interval), and optionally{" "}
        <code className="font-mono">nextRunAt</code> / <code className="font-mono">lastRunAt</code>.
      </div>
    </div>
  );
}
