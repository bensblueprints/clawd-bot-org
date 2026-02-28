"use client";

import { useEffect, useState, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAgentStream, AgentMessage, AgentTask } from "@/hooks/useAgentStream";

interface Agent {
  id: string;
  name: string;
  role: string;
  status: "working" | "idle" | "offline";
  currentTask?: string;
  avatar: string;
  x: number;
  y: number;
  taskProgress?: number;
}

interface DataFlow {
  id: string;
  from: string;
  to: string;
  active: boolean;
  type: "task" | "data" | "review" | "chat";
  messagePreview?: string;
}

interface AnimatedOfficeProps {
  onAgentClick?: (agent: Agent) => void;
}

// Agent positions with better spacing - larger grid layout
const AGENT_CONFIG: Record<string, { avatar: string; x: number; y: number; row: number; col: number }> = {
  claude: { avatar: "🧠", x: 600, y: 80, row: 0, col: 2 },
  quill: { avatar: "✍️", x: 200, y: 220, row: 1, col: 0 },
  builder: { avatar: "🔧", x: 600, y: 220, row: 1, col: 2 },
  pixel: { avatar: "🎨", x: 1000, y: 220, row: 1, col: 4 },
  scout: { avatar: "🔍", x: 200, y: 400, row: 2, col: 0 },
  archie: { avatar: "🏗️", x: 600, y: 400, row: 2, col: 2 },
  sentinel: { avatar: "🛡️", x: 1000, y: 400, row: 2, col: 4 },
  herald: { avatar: "📣", x: 400, y: 580, row: 3, col: 1 },
  solver: { avatar: "💡", x: 800, y: 580, row: 3, col: 3 },
};

export default function AnimatedOffice({ onAgentClick }: AnimatedOfficeProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [flows, setFlows] = useState<DataFlow[]>([]);
  const [particles, setParticles] = useState<Array<{ id: number; flowId: string; progress: number }>>([]);
  const [recentMessages, setRecentMessages] = useState<AgentMessage[]>([]);
  const { colors } = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const particleIdRef = useRef(0);

  // Use the SSE stream for real-time data
  const { messages, tasks, isConnected } = useAgentStream();

  // Update agents based on tasks
  useEffect(() => {
    const tasksByAgent: Record<string, AgentTask[]> = {};
    for (const task of tasks) {
      if (!tasksByAgent[task.agent]) {
        tasksByAgent[task.agent] = [];
      }
      tasksByAgent[task.agent].push(task);
    }

    const updatedAgents: Agent[] = Object.entries(AGENT_CONFIG).map(([id, config]) => {
      const agentTasks = tasksByAgent[id] || [];
      const activeTask = agentTasks.find(t => t.status === "in_progress");
      const hasPendingTasks = agentTasks.some(t => t.status === "pending");

      let status: "working" | "idle" | "offline" = "idle";
      if (activeTask) {
        status = "working";
      } else if (hasPendingTasks) {
        status = "working";
      }

      // Claude is always active
      if (id === "claude") {
        status = "working";
      }

      const agentNames: Record<string, { name: string; role: string }> = {
        claude: { name: "Claude", role: "Lead AI" },
        scout: { name: "Scout", role: "Explorer" },
        builder: { name: "Builder", role: "Developer" },
        solver: { name: "Solver", role: "Problem Solver" },
        archie: { name: "Archie", role: "Architect" },
        pixel: { name: "Pixel", role: "Designer" },
        sentinel: { name: "Sentinel", role: "Reviewer" },
        quill: { name: "Quill", role: "Writer" },
        herald: { name: "Herald", role: "Liaison" },
      };

      return {
        id,
        name: agentNames[id]?.name || id,
        role: agentNames[id]?.role || "Agent",
        status,
        currentTask: activeTask?.title,
        avatar: config.avatar,
        x: config.x,
        y: config.y,
        taskProgress: activeTask?.progress,
      };
    });

    setAgents(updatedAgents);
  }, [tasks]);

  // Update flows based on recent messages
  useEffect(() => {
    // Keep track of recent messages for flow visualization
    const recent = messages.slice(-20);
    setRecentMessages(recent);

    // Create active flows from recent messages between agents
    const activeFlows: DataFlow[] = [];
    const seenFlows = new Set<string>();

    for (const msg of recent) {
      const from = msg.from;
      const to = msg.to === "broadcast" ? "claude" : msg.to;

      // Only show flows between agents that have positions
      if (from in AGENT_CONFIG && to in AGENT_CONFIG && from !== to) {
        const flowId = `${from}-${to}`;
        if (!seenFlows.has(flowId)) {
          seenFlows.add(flowId);

          let flowType: "task" | "data" | "review" | "chat" = "chat";
          if (msg.type === "delegation" || msg.type === "task") flowType = "task";
          else if (msg.type === "result") flowType = "data";
          else if (msg.type === "question") flowType = "review";

          activeFlows.push({
            id: flowId,
            from,
            to,
            active: true,
            type: flowType,
            messagePreview: msg.content.substring(0, 50),
          });
        }
      }
    }

    // Add some default flows when no real communication
    if (activeFlows.length === 0) {
      const workingAgentIds = agents.filter(a => a.status === "working").map(a => a.id);
      if (workingAgentIds.includes("claude")) {
        for (const agentId of workingAgentIds.filter(id => id !== "claude")) {
          activeFlows.push({
            id: `claude-${agentId}`,
            from: "claude",
            to: agentId,
            active: true,
            type: "task",
          });
        }
      }
    }

    setFlows(activeFlows);
  }, [messages, agents]);

  // Animate particles along active flows
  useEffect(() => {
    const activeFlows = flows.filter(f => f.active);
    if (activeFlows.length === 0) {
      setParticles([]);
      return;
    }

    const spawnInterval = setInterval(() => {
      activeFlows.forEach(flow => {
        particleIdRef.current++;
        setParticles(prev => [...prev, {
          id: particleIdRef.current,
          flowId: flow.id,
          progress: 0,
        }]);
      });
    }, 1200);

    const moveInterval = setInterval(() => {
      setParticles(prev =>
        prev
          .map(p => ({ ...p, progress: p.progress + 0.015 }))
          .filter(p => p.progress < 1)
      );
    }, 16);

    return () => {
      clearInterval(spawnInterval);
      clearInterval(moveInterval);
    };
  }, [flows]);

  function getAgentPosition(agentId: string): { x: number; y: number } {
    const agent = agents.find(a => a.id === agentId);
    if (agent) return { x: agent.x, y: agent.y };
    const config = AGENT_CONFIG[agentId];
    return config ? { x: config.x, y: config.y } : { x: 0, y: 0 };
  }

  function getFlowColor(type: DataFlow["type"]): string {
    switch (type) {
      case "task": return colors.task;
      case "data": return colors.data;
      case "review": return colors.review;
      case "chat": return colors.accent;
      default: return colors.muted;
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case "working": return colors.working;
      case "idle": return colors.idle;
      default: return colors.offline;
    }
  }

  const workingAgents = agents.filter(a => a.status === "working");
  const idleAgents = agents.filter(a => a.status === "idle");

  return (
    <div className="space-y-4">
      {/* Main Office View */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
      >
        {/* Connection status indicator */}
        <div
          className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs z-10"
          style={{
            background: `${colors.surface}ee`,
            border: `1px solid ${colors.border}`,
          }}
        >
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? "animate-pulse" : ""}`}
            style={{ background: isConnected ? colors.working : colors.offline }}
          />
          <span style={{ color: colors.text }}>
            {isConnected ? "Live" : "Connecting..."}
          </span>
        </div>

        {/* Animated background grid */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="office-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke={colors.accent} strokeWidth="0.5"/>
              </pattern>
              <radialGradient id="center-glow" cx="50%" cy="30%" r="50%">
                <stop offset="0%" stopColor={colors.accent} stopOpacity="0.15"/>
                <stop offset="100%" stopColor={colors.accent} stopOpacity="0"/>
              </radialGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#office-grid)" />
            <rect width="100%" height="100%" fill="url(#center-glow)" />
          </svg>
        </div>

        <svg
          ref={svgRef}
          viewBox="0 0 1200 700"
          className="w-full h-auto"
          style={{ minHeight: "600px", maxHeight: "75vh" }}
        >
          <defs>
            {/* Glow filters for each flow type */}
            <filter id="glow-task" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glow-data" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glow-review" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glow-chat" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="agent-shadow">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor={colors.accent} floodOpacity="0.3"/>
            </filter>
          </defs>

          {/* Data flow lines */}
          {flows.map(flow => {
            const from = getAgentPosition(flow.from);
            const to = getAgentPosition(flow.to);
            const isActive = flow.active;
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2 - 30;

            return (
              <g key={flow.id}>
                {/* Curved path */}
                <path
                  d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
                  fill="none"
                  stroke={isActive ? getFlowColor(flow.type) : colors.border}
                  strokeWidth={isActive ? 3 : 1}
                  strokeDasharray={isActive ? "none" : "8,8"}
                  opacity={isActive ? 0.8 : 0.3}
                  filter={isActive ? `url(#glow-${flow.type})` : undefined}
                />

                {/* Animated glow overlay */}
                {isActive && (
                  <path
                    d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
                    fill="none"
                    stroke={getFlowColor(flow.type)}
                    strokeWidth={8}
                    opacity={0.2}
                    className="animate-pulse"
                  />
                )}
              </g>
            );
          })}

          {/* Animated particles */}
          {particles.map(particle => {
            const flow = flows.find(f => f.id === particle.flowId);
            if (!flow) return null;

            const from = getAgentPosition(flow.from);
            const to = getAgentPosition(flow.to);
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2 - 30;

            // Quadratic bezier interpolation
            const t = particle.progress;
            const x = (1-t)*(1-t)*from.x + 2*(1-t)*t*midX + t*t*to.x;
            const y = (1-t)*(1-t)*from.y + 2*(1-t)*t*midY + t*t*to.y;

            return (
              <g key={particle.id}>
                <circle
                  cx={x}
                  cy={y}
                  r={8}
                  fill={getFlowColor(flow.type)}
                  opacity={0.9}
                  filter={`url(#glow-${flow.type})`}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={4}
                  fill="#ffffff"
                  opacity={0.8}
                />
              </g>
            );
          })}

          {/* Agent workstations */}
          {agents.map(agent => {
            const statusColor = getStatusColor(agent.status);

            return (
              <g
                key={agent.id}
                transform={`translate(${agent.x - 70}, ${agent.y - 55})`}
                className="cursor-pointer transition-transform hover:scale-105"
                style={{ transformOrigin: `${agent.x}px ${agent.y}px` }}
                onClick={() => onAgentClick?.(agent)}
              >
                {/* Desk platform */}
                <rect
                  x="0"
                  y="50"
                  width="140"
                  height="70"
                  rx="12"
                  fill={colors.surface}
                  stroke={colors.border}
                  strokeWidth="2"
                  filter="url(#agent-shadow)"
                />

                {/* Monitor */}
                <rect
                  x="25"
                  y="25"
                  width="90"
                  height="55"
                  rx="6"
                  fill={agent.status === "working" ? colors.bg : colors.surface}
                  stroke={statusColor}
                  strokeWidth="2"
                />

                {/* Monitor stand */}
                <rect
                  x="60"
                  y="80"
                  width="20"
                  height="8"
                  fill={colors.border}
                />

                {/* Screen content */}
                {agent.status === "working" && (
                  <g>
                    <rect x="32" y="33" width="25" height="4" rx="2" fill={statusColor} opacity="0.7" />
                    <rect x="32" y="42" width="70" height="3" rx="1.5" fill={colors.muted} opacity="0.5" />
                    <rect x="32" y="50" width="55" height="3" rx="1.5" fill={colors.muted} opacity="0.5" />
                    <rect x="32" y="58" width="60" height="3" rx="1.5" fill={colors.muted} opacity="0.5" />
                    <rect x="32" y="66" width="40" height="3" rx="1.5" fill={colors.muted} opacity="0.5" />

                    {/* Progress bar */}
                    {agent.taskProgress !== undefined && (
                      <>
                        <rect x="32" y="72" width="70" height="4" rx="2" fill={colors.border} />
                        <rect x="32" y="72" width={70 * (agent.taskProgress / 100)} height="4" rx="2" fill={statusColor} />
                      </>
                    )}
                  </g>
                )}

                {/* Agent avatar circle */}
                <circle
                  cx="70"
                  cy="-5"
                  r="32"
                  fill={colors.surface}
                  stroke={statusColor}
                  strokeWidth="3"
                />
                <text
                  x="70"
                  y="5"
                  textAnchor="middle"
                  fontSize="28"
                >
                  {agent.avatar}
                </text>

                {/* Status indicator with pulse */}
                <circle
                  cx="95"
                  cy="10"
                  r="10"
                  fill={statusColor}
                  className={agent.status === "working" ? "animate-pulse" : ""}
                />
                {agent.status === "working" && (
                  <circle
                    cx="95"
                    cy="10"
                    r="14"
                    fill="none"
                    stroke={statusColor}
                    strokeWidth="2"
                    opacity="0.5"
                    className="animate-ping"
                  />
                )}

                {/* Name */}
                <text
                  x="70"
                  y="135"
                  textAnchor="middle"
                  fill={colors.text}
                  fontSize="14"
                  fontWeight="600"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {agent.name}
                </text>

                {/* Role */}
                <text
                  x="70"
                  y="152"
                  textAnchor="middle"
                  fill={colors.muted}
                  fontSize="11"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {agent.role.length > 20 ? agent.role.substring(0, 20) + "..." : agent.role}
                </text>

                {/* Current task badge */}
                {agent.currentTask && agent.status === "working" && (
                  <g>
                    <rect
                      x="5"
                      y="165"
                      width="130"
                      height="26"
                      rx="6"
                      fill={statusColor}
                      opacity="0.15"
                    />
                    <rect
                      x="5"
                      y="165"
                      width="130"
                      height="26"
                      rx="6"
                      fill="none"
                      stroke={statusColor}
                      strokeWidth="1"
                      opacity="0.3"
                    />
                    <text
                      x="70"
                      y="182"
                      textAnchor="middle"
                      fill={statusColor}
                      fontSize="10"
                      fontWeight="500"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {agent.currentTask.length > 20
                        ? agent.currentTask.substring(0, 20) + "..."
                        : agent.currentTask}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Legend */}
          <g transform="translate(30, 660)">
            <text fill={colors.muted} fontSize="11" fontWeight="600" letterSpacing="1">DATA FLOW:</text>
            <circle cx="100" cy="-3" r="6" fill={colors.task} />
            <text x="112" fill={colors.muted} fontSize="10">Task</text>
            <circle cx="160" cy="-3" r="6" fill={colors.data} />
            <text x="172" fill={colors.muted} fontSize="10">Result</text>
            <circle cx="220" cy="-3" r="6" fill={colors.review} />
            <text x="232" fill={colors.muted} fontSize="10">Question</text>
            <circle cx="305" cy="-3" r="6" fill={colors.accent} />
            <text x="317" fill={colors.muted} fontSize="10">Chat</text>
          </g>
        </svg>

        {/* Active tasks panel */}
        <div
          className="absolute top-4 right-4 rounded-xl p-4 backdrop-blur-md max-w-sm"
          style={{
            background: `${colors.bg}ee`,
            border: `1px solid ${colors.border}`,
            boxShadow: `0 8px 32px ${colors.accent}22`
          }}
        >
          <div
            className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"
            style={{ color: colors.muted }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: colors.working }}
            />
            Active Tasks ({workingAgents.length})
          </div>
          {workingAgents.length > 0 ? (
            <div className="space-y-3">
              {workingAgents.map(agent => (
                <div key={agent.id} className="flex items-start gap-3">
                  <span className="text-xl">{agent.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <span
                      className="font-medium text-sm block"
                      style={{ color: colors.text }}
                    >
                      {agent.name}
                    </span>
                    {agent.currentTask && (
                      <p
                        className="text-xs mt-0.5 truncate"
                        style={{ color: colors.muted }}
                      >
                        {agent.currentTask}
                      </p>
                    )}
                    {agent.taskProgress !== undefined && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div
                          className="flex-1 h-1.5 rounded-full overflow-hidden"
                          style={{ background: colors.border }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${agent.taskProgress}%`,
                              background: colors.working
                            }}
                          />
                        </div>
                        <span
                          className="text-xs font-medium"
                          style={{ color: colors.working }}
                        >
                          {agent.taskProgress}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: colors.muted }}>
              No active tasks. Agents are standing by.
            </p>
          )}

          {idleAgents.length > 0 && (
            <div
              className="mt-4 pt-3"
              style={{ borderTop: `1px solid ${colors.border}` }}
            >
              <p className="text-xs" style={{ color: colors.muted }}>
                <span style={{ color: colors.idle }}>{idleAgents.length}</span> agents idle:{" "}
                {idleAgents.slice(0, 4).map(a => a.name).join(", ")}
                {idleAgents.length > 4 && ` +${idleAgents.length - 4} more`}
              </p>
            </div>
          )}
        </div>

        {/* Recent communications panel */}
        {recentMessages.length > 0 && (
          <div
            className="absolute bottom-4 right-4 rounded-xl p-4 backdrop-blur-md max-w-sm max-h-48 overflow-y-auto"
            style={{
              background: `${colors.bg}ee`,
              border: `1px solid ${colors.border}`,
              boxShadow: `0 8px 32px ${colors.accent}22`
            }}
          >
            <div
              className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2"
              style={{ color: colors.muted }}
            >
              <span>💬</span>
              Recent Comms
            </div>
            <div className="space-y-2">
              {recentMessages.slice(-5).reverse().map(msg => (
                <div key={msg.id} className="text-xs" style={{ color: colors.text }}>
                  <span style={{ color: colors.accent }}>
                    {msg.from.charAt(0).toUpperCase() + msg.from.slice(1)}
                  </span>
                  <span style={{ color: colors.muted }}> → </span>
                  <span style={{ color: colors.muted }}>
                    {msg.to === "broadcast" ? "All" : msg.to.charAt(0).toUpperCase() + msg.to.slice(1)}
                  </span>
                  <p className="truncate" style={{ color: colors.muted }}>
                    {msg.content.substring(0, 60)}...
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status bar */}
        <div
          className="absolute bottom-4 left-4 flex items-center gap-6 text-xs px-4 py-2 rounded-lg"
          style={{
            background: `${colors.surface}cc`,
            border: `1px solid ${colors.border}`
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${isConnected ? "animate-pulse" : ""}`}
              style={{ background: isConnected ? colors.working : colors.offline }}
            />
            <span style={{ color: colors.muted }}>
              {isConnected ? "Live • Real-time" : "Reconnecting..."}
            </span>
          </div>
          <div style={{ color: colors.muted }}>
            <span style={{ color: colors.working }}>{workingAgents.length}</span> working • {" "}
            <span style={{ color: colors.idle }}>{idleAgents.length}</span> idle
          </div>
          {recentMessages.length > 0 && (
            <div style={{ color: colors.muted }}>
              {recentMessages.length} messages
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
