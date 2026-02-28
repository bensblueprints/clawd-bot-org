import type { TeamData, Member } from "@/types/team";
import LeaderCard from "./LeaderCard";
import DepartmentGroup from "./DepartmentGroup";

interface OrgChartProps {
  teamData: TeamData;
  filter: string | null;
  onEdit: (member: Member) => void;
  onDelete: (id: number) => void;
}

export default function OrgChart({ teamData, filter, onEdit, onDelete }: OrgChartProps) {
  const leader = teamData.members.find((m) => m.department === "leadership");
  const departments = teamData.departments.filter((d) => d.id !== "leadership");
  const filteredDepts = filter ? departments.filter((d) => d.id === filter) : departments;

  return (
    <div>
      {/* Leader */}
      {leader && !filter && (
        <div className="mb-6">
          <LeaderCard member={leader} onEdit={onEdit} />
          {/* Connector */}
          <div className="w-px h-8 mx-auto bg-border" />
          <div className="w-3/4 max-w-2xl h-px mx-auto bg-border" />
        </div>
      )}

      {/* Department groups */}
      <div className="flex flex-wrap gap-6 justify-center">
        {filteredDepts.map((dept) => {
          const deptMembers = teamData.members.filter((m) => m.department === dept.id);
          return (
            <DepartmentGroup
              key={dept.id}
              department={dept}
              members={deptMembers}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          );
        })}
      </div>
    </div>
  );
}
