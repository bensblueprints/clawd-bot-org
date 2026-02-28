interface Stat {
  label: string;
  value: number | string;
  color?: string;
}

interface StatsBarProps {
  stats: Stat[];
}

export default function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="flex gap-4 flex-wrap">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-surface border border-border rounded-lg px-5 py-3 min-w-[120px]"
        >
          <div className="text-2xl font-bold" style={stat.color ? { color: stat.color } : undefined}>
            {stat.value}
          </div>
          <div className="text-xs text-text-muted uppercase tracking-wide mt-0.5">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
