import Link from "next/link";

const tools = [
  {
    href: "/team",
    title: "Team Structure",
    desc: "Org chart with all AI agents organized by department",
    color: "#bc8cff",
    ready: true,
  },
  {
    href: "/taskboard",
    title: "Task Board",
    desc: "Kanban board for tracking project tasks",
    color: "#58a6ff",
    ready: true,
  },
  {
    href: "/pipeline",
    title: "Content Pipeline",
    desc: "Multi-format content workflow with stages",
    color: "#3fb950",
    ready: true,
  },
  {
    href: "/office",
    title: "Digital Office",
    desc: "Visual office floor plan with team status",
    color: "#f0883e",
    ready: true,
  },
  {
    href: "/calendar",
    title: "Calendar",
    desc: "Scheduled tasks, cron jobs, and deadlines",
    color: "#39d2c0",
    ready: true,
  },
];

export default function Dashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">
          Welcome to <span className="text-accent">Mission Control</span>
        </h1>
        <p className="text-text-muted mt-1">
          Clawd Bot Org management dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="bg-surface border border-border rounded-xl p-6 hover:border-accent/50 transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: tool.color }}
              />
              <h2 className="font-semibold group-hover:text-accent transition-colors">
                {tool.title}
              </h2>
            </div>
            <p className="text-text-muted text-sm">{tool.desc}</p>
            {!tool.ready && (
              <span className="inline-block mt-3 text-xs px-2 py-1 rounded-full bg-yellow/15 text-yellow font-medium">
                Coming Soon
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
