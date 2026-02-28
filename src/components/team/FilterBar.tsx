import type { Department } from "@/types/team";

interface FilterBarProps {
  departments: Department[];
  active: string | null;
  onFilter: (deptId: string | null) => void;
  onAdd: () => void;
}

export default function FilterBar({ departments, active, onFilter, onAdd }: FilterBarProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onFilter(null)}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            active === null
              ? "bg-accent/15 text-accent"
              : "bg-surface border border-border text-text-muted hover:text-text"
          }`}
        >
          All
        </button>
        {departments
          .filter((d) => d.id !== "leadership")
          .map((dept) => (
            <button
              key={dept.id}
              onClick={() => onFilter(dept.id)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                active === dept.id
                  ? "text-white"
                  : "bg-surface border border-border text-text-muted hover:text-text"
              }`}
              style={active === dept.id ? { backgroundColor: dept.color } : undefined}
            >
              {dept.name}
            </button>
          ))}
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent/80 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Member
      </button>
    </div>
  );
}
