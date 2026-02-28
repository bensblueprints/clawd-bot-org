"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ProjectTask {
  id: string;
  agent: string;
  type: string;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  status: "pending" | "in_progress" | "completed" | "failed";
  output?: {
    type: string;
    path?: string;
    content?: string;
  };
}

interface Project {
  id: string;
  name: string;
  description: string;
  goal: string;
  status: "planning" | "in_progress" | "completed" | "paused";
  tasks: ProjectTask[];
  deliverables: string[];
  createdAt: string;
}

const AGENT_COLORS: Record<string, string> = {
  quill: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  builder: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  pixel: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  scout: "bg-green-500/20 text-green-400 border-green-500/30",
  herald: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  archie: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  sentinel: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const AGENT_ICONS: Record<string, string> = {
  quill: "✍️",
  builder: "🔧",
  pixel: "🎨",
  scout: "🔍",
  herald: "📣",
  archie: "🏗️",
  sentinel: "🛡️",
};

export default function OrchestratorPage() {
  const [prompt, setPrompt] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const res = await fetch("/api/orchestrator");
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  }

  async function handlePlan() {
    if (!prompt.trim()) return;

    setIsPlanning(true);
    setExecutionLog([`🎯 Planning: "${prompt}"`]);

    try {
      const res = await fetch("/api/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (data.error) {
        setExecutionLog(prev => [...prev, `❌ Error: ${data.error}`]);
      } else if (data.project) {
        setCurrentProject(data.project);
        setProjects(prev => [...prev, data.project]);
        setExecutionLog(prev => [
          ...prev,
          `✅ Project created: ${data.project.name}`,
          `📋 ${data.project.tasks.length} tasks planned`,
          ...data.project.tasks.map((t: ProjectTask) =>
            `   → [${t.agent.toUpperCase()}] ${t.title}`
          ),
        ]);
      }
    } catch (error) {
      setExecutionLog(prev => [...prev, `❌ Connection error`]);
    } finally {
      setIsPlanning(false);
    }
  }

  async function handleExecuteAll() {
    if (!currentProject) return;

    setIsExecuting(true);
    setExecutionLog(prev => [...prev, `\n🚀 Executing all tasks...`]);

    try {
      const res = await fetch("/api/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute_all",
          projectId: currentProject.id,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setCurrentProject(data.project);
        setExecutionLog(prev => [
          ...prev,
          `✅ Execution complete!`,
          `📁 ${data.deliverables?.length || 0} files generated`,
          ...(data.deliverables || []).map((d: string) => `   → ${d}`),
        ]);

        // Update project in list
        setProjects(prev =>
          prev.map(p => p.id === data.project.id ? data.project : p)
        );
      } else {
        setExecutionLog(prev => [...prev, `❌ Error: ${data.error}`]);
      }
    } catch (error) {
      setExecutionLog(prev => [...prev, `❌ Connection error`]);
    } finally {
      setIsExecuting(false);
    }
  }

  async function handleExecuteTask(taskId: string) {
    if (!currentProject) return;

    setExecutionLog(prev => [...prev, `⚙️ Executing task ${taskId}...`]);

    try {
      const res = await fetch("/api/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute_task",
          projectId: currentProject.id,
          taskId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setCurrentProject(prev => {
          if (!prev) return null;
          return {
            ...prev,
            tasks: prev.tasks.map(t =>
              t.id === taskId ? data.task : t
            ),
            status: data.projectStatus,
          };
        });
        setExecutionLog(prev => [
          ...prev,
          `✅ Task complete: ${data.task.title}`,
          data.task.output?.path ? `   → Saved to: ${data.task.output.path}` : "",
        ]);
      }
    } catch (error) {
      setExecutionLog(prev => [...prev, `❌ Task failed`]);
    }
  }

  const quickPrompts = [
    "Create a lead magnet and landing page for my marketing agency",
    "Write 5 blog posts about AI automation for business",
    "Build a social media campaign for ClawdBot.army hosting",
    "Create a cold email sequence for SaaS founders",
    "Design and code a pricing page for my agency",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Master Orchestrator</h1>
          <p className="text-text-muted mt-1">
            One prompt to plan and execute everything
          </p>
        </div>
        <Link
          href="/deliverables"
          className="px-4 py-2 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-colors"
        >
          View Deliverables →
        </Link>
      </div>

      {/* Main Input */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <label className="block text-sm font-medium mb-2">
          What do you want to create?
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your project in detail. I'll plan the work across all agents and execute it..."
          className="w-full h-32 bg-bg border border-border rounded-lg p-4 resize-none focus:outline-none focus:border-accent"
          disabled={isPlanning || isExecuting}
        />
        <div className="flex items-center justify-between mt-4">
          <div className="flex flex-wrap gap-2">
            {quickPrompts.slice(0, 3).map((qp, i) => (
              <button
                key={i}
                onClick={() => setPrompt(qp)}
                className="text-xs px-3 py-1.5 bg-bg border border-border rounded-full hover:border-accent text-text-muted hover:text-text transition-colors"
              >
                {qp.substring(0, 40)}...
              </button>
            ))}
          </div>
          <button
            onClick={handlePlan}
            disabled={!prompt.trim() || isPlanning || isExecuting}
            className="px-6 py-2.5 bg-accent text-bg rounded-lg font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPlanning ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                Planning...
              </span>
            ) : (
              "🎯 Plan & Preview"
            )}
          </button>
        </div>
      </div>

      {/* Execution Plan */}
      {currentProject && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h2 className="font-semibold">{currentProject.name}</h2>
              <p className="text-sm text-text-muted">{currentProject.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                currentProject.status === "completed"
                  ? "bg-green-500/20 text-green-400"
                  : currentProject.status === "in_progress"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-gray-500/20 text-gray-400"
              }`}>
                {currentProject.status.replace("_", " ")}
              </span>
              <button
                onClick={handleExecuteAll}
                disabled={isExecuting || currentProject.status === "completed"}
                className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isExecuting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Executing...
                  </span>
                ) : (
                  "🚀 Execute All"
                )}
              </button>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-sm font-medium mb-4">Tasks ({currentProject.tasks.length})</h3>
            <div className="space-y-3">
              {currentProject.tasks.map((task, index) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${
                    task.status === "completed"
                      ? "bg-green-500/5 border-green-500/30"
                      : task.status === "in_progress"
                      ? "bg-yellow-500/5 border-yellow-500/30"
                      : task.status === "failed"
                      ? "bg-red-500/5 border-red-500/30"
                      : "bg-bg border-border"
                  }`}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-bg border border-border text-lg">
                    {AGENT_ICONS[task.agent] || "🤖"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{task.title}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${AGENT_COLORS[task.agent]}`}>
                        {task.agent}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        task.priority === "High"
                          ? "bg-red-500/20 text-red-400"
                          : task.priority === "Medium"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-gray-500/20 text-gray-400"
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted truncate mt-1">
                      {task.description}
                    </p>
                    {task.output?.path && (
                      <p className="text-xs text-green-400 mt-1">
                        📁 {task.output.path}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {task.status === "completed" ? (
                      <span className="text-green-400">✓</span>
                    ) : task.status === "in_progress" ? (
                      <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                    ) : task.status === "failed" ? (
                      <span className="text-red-400">✗</span>
                    ) : (
                      <button
                        onClick={() => handleExecuteTask(task.id)}
                        disabled={isExecuting}
                        className="px-3 py-1.5 bg-accent/20 text-accent rounded text-xs hover:bg-accent/30 transition-colors"
                      >
                        Run
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deliverables */}
          {currentProject.deliverables.length > 0 && (
            <div className="px-6 pb-6">
              <h3 className="text-sm font-medium mb-3">Generated Files</h3>
              <div className="grid grid-cols-2 gap-2">
                {currentProject.deliverables.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-3 bg-bg rounded-lg border border-border text-sm"
                  >
                    <span className="text-green-400">📄</span>
                    <span className="truncate">{d.split("/").pop()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Execution Log */}
      {executionLog.length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="text-sm font-medium mb-3">Execution Log</h3>
          <div className="bg-bg rounded-lg p-4 font-mono text-sm max-h-64 overflow-y-auto">
            {executionLog.map((log, i) => (
              <div key={i} className="text-text-muted">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Projects */}
      {projects.length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">Recent Projects</h3>
          <div className="space-y-3">
            {projects.slice(-5).reverse().map(project => (
              <button
                key={project.id}
                onClick={() => setCurrentProject(project)}
                className="w-full flex items-center justify-between p-4 bg-bg rounded-lg border border-border hover:border-accent transition-colors text-left"
              >
                <div>
                  <div className="font-medium">{project.name}</div>
                  <div className="text-sm text-text-muted">
                    {project.tasks.length} tasks • {project.deliverables.length} deliverables
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  project.status === "completed"
                    ? "bg-green-500/20 text-green-400"
                    : project.status === "in_progress"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-gray-500/20 text-gray-400"
                }`}>
                  {project.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
