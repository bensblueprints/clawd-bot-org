"use client";

import { useState, useEffect } from "react";

interface Deliverable {
  name: string;
  path: string;
  type: string;
  size: number;
  createdAt: string;
  content?: string;
}

interface DeliverablesByCategory {
  [key: string]: Deliverable[];
}

const CATEGORY_INFO: Record<string, { icon: string; label: string; color: string }> = {
  "blog-posts": { icon: "📝", label: "Blog Posts", color: "bg-purple-500/20 text-purple-400" },
  "social-media": { icon: "📱", label: "Social Media", color: "bg-blue-500/20 text-blue-400" },
  "ads": { icon: "📢", label: "Advertisements", color: "bg-orange-500/20 text-orange-400" },
  "code": { icon: "💻", label: "Code", color: "bg-green-500/20 text-green-400" },
  "emails": { icon: "✉️", label: "Emails & Outreach", color: "bg-yellow-500/20 text-yellow-400" },
  "landing-pages": { icon: "🌐", label: "Landing Pages", color: "bg-cyan-500/20 text-cyan-400" },
};

export default function DeliverablesPage() {
  const [deliverables, setDeliverables] = useState<DeliverablesByCategory>({});
  const [selectedFile, setSelectedFile] = useState<Deliverable | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    loadDeliverables();
  }, []);

  async function loadDeliverables() {
    try {
      const res = await fetch("/api/deliverables");
      const data = await res.json();
      setDeliverables(data.byCategory || {});

      // Set first category with files as active
      const firstCategory = Object.keys(data.byCategory || {}).find(
        cat => data.byCategory[cat].length > 0
      );
      if (firstCategory) {
        setActiveCategory(firstCategory);
      }
    } catch (error) {
      console.error("Failed to load deliverables:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadFileContent(file: Deliverable) {
    setSelectedFile(file);
    try {
      const res = await fetch(`/api/deliverables?path=${encodeURIComponent(file.path)}`);
      const data = await res.json();
      setFileContent(data.content || "");
    } catch (error) {
      setFileContent("Failed to load file content");
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const totalFiles = Object.values(deliverables).reduce(
    (sum, files) => sum + files.length,
    0
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deliverables</h1>
          <p className="text-text-muted mt-1">
            {totalFiles} files generated across {Object.keys(deliverables).length} categories
          </p>
        </div>
        <button
          onClick={loadDeliverables}
          className="px-4 py-2 bg-surface border border-border rounded-lg hover:border-accent transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Category Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(CATEGORY_INFO).map(([key, info]) => {
          const count = deliverables[key]?.length || 0;
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`p-4 rounded-xl border transition-all ${
                activeCategory === key
                  ? "bg-accent/10 border-accent"
                  : "bg-surface border-border hover:border-accent/50"
              }`}
            >
              <div className="text-2xl mb-2">{info.icon}</div>
              <div className="font-medium text-sm">{info.label}</div>
              <div className="text-2xl font-bold mt-1">{count}</div>
            </button>
          );
        })}
      </div>

      {/* File List & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File List */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">
              {activeCategory && CATEGORY_INFO[activeCategory]
                ? `${CATEGORY_INFO[activeCategory].icon} ${CATEGORY_INFO[activeCategory].label}`
                : "All Files"}
            </h2>
            <span className="text-sm text-text-muted">
              {(activeCategory ? deliverables[activeCategory] : [])?.length || 0} files
            </span>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {activeCategory && deliverables[activeCategory]?.length > 0 ? (
              <div className="divide-y divide-border">
                {deliverables[activeCategory].map((file, i) => (
                  <button
                    key={i}
                    onClick={() => loadFileContent(file)}
                    className={`w-full px-6 py-4 text-left hover:bg-bg/50 transition-colors ${
                      selectedFile?.path === file.path ? "bg-accent/10" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg">
                          {file.type === "md" ? "📄" : file.type === "tsx" ? "⚛️" : "📁"}
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{file.name}</div>
                          <div className="text-xs text-text-muted">
                            {formatFileSize(file.size)} • {formatDate(file.createdAt)}
                          </div>
                        </div>
                      </div>
                      <span className="text-text-muted">→</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-text-muted">
                <div className="text-4xl mb-4">📂</div>
                <div>No files in this category yet</div>
                <div className="text-sm mt-2">
                  Use the Orchestrator to generate content
                </div>
              </div>
            )}
          </div>
        </div>

        {/* File Preview */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">
              {selectedFile ? selectedFile.name : "Preview"}
            </h2>
            {selectedFile && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(fileContent)}
                  className="px-3 py-1.5 text-xs bg-bg border border-border rounded hover:border-accent transition-colors"
                >
                  Copy
                </button>
                <a
                  href={`/api/deliverables/download?path=${encodeURIComponent(selectedFile.path)}`}
                  className="px-3 py-1.5 text-xs bg-accent text-bg rounded hover:bg-accent/90 transition-colors"
                >
                  Download
                </a>
              </div>
            )}
          </div>
          <div className="p-6 max-h-[600px] overflow-y-auto">
            {selectedFile ? (
              <pre className="whitespace-pre-wrap font-mono text-sm text-text-muted">
                {fileContent || "Loading..."}
              </pre>
            ) : (
              <div className="text-center text-text-muted py-12">
                <div className="text-4xl mb-4">👀</div>
                <div>Select a file to preview</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <a
            href="/orchestrator"
            className="px-4 py-2 bg-accent text-bg rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            🎯 Create New Project
          </a>
          <a
            href="/terminal"
            className="px-4 py-2 bg-surface border border-border rounded-lg hover:border-accent transition-colors"
          >
            💻 Open Terminal
          </a>
          <button
            onClick={() => {
              // Export all deliverables
              alert("Export functionality coming soon!");
            }}
            className="px-4 py-2 bg-surface border border-border rounded-lg hover:border-accent transition-colors"
          >
            📦 Export All
          </button>
        </div>
      </div>
    </div>
  );
}
