"use client";

import { useState, useEffect, useCallback } from "react";

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  scheduleReadable: string;
  command: string;
  agent: string;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
  status: "idle" | "running" | "success" | "failed";
  logs: string[];
}

const AGENTS = [
  "Claude", "Scout", "Builder", "Solver", "Archie", "Pixel",
  "Sentinel", "Linter", "Scribe", "Quill", "Herald", "Echo"
];

export default function CronPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewJob, setShowNewJob] = useState(false);
  const [newJob, setNewJob] = useState({
    name: "",
    schedule: "0 9 * * *",
    command: "",
    agent: "Claude",
  });
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/cron");
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error("Failed to fetch cron jobs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    // Poll every 5 seconds for status updates
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  async function handleAction(action: string, jobId?: string, job?: typeof newJob) {
    try {
      await fetch("/api/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, jobId, job }),
      });
      fetchJobs();
    } catch (error) {
      console.error("Action failed:", error);
    }
  }

  async function handleCreateJob() {
    if (!newJob.name || !newJob.command) return;
    await handleAction("create", undefined, newJob);
    setNewJob({ name: "", schedule: "0 9 * * *", command: "", agent: "Claude" });
    setShowNewJob(false);
  }

  function formatTime(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "running": return "text-blue-400 bg-blue-500/20";
      case "success": return "text-green-400 bg-green-500/20";
      case "failed": return "text-red-400 bg-red-500/20";
      default: return "text-text-muted bg-white/5";
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">
            <span className="text-accent">Cron Jobs</span>
          </h1>
          <p className="text-text-muted mt-1">
            Scheduled tasks and automated workflows • Auto-refreshing every 5s
          </p>
        </div>
        <button
          onClick={() => setShowNewJob(true)}
          className="px-4 py-2 bg-accent text-bg font-medium rounded-lg hover:bg-accent/90"
        >
          + New Job
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-2xl font-bold">{jobs.length}</div>
          <div className="text-text-muted text-sm">Total Jobs</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">
            {jobs.filter(j => j.enabled).length}
          </div>
          <div className="text-text-muted text-sm">Active</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">
            {jobs.filter(j => j.status === "running").length}
          </div>
          <div className="text-text-muted text-sm">Running</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">
            {jobs.filter(j => !j.enabled).length}
          </div>
          <div className="text-text-muted text-sm">Paused</div>
        </div>
      </div>

      {/* New Job Form */}
      {showNewJob && (
        <div className="bg-surface border border-accent/50 rounded-xl p-6 mb-6">
          <h3 className="font-semibold mb-4">Create New Cron Job</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-muted mb-1">Job Name</label>
              <input
                type="text"
                value={newJob.name}
                onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
                placeholder="Daily backup..."
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">Assigned Agent</label>
              <select
                value={newJob.agent}
                onChange={(e) => setNewJob({ ...newJob, agent: e.target.value })}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              >
                {AGENTS.map(agent => (
                  <option key={agent} value={agent}>{agent}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">Schedule (Cron)</label>
              <input
                type="text"
                value={newJob.schedule}
                onChange={(e) => setNewJob({ ...newJob, schedule: e.target.value })}
                placeholder="0 9 * * *"
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
              />
              <p className="text-xs text-text-muted mt-1">Format: minute hour day month weekday</p>
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">Command/Task</label>
              <input
                type="text"
                value={newJob.command}
                onChange={(e) => setNewJob({ ...newJob, command: e.target.value })}
                placeholder="Generate weekly report..."
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCreateJob}
              className="px-4 py-2 bg-accent text-bg font-medium rounded-lg hover:bg-accent/90"
            >
              Create Job
            </button>
            <button
              onClick={() => setShowNewJob(false)}
              className="px-4 py-2 border border-border rounded-lg hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Jobs List */}
      <div className="space-y-3">
        {jobs.map((job) => (
          <div
            key={job.id}
            className={`bg-surface border rounded-xl overflow-hidden transition-all ${
              job.status === "running" ? "border-blue-500/50" : "border-border"
            }`}
          >
            <div
              className="p-4 cursor-pointer hover:bg-white/5"
              onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      job.enabled ? "bg-green-400" : "bg-gray-500"
                    } ${job.status === "running" ? "animate-pulse" : ""}`}
                  />
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {job.name}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="text-sm text-text-muted">
                      {job.scheduleReadable} • Assigned to <span className="text-accent">{job.agent}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction("run", job.id);
                    }}
                    disabled={job.status === "running"}
                    className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-white/5 disabled:opacity-50"
                  >
                    Run Now
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction("toggle", job.id);
                    }}
                    className={`px-3 py-1.5 text-sm rounded-lg ${
                      job.enabled
                        ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                        : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    }`}
                  >
                    {job.enabled ? "Pause" : "Enable"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this job?")) handleAction("delete", job.id);
                    }}
                    className="px-3 py-1.5 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedJob === job.id && (
              <div className="border-t border-border p-4 bg-bg/50">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <span className="text-text-muted text-sm">Schedule</span>
                    <p className="font-mono text-sm">{job.schedule}</p>
                  </div>
                  <div>
                    <span className="text-text-muted text-sm">Last Run</span>
                    <p className="text-sm">{formatTime(job.lastRun)}</p>
                  </div>
                  <div>
                    <span className="text-text-muted text-sm">Next Run</span>
                    <p className="text-sm">{formatTime(job.nextRun)}</p>
                  </div>
                </div>
                <div className="mb-4">
                  <span className="text-text-muted text-sm">Command</span>
                  <p className="text-sm bg-bg p-2 rounded mt-1">{job.command}</p>
                </div>
                {job.logs.length > 0 && (
                  <div>
                    <span className="text-text-muted text-sm">Recent Logs</span>
                    <div className="mt-1 bg-bg rounded p-2 font-mono text-xs space-y-1">
                      {job.logs.map((log, i) => (
                        <div key={i} className="text-text-muted">{log}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
