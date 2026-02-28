"use client";

import { useState, useEffect, useCallback } from "react";

interface AgentActivity {
  id: string;
  name: string;
  role: string;
  status: "active" | "idle" | "busy" | "offline";
  currentTask: string | null;
  taskProgress: number;
  taskStarted: string | null;
  lastActive: string;
  tasksCompleted: number;
  tasksToday: number;
  queue: string[];
  recentLogs: { time: string; message: string }[];
  metrics: {
    avgResponseTime: number;
    successRate: number;
    cpuUsage: number;
    memoryUsage: number;
  };
}

interface Stats {
  totalAgents: number;
  activeAgents: number;
  idleAgents: number;
  totalTasksToday: number;
  avgSuccessRate: number;
  avgCpuUsage: number;
  avgMemoryUsage: number;
}

export default function TeamActivityPage() {
  const [agents, setAgents] = useState<AgentActivity[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/activity");
      const data = await res.json();
      setAgents(data.agents || []);
      setStats(data.stats || null);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Failed to fetch agent activity:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
    // Poll every 3 seconds for real-time updates
    const interval = setInterval(fetchActivity, 3000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  function getStatusColor(status: string) {
    switch (status) {
      case "active": return "bg-green-400";
      case "busy": return "bg-blue-400 animate-pulse";
      case "idle": return "bg-yellow-400";
      case "offline": return "bg-gray-500";
      default: return "bg-gray-400";
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "active": return "text-green-400 bg-green-500/20";
      case "busy": return "text-blue-400 bg-blue-500/20";
      case "idle": return "text-yellow-400 bg-yellow-500/20";
      case "offline": return "text-gray-400 bg-gray-500/20";
      default: return "text-gray-400 bg-gray-500/20";
    }
  }

  function formatTime(iso: string) {
    const date = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return date.toLocaleTimeString();
  }

  const selectedAgentData = agents.find(a => a.id === selectedAgent);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-6rem)]">
      {/* Agent List */}
      <div className="w-80 flex-shrink-0 flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold">
            <span className="text-accent">Team Activity</span>
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Real-time agent status • Updated {lastUpdate}
          </p>
        </div>

        {/* Team Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-surface border border-border rounded-lg p-3">
              <div className="text-xl font-bold text-green-400">{stats.activeAgents}</div>
              <div className="text-xs text-text-muted">Active</div>
            </div>
            <div className="bg-surface border border-border rounded-lg p-3">
              <div className="text-xl font-bold">{stats.totalTasksToday}</div>
              <div className="text-xs text-text-muted">Tasks Today</div>
            </div>
            <div className="bg-surface border border-border rounded-lg p-3">
              <div className="text-xl font-bold text-accent">{stats.avgSuccessRate}%</div>
              <div className="text-xs text-text-muted">Success Rate</div>
            </div>
            <div className="bg-surface border border-border rounded-lg p-3">
              <div className="text-xl font-bold text-blue-400">{stats.avgCpuUsage}%</div>
              <div className="text-xs text-text-muted">Avg CPU</div>
            </div>
          </div>
        )}

        {/* Agent List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {agents.map((agent) => (
            <div
              key={agent.id}
              onClick={() => setSelectedAgent(agent.id)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                selectedAgent === agent.id
                  ? "bg-accent/15 border border-accent/50"
                  : "bg-surface border border-border hover:border-accent/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(agent.status)}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{agent.name}</div>
                  <div className="text-xs text-text-muted truncate">{agent.role}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(agent.status)}`}>
                  {agent.status}
                </span>
              </div>
              {agent.currentTask && (
                <div className="mt-2">
                  <div className="text-xs text-text-muted truncate">{agent.currentTask}</div>
                  <div className="mt-1 h-1 bg-bg rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all"
                      style={{ width: `${agent.taskProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Agent Detail Panel */}
      <div className="flex-1 bg-surface border border-border rounded-xl overflow-hidden">
        {selectedAgentData ? (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(selectedAgentData.status)}`} />
                    {selectedAgentData.name}
                  </h2>
                  <p className="text-text-muted">{selectedAgentData.role}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{selectedAgentData.tasksCompleted}</div>
                  <div className="text-xs text-text-muted">Total Tasks</div>
                </div>
              </div>
            </div>

            {/* Current Task */}
            <div className="p-6 border-b border-border">
              <h3 className="text-sm font-medium text-text-muted mb-3">Current Task</h3>
              {selectedAgentData.currentTask ? (
                <div>
                  <p className="mb-2">{selectedAgentData.currentTask}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all"
                        style={{ width: `${selectedAgentData.taskProgress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{selectedAgentData.taskProgress}%</span>
                  </div>
                  {selectedAgentData.taskStarted && (
                    <p className="text-xs text-text-muted mt-2">
                      Started {formatTime(selectedAgentData.taskStarted)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-text-muted">No active task</p>
              )}
            </div>

            {/* Metrics */}
            <div className="p-6 border-b border-border">
              <h3 className="text-sm font-medium text-text-muted mb-3">Performance Metrics</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold">{selectedAgentData.metrics.avgResponseTime}s</div>
                  <div className="text-xs text-text-muted">Avg Response</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-400">{selectedAgentData.metrics.successRate}%</div>
                  <div className="text-xs text-text-muted">Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-400">{selectedAgentData.metrics.cpuUsage}%</div>
                  <div className="text-xs text-text-muted">CPU Usage</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-400">{selectedAgentData.metrics.memoryUsage}%</div>
                  <div className="text-xs text-text-muted">Memory</div>
                </div>
              </div>
            </div>

            {/* Task Queue */}
            {selectedAgentData.queue.length > 0 && (
              <div className="p-6 border-b border-border">
                <h3 className="text-sm font-medium text-text-muted mb-3">
                  Task Queue ({selectedAgentData.queue.length})
                </h3>
                <div className="space-y-2">
                  {selectedAgentData.queue.map((task, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-bg flex items-center justify-center text-xs text-text-muted">
                        {i + 1}
                      </span>
                      {task}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Logs */}
            <div className="flex-1 p-6 overflow-y-auto">
              <h3 className="text-sm font-medium text-text-muted mb-3">Recent Activity</h3>
              <div className="space-y-2">
                {selectedAgentData.recentLogs.map((log, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className="text-text-muted whitespace-nowrap">
                      {formatTime(log.time)}
                    </span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-text-muted">
            Select an agent to view details
          </div>
        )}
      </div>
    </div>
  );
}
